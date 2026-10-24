import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { round2 } from '../services/twiml.js';

/**
 * Tier 2 Municipal Controller — offline rag pickers WITHOUT a phone.
 *
 * These pickers keep their normal daily collection routes, but instead of
 * selling to informal middlemen (kabadiwala intermediaries who pay 30-45%
 * below market), they sell DIRECTLY at municipal collection counters:
 *
 *   1. A ULB/DWCC operator registers the picker and issues a physical QR card
 *      (card_code) — no phone or literacy required.
 *   2. At the counter, the operator scans/types the card code, weighs the
 *      material, and the system pays the OFFICIAL rate-card price instantly
 *      (cash at counter, or UPI to a shared family VPA).
 *   3. Every sale snapshots the official and middleman rates, so the ledger
 *      proves exactly how much extra income the picker earned.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Unambiguous alphabet for card codes (no 0/O/1/I/L) so codes can be read
// aloud or handwritten at a counter without confusion
const CARD_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const randomCardCode = () =>
  `ECO-${Array.from(crypto.randomBytes(6))
    .map((b) => CARD_ALPHABET[b % CARD_ALPHABET.length])
    .join('')}`;

// Synthetic non-dialable mobile identifiers for phone-less pickers
// (users.mobile_number is NOT NULL UNIQUE; OFF-xxxx is clearly not a phone)
const randomOfflineMobile = () =>
  `OFF-${String(crypto.randomInt(1e10, 1e11 - 1))}`;

/** Official rate for a material grade, or 404-style AppError when absent. */
const getRateFor = async (materialGrade) => {
  const result = await query(
    'SELECT material_grade, rate_per_kg, middleman_rate_per_kg FROM material_rates WHERE material_grade = $1;',
    [materialGrade]
  );
  if (result.rows.length === 0) {
    throw new AppError(
      `No official rate published for material_grade '${materialGrade}'. Ask the ULB to publish it in the rate card.`,
      404
    );
  }
  const row = result.rows[0];
  return {
    material_grade: row.material_grade,
    rate_per_kg: Number(row.rate_per_kg),
    middleman_rate_per_kg: Number(row.middleman_rate_per_kg),
  };
};

/** Simulated instant payment execution (mirrors the marketplace payout rail). */
const executeCounterPayment = (mode, payeeVpa, amount) => {
  if (mode === 'CASH') {
    return { payment_status: 'CASH_DISPENSED', gateway_transaction_id: null, payee: 'counter cash' };
  }
  return {
    payment_status: 'SUCCESS',
    gateway_transaction_id: `UPI-TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    payee: payeeVpa || null,
  };
};

/**
 * POST /api/v1/municipal/centers
 * Register a municipal direct-sale collection counter (ULB only).
 */
export const createCenter = async (req, res, next) => {
  try {
    const { center_name, ward, address, latitude, longitude, managed_by } = req.body;

    if (!center_name || typeof center_name !== 'string' || center_name.trim().length < 3) {
      throw new AppError('center_name is required (at least 3 characters).', 400);
    }
    const lat = latitude === undefined || latitude === null || latitude === '' ? null : Number(latitude);
    const lng = longitude === undefined || longitude === null || longitude === '' ? null : Number(longitude);
    if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      throw new AppError('latitude must be a number between -90 and 90.', 400);
    }
    if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      throw new AppError('longitude must be a number between -180 and 180.', 400);
    }

    const result = await query(
      `INSERT INTO municipal_centers (center_name, ward, address, latitude, longitude, managed_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING center_id, center_name, ward, address, latitude, longitude, is_active, created_at;`,
      [
        center_name.trim(),
        ward ? String(ward).trim() : null,
        address ? String(address).trim() : null,
        lat,
        lng,
        managed_by && UUID_REGEX.test(managed_by) ? managed_by : req.user.user_id,
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/municipal/centers
 * Public list of direct-sale counters (pickers/SHGs use this to find one).
 */
export const listCenters = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.center_id, c.center_name, c.ward, c.address, c.latitude, c.longitude, c.is_active,
              u.organization_name AS managed_by_name
       FROM municipal_centers c
       LEFT JOIN users u ON c.managed_by = u.user_id
       ORDER BY c.is_active DESC, c.center_name;`
    );
    return res.status(200).json({
      success: true,
      data: { total: result.rows.length, centers: result.rows },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/municipal/rates
 * Public official rate card, including the middleman counterfactual and uplift %.
 */
export const getRateCard = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT material_grade, rate_per_kg, middleman_rate_per_kg, updated_at FROM material_rates ORDER BY rate_per_kg DESC;'
    );
    const rates = result.rows.map((r) => {
      const rate = Number(r.rate_per_kg);
      const middleman = Number(r.middleman_rate_per_kg);
      return {
        material_grade: r.material_grade,
        rate_per_kg: rate,
        middleman_rate_per_kg: middleman,
        uplift_per_kg: round2(rate - middleman),
        uplift_pct: round2(((rate - middleman) / middleman) * 100),
        updated_at: r.updated_at,
      };
    });
    return res.status(200).json({ success: true, data: { total: rates.length, rates } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/municipal/pickers/offline   [ULB / DWCC]
 * Register a phone-less picker and issue their physical QR card code.
 */
export const registerOfflinePicker = async (req, res, next) => {
  try {
    const { display_name, home_ward, route_notes, upi_vpa, language_pref = 'hi' } = req.body;

    if (!display_name || typeof display_name !== 'string' || display_name.trim().length < 2) {
      throw new AppError('display_name is required for an offline picker card.', 400);
    }
    if (!['en', 'hi'].includes(language_pref)) {
      throw new AppError("language_pref must be 'en' or 'hi'.", 400);
    }

    // Unique synthetic identifier + unique card code (retry on astronomically
    // unlikely collisions)
    let mobileNumber;
    let cardCode;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const candidateMobile = randomOfflineMobile();
      const candidateCard = randomCardCode();
      const clash = await query(
        `SELECT
           EXISTS(SELECT 1 FROM users WHERE mobile_number = $1) AS mobile_taken,
           EXISTS(SELECT 1 FROM picker_profiles WHERE card_code = $2) AS card_taken;`,
        [candidateMobile, candidateCard]
      );
      if (clash.rows[0].mobile_taken || clash.rows[0].card_taken) continue;
      mobileNumber = candidateMobile;
      cardCode = candidateCard;
      break;
    }
    if (!mobileNumber || !cardCode) {
      throw new AppError('Could not allocate a unique card code. Please retry.', 500);
    }

    const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

    const userResult = await query(
      `INSERT INTO users (role, mobile_number, password_hash, upi_vpa, verification_status)
       VALUES ('Picker', $1, $2, $3, 'VERIFIED')
       RETURNING user_id, upi_vpa;`,
      [mobileNumber, passwordHash, upi_vpa ? String(upi_vpa).trim() : null]
    );
    const user = userResult.rows[0];

    const profileResult = await query(
      `INSERT INTO picker_profiles (user_id, tier, language_pref, card_code, display_name, home_ward, route_notes, registered_by)
       VALUES ($1, 'OFFLINE', $2, $3, $4, $5, $6, $7)
       RETURNING profile_id, user_id, tier, language_pref, card_code, display_name, home_ward, route_notes, registered_at;`,
      [
        user.user_id,
        language_pref,
        cardCode,
        display_name.trim(),
        home_ward ? String(home_ward).trim() : null,
        route_notes ? String(route_notes).trim() : null,
        req.user.user_id,
      ]
    );

    return res.status(201).json({
      success: true,
      data: {
        ...profileResult.rows[0],
        upi_vpa: user.upi_vpa,
        // Payload to print on the physical card QR sticker
        qr_payload: `ECOLOOP:CARD:${cardCode}`,
        instructions:
          'Print the QR code on the picker card. At the counter, scan it or type the card code to record a direct sale.',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/municipal/pickers/offline   [ULB / DWCC]
 * Offline picker registry with lifetime direct-sale totals.
 */
export const listOfflinePickers = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.profile_id, p.user_id, p.card_code, p.display_name, p.home_ward, p.route_notes,
              p.registered_at, u.upi_vpa,
              COALESCE(s.total_kg, 0) AS lifetime_kg,
              COALESCE(s.total_paid, 0) AS lifetime_paid,
              COALESCE(s.total_uplift, 0) AS lifetime_middleman_uplift
       FROM picker_profiles p
       JOIN users u ON p.user_id = u.user_id
       LEFT JOIN (
         SELECT picker_user_id,
                SUM(weight_kg) AS total_kg,
                SUM(gross_amount) AS total_paid,
                SUM(middleman_uplift) AS total_uplift
         FROM direct_sales
         WHERE payment_status IN ('SUCCESS', 'CASH_DISPENSED')
         GROUP BY picker_user_id
       ) s ON s.picker_user_id = p.user_id
       WHERE p.tier = 'OFFLINE'
       ORDER BY p.registered_at DESC;`
    );
    return res.status(200).json({
      success: true,
      data: {
        total: result.rows.length,
        pickers: result.rows.map((r) => ({
          ...r,
          lifetime_kg: Number(r.lifetime_kg),
          lifetime_paid: Number(r.lifetime_paid),
          lifetime_middleman_uplift: Number(r.lifetime_middleman_uplift),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/municipal/centers/:centerId/sales   [ULB / DWCC]
 * Record a walk-in direct sale: card code + material + weight -> instant
 * official-rate payment, with the middleman-cut-avoided uplift proven.
 */
export const recordDirectSale = async (req, res, next) => {
  try {
    const { centerId } = req.params;
    if (!UUID_REGEX.test(centerId)) {
      throw new AppError('Invalid center_id format. Must be a valid UUID.', 400);
    }

    const { card_code, material_grade, weight_kg, payment_mode = 'CASH' } = req.body;

    if (!card_code || typeof card_code !== 'string' || card_code.trim().length < 4) {
      throw new AppError('card_code is required (scan the picker card or type the code).', 400);
    }
    if (!material_grade || typeof material_grade !== 'string') {
      throw new AppError('material_grade is required.', 400);
    }
    if (!['UPI', 'CASH'].includes(payment_mode)) {
      throw new AppError("payment_mode must be 'UPI' or 'CASH'.", 400);
    }
    const weight = Number(weight_kg);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 5000) {
      throw new AppError('weight_kg must be a positive number (max 5000 kg per counter sale).', 400);
    }

    // Center must exist and be active
    const centerResult = await query(
      'SELECT center_id, center_name, is_active FROM municipal_centers WHERE center_id = $1;',
      [centerId]
    );
    if (centerResult.rows.length === 0) {
      throw new AppError(`Municipal center '${centerId}' not found.`, 404);
    }
    if (!centerResult.rows[0].is_active) {
      throw new AppError('This municipal center is currently inactive.', 409);
    }

    // Resolve the picker from their physical card code
    const pickerResult = await query(
      `SELECT p.user_id, p.display_name, p.tier, u.upi_vpa
       FROM picker_profiles p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.card_code = $1;`,
      [card_code.trim().toUpperCase()]
    );
    if (pickerResult.rows.length === 0) {
      throw new AppError(
        `No picker card matches code '${card_code}'. Register the picker first.`,
        404
      );
    }
    const picker = pickerResult.rows[0];

    const rate = await getRateFor(material_grade.trim());
    const grossAmount = round2(weight * rate.rate_per_kg);
    const middlemanWouldHavePaid = round2(weight * rate.middleman_rate_per_kg);
    const uplift = round2(grossAmount - middlemanWouldHavePaid);

    const payment = executeCounterPayment(payment_mode, picker.upi_vpa, grossAmount);

    const saleResult = await query(
      `INSERT INTO direct_sales
         (center_id, picker_user_id, material_grade, weight_kg, rate_per_kg,
          middleman_rate_per_kg, gross_amount, middleman_uplift, payment_mode,
          payment_status, gateway_transaction_id, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING sale_id, center_id, picker_user_id, material_grade, weight_kg,
                 rate_per_kg, middleman_rate_per_kg, gross_amount, middleman_uplift,
                 payment_mode, payment_status, gateway_transaction_id, created_at;`,
      [
        centerId,
        picker.user_id,
        rate.material_grade,
        weight.toFixed(2),
        rate.rate_per_kg.toFixed(2),
        rate.middleman_rate_per_kg.toFixed(2),
        grossAmount.toFixed(2),
        uplift.toFixed(2),
        payment_mode,
        payment.payment_status,
        payment.gateway_transaction_id,
        req.user.user_id,
      ]
    );

    return res.status(201).json({
      success: true,
      data: {
        sale: saleResult.rows[0],
        picker: { user_id: picker.user_id, display_name: picker.display_name, tier: picker.tier },
        center: { center_id: centerResult.rows[0].center_id, center_name: centerResult.rows[0].center_name },
        uplift_summary: {
          official_paid: grossAmount,
          middleman_would_have_paid: middlemanWouldHavePaid,
          extra_earned_by_picker: uplift,
          uplift_pct: round2((uplift / middlemanWouldHavePaid) * 100),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/municipal/centers/:centerId/sales   [ULB / DWCC]
 * Direct-sale ledger for a counter, with anti-middleman impact aggregates.
 */
export const listCenterSales = async (req, res, next) => {
  try {
    const { centerId } = req.params;
    if (!UUID_REGEX.test(centerId)) {
      throw new AppError('Invalid center_id format. Must be a valid UUID.', 400);
    }

    const salesResult = await query(
      `SELECT s.sale_id, s.material_grade, s.weight_kg, s.rate_per_kg, s.middleman_rate_per_kg,
              s.gross_amount, s.middleman_uplift, s.payment_mode, s.payment_status,
              s.gateway_transaction_id, s.created_at,
              p.display_name AS picker_name, p.card_code AS picker_card_code
       FROM direct_sales s
       JOIN picker_profiles p ON s.picker_user_id = p.user_id
       WHERE s.center_id = $1
       ORDER BY s.created_at DESC
       LIMIT 200;`,
      [centerId]
    );

    const totalsResult = await query(
      `SELECT COUNT(*) AS sale_count,
              COALESCE(SUM(weight_kg), 0) AS total_kg,
              COALESCE(SUM(gross_amount), 0) AS total_paid,
              COALESCE(SUM(middleman_uplift), 0) AS total_uplift
       FROM direct_sales
       WHERE center_id = $1 AND payment_status IN ('SUCCESS', 'CASH_DISPENSED');`,
      [centerId]
    );

    const totals = totalsResult.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        center_id: centerId,
        sales: salesResult.rows.map((s) => ({
          ...s,
          weight_kg: Number(s.weight_kg),
          rate_per_kg: Number(s.rate_per_kg),
          middleman_rate_per_kg: Number(s.middleman_rate_per_kg),
          gross_amount: Number(s.gross_amount),
          middleman_uplift: Number(s.middleman_uplift),
        })),
        impact: {
          sale_count: Number(totals.sale_count),
          total_kg: Number(totals.total_kg),
          total_paid_inr: Number(totals.total_paid),
          total_middleman_cut_avoided_inr: Number(totals.total_uplift),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  createCenter,
  listCenters,
  getRateCard,
  registerOfflinePicker,
  listOfflinePickers,
  recordDirectSale,
  listCenterSales,
};
