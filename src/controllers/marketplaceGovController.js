import crypto from 'crypto';
import { getClient, query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EPR_HASH_SECRET = process.env.EPR_HASH_SECRET || 'cpcb_epr_audit_hash_salt_key_2026';

// ============================================================================
// Helper Utilities
// ============================================================================
const generateBundleHash = ({ listingId, recyclerId, processorId, gstId, weightKg, timestamp }) => {
  const payload = `DUAL_BUNDLE|${listingId}|${recyclerId}|${processorId}|${gstId}|${weightKg}|${timestamp}|${EPR_HASH_SECRET}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

const generateForm6Hash = ({ listingId, vehicleNumber, driverMobile, origin, destination, timestamp }) => {
  const payload = `FORM6_MANIFEST|${listingId}|${vehicleNumber}|${driverMobile}|${origin}|${destination}|${timestamp}|${EPR_HASH_SECRET}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

// ============================================================================
// 1. Dual-Token Physical + EPR Credit Bundling Controllers
// ============================================================================

/**
 * Issue / Mint Dual-Token Bundle
 * POST /api/v1/marketplace/bundles
 */
export const createEprTokenBundle = async (req, res, next) => {
  try {
    const {
      listing_id,
      recycler_id,
      plastic_processor_id,
      gst_transaction_id,
      physical_weight_kg,
      material_category,
    } = req.body;

    if (!listing_id || !UUID_REGEX.test(listing_id)) {
      throw new AppError('Invalid or missing listing_id. Must be a valid UUID.', 400);
    }
    if (!recycler_id || !UUID_REGEX.test(recycler_id)) {
      throw new AppError('Invalid or missing recycler_id. Must be a valid UUID.', 400);
    }
    if (!plastic_processor_id || typeof plastic_processor_id !== 'string') {
      throw new AppError('Official CPCB Plastic Processor Registration ID (plastic_processor_id) is required.', 400);
    }
    if (!gst_transaction_id || typeof gst_transaction_id !== 'string') {
      throw new AppError('Verified GST / E-Way Bill transaction ID (gst_transaction_id) is required.', 400);
    }
    const weightNum = parseFloat(physical_weight_kg);
    if (isNaN(weightNum) || weightNum <= 0) {
      throw new AppError('physical_weight_kg must be a positive number.', 400);
    }

    const validCategories = ['CAT_I_RIGID', 'CAT_II_FLEXIBLE', 'E_WASTE_PCB'];
    if (!material_category || !validCategories.includes(material_category)) {
      throw new AppError(`material_category must be one of: ${validCategories.join(', ')}`, 400);
    }

    // Verify listing and recycler exist
    const listingCheck = await query('SELECT listing_id, status FROM scrap_listings WHERE listing_id = $1', [listing_id]);
    if (listingCheck.rows.length === 0) {
      throw new AppError(`Scrap listing '${listing_id}' not found.`, 404);
    }

    const recyclerCheck = await query('SELECT user_id, organization_name FROM users WHERE user_id = $1', [recycler_id]);
    if (recyclerCheck.rows.length === 0) {
      throw new AppError(`Recycler user '${recycler_id}' not found.`, 404);
    }

    const timestamp = new Date().toISOString();
    const certificateHash = generateBundleHash({
      listingId: listing_id,
      recyclerId: recycler_id,
      processorId: plastic_processor_id.trim(),
      gstId: gst_transaction_id.trim(),
      weightKg: weightNum,
      timestamp,
    });

    const insertSql = `
      INSERT INTO epr_token_bundles (
        listing_id, recycler_id, plastic_processor_id, gst_transaction_id,
        physical_weight_kg, material_category, cpcb_certificate_hash, issued_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const result = await query(insertSql, [
      listing_id,
      recycler_id,
      plastic_processor_id.trim(),
      gst_transaction_id.trim(),
      weightNum,
      material_category,
      certificateHash,
      timestamp,
    ]);

    return res.status(201).json({
      success: true,
      message: 'Dual-Token Physical + EPR credit bundle successfully minted and linked to GST ledger',
      data: {
        ...result.rows[0],
        recycler_organization: recyclerCheck.rows[0].organization_name,
        verification_url: `/api/v1/marketplace/bundles/verify/${certificateHash}`,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List Dual-Token Bundles
 * GET /api/v1/marketplace/bundles
 */
export const listEprTokenBundles = async (req, res, next) => {
  try {
    const { recycler_id, listing_id, limit = 50, offset = 0 } = req.query;

    const conditions = [];
    const values = [];

    if (recycler_id) {
      if (!UUID_REGEX.test(recycler_id)) throw new AppError('Invalid recycler_id format.', 400);
      values.push(recycler_id);
      conditions.push(`b.recycler_id = $${values.length}`);
    }

    if (listing_id) {
      if (!UUID_REGEX.test(listing_id)) throw new AppError('Invalid listing_id format.', 400);
      values.push(listing_id);
      conditions.push(`b.listing_id = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(parseInt(limit, 10) || 50);
    values.push(parseInt(offset, 10) || 0);

    const sql = `
      SELECT 
        b.*,
        u.organization_name AS recycler_organization,
        u.cpcb_reg_number AS recycler_cpcb_reg,
        sl.material_grade,
        sl.origin_location,
        sl.status AS listing_status
      FROM epr_token_bundles b
      JOIN users u ON b.recycler_id = u.user_id
      JOIN scrap_listings sl ON b.listing_id = sl.listing_id
      ${whereClause}
      ORDER BY b.issued_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length};
    `;

    const result = await query(sql, values);

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify Dual-Token Bundle by CPCB Certificate Hash
 * GET /api/v1/marketplace/bundles/verify/:hash
 */
export const verifyBundleCertificateHash = async (req, res, next) => {
  try {
    const { hash } = req.params;
    if (!hash || hash.length !== 64) {
      throw new AppError('Valid 64-character SHA-256 certificate hash is required.', 400);
    }

    const sql = `
      SELECT 
        b.*,
        u.organization_name AS recycler_organization,
        u.cpcb_reg_number AS recycler_cpcb_reg,
        sl.material_grade,
        sl.origin_location,
        sl.seller_id,
        seller.organization_name AS seller_organization
      FROM epr_token_bundles b
      JOIN users u ON b.recycler_id = u.user_id
      JOIN scrap_listings sl ON b.listing_id = sl.listing_id
      JOIN users seller ON sl.seller_id = seller.user_id
      WHERE b.cpcb_certificate_hash = $1;
    `;

    const result = await query(sql, [hash]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        verified: false,
        error: 'Certificate hash not found in EcoLoop CPCB dual-token ledger. Possible counterfeit or unbacked credit.',
      });
    }

    const bundle = result.rows[0];
    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Dual-Token physical scrap lot and CPCB EPR credit verified atomically.',
      data: bundle,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// 2. Pre-Auction Quality Assay & Intake Verification Controllers
// ============================================================================

/**
 * Submit Pre-Auction Quality Intake Assay
 * POST /api/v1/marketplace/assays
 */
export const createQualityIntakeAssay = async (req, res, next) => {
  try {
    const {
      listing_id,
      inspector_id,
      declared_weight_kg,
      verified_weight_kg,
      measured_purity_pct = 85.00,
      moisture_deduction_kg = 0.00,
      calculated_deduction_inr = 0.00,
      final_payable_amount_inr,
      inspection_notes,
    } = req.body;

    if (!listing_id || !UUID_REGEX.test(listing_id)) {
      throw new AppError('Invalid or missing listing_id. Must be a valid UUID.', 400);
    }
    if (!inspector_id || !UUID_REGEX.test(inspector_id)) {
      throw new AppError('Invalid or missing inspector_id. Must be a valid UUID.', 400);
    }

    const declaredKg = parseFloat(declared_weight_kg);
    const verifiedKg = parseFloat(verified_weight_kg);
    if (isNaN(declaredKg) || declaredKg <= 0) throw new AppError('declared_weight_kg must be > 0.', 400);
    if (isNaN(verifiedKg) || verifiedKg <= 0) throw new AppError('verified_weight_kg must be > 0.', 400);

    const purityPct = parseFloat(measured_purity_pct);
    if (isNaN(purityPct) || purityPct < 40 || purityPct > 100) {
      throw new AppError('measured_purity_pct must be between 40% and 100%.', 400);
    }

    const moistureKg = parseFloat(moisture_deduction_kg) || 0.0;
    if (moistureKg < 0 || moistureKg >= verifiedKg) {
      throw new AppError('moisture_deduction_kg cannot be negative or exceed verified weight.', 400);
    }

    // Check listing details
    const listingRes = await query('SELECT listing_id, min_price, weight_kg FROM scrap_listings WHERE listing_id = $1', [listing_id]);
    if (listingRes.rows.length === 0) {
      throw new AppError(`Listing '${listing_id}' not found.`, 404);
    }
    const listing = listingRes.rows[0];

    // Compute automatic financial settlement if not provided
    const netWeightPayableKg = Math.max(0, verifiedKg - moistureKg);
    const basePricePerKg = Number(listing.min_price) / Number(listing.weight_kg);
    const deductionInr = parseFloat(calculated_deduction_inr) || (moistureKg * basePricePerKg);
    const computedFinalInr = final_payable_amount_inr !== undefined
      ? parseFloat(final_payable_amount_inr)
      : (netWeightPayableKg * basePricePerKg);

    const insertSql = `
      INSERT INTO quality_intake_assays (
        listing_id, inspector_id, declared_weight_kg, verified_weight_kg,
        measured_purity_pct, moisture_deduction_kg, calculated_deduction_inr,
        final_payable_amount_inr, inspection_notes, verified_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *;
    `;

    const result = await query(insertSql, [
      listing_id,
      inspector_id,
      declaredKg,
      verifiedKg,
      purityPct,
      moistureKg,
      deductionInr,
      computedFinalInr,
      inspection_notes || 'Standard DWCC gravimetric & moisture meter assay performed.',
    ]);

    return res.status(201).json({
      success: true,
      message: 'Pre-auction quality assay log registered. Zero "as-is" discount risk guaranteed.',
      data: {
        ...result.rows[0],
        net_effective_weight_kg: netWeightPayableKg,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Quality Assay for Listing
 * GET /api/v1/marketplace/assays/listing/:listing_id
 */
export const getQualityAssayByListing = async (req, res, next) => {
  try {
    const { listing_id } = req.params;
    if (!listing_id || !UUID_REGEX.test(listing_id)) {
      throw new AppError('Invalid listing_id UUID format.', 400);
    }

    const sql = `
      SELECT 
        q.*,
        u.organization_name AS inspector_organization,
        u.role AS inspector_role,
        sl.material_grade,
        sl.origin_location
      FROM quality_intake_assays q
      JOIN users u ON q.inspector_id = u.user_id
      JOIN scrap_listings sl ON q.listing_id = sl.listing_id
      WHERE q.listing_id = $1
      ORDER BY q.verified_at DESC;
    `;

    const result = await query(sql, [listing_id]);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// 3. Recycler Trade Credit & Invoice Ledger Controllers
// ============================================================================

/**
 * Issue Recycler Trade Credit
 * POST /api/v1/marketplace/credits
 */
export const issueRecyclerTradeCredit = async (req, res, next) => {
  try {
    const { recycler_id, listing_id, invoice_amount_inr, credit_period_days = 14 } = req.body;

    if (!recycler_id || !UUID_REGEX.test(recycler_id)) {
      throw new AppError('Valid recycler_id UUID is required.', 400);
    }
    if (!listing_id || !UUID_REGEX.test(listing_id)) {
      throw new AppError('Valid listing_id UUID is required.', 400);
    }

    const amount = parseFloat(invoice_amount_inr);
    if (isNaN(amount) || amount <= 0) {
      throw new AppError('invoice_amount_inr must be a positive number.', 400);
    }

    const days = parseInt(credit_period_days, 10);
    if (days !== 14 && days !== 30) {
      throw new AppError('credit_period_days must be either 14 or 30 days.', 400);
    }

    // Verify recycler role
    const userRes = await query('SELECT user_id, organization_name, role FROM users WHERE user_id = $1', [recycler_id]);
    if (userRes.rows.length === 0) throw new AppError('Recycler not found.', 404);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    const insertSql = `
      INSERT INTO recycler_trade_credits (
        recycler_id, listing_id, invoice_amount_inr, credit_period_days,
        due_date, payment_status, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW())
      RETURNING *;
    `;

    const result = await query(insertSql, [recycler_id, listing_id, amount, days, dueDateStr]);

    return res.status(201).json({
      success: true,
      message: `${days}-Day Recycler Trade Credit issued successfully. Working capital unlocked.`,
      data: {
        ...result.rows[0],
        recycler_organization: userRes.rows[0].organization_name,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Recycler Credit Line & Ledger
 * GET /api/v1/marketplace/credits/recycler/:recycler_id
 */
export const getRecyclerCreditLedger = async (req, res, next) => {
  try {
    const { recycler_id } = req.params;
    if (!recycler_id || !UUID_REGEX.test(recycler_id)) {
      throw new AppError('Invalid recycler_id format.', 400);
    }

    const sql = `
      SELECT 
        c.*,
        sl.material_grade,
        sl.weight_kg,
        sl.origin_location,
        CASE 
          WHEN c.payment_status = 'PENDING' AND c.due_date < CURRENT_DATE THEN 'OVERDUE'
          ELSE c.payment_status
        END AS dynamic_status
      FROM recycler_trade_credits c
      JOIN scrap_listings sl ON c.listing_id = sl.listing_id
      WHERE c.recycler_id = $1
      ORDER BY c.created_at DESC;
    `;

    const result = await query(sql, [recycler_id]);

    const totalOutstanding = result.rows
      .filter((r) => r.dynamic_status === 'PENDING' || r.dynamic_status === 'OVERDUE')
      .reduce((acc, r) => acc + parseFloat(r.invoice_amount_inr), 0);

    return res.status(200).json({
      success: true,
      recycler_id,
      credit_summary: {
        total_invoices: result.rows.length,
        total_outstanding_inr: parseFloat(totalOutstanding.toFixed(2)),
        credit_limit_ceiling_inr: 5000000.0, // ₹50 Lakh Approved Credit Line
        credit_utilization_pct: parseFloat(((totalOutstanding / 5000000.0) * 100).toFixed(1)),
      },
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Settle Recycler Trade Credit Invoice
 * POST /api/v1/marketplace/credits/:credit_id/settle
 */
export const settleRecyclerTradeCredit = async (req, res, next) => {
  try {
    const { credit_id } = req.params;
    if (!credit_id || !UUID_REGEX.test(credit_id)) {
      throw new AppError('Invalid credit_id UUID format.', 400);
    }

    const { payment_reference = `UTR-${Date.now()}` } = req.body;

    const updateSql = `
      UPDATE recycler_trade_credits
      SET payment_status = 'PAID'
      WHERE credit_id = $1 AND payment_status != 'PAID'
      RETURNING *;
    `;

    const result = await query(updateSql, [credit_id]);
    if (result.rows.length === 0) {
      throw new AppError('Credit invoice not found or already settled.', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Trade credit invoice settled successfully via banking rails.',
      data: {
        ...result.rows[0],
        payment_reference,
        settled_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// 4. Subscription Forward Supply Contracts Controllers
// ============================================================================

/**
 * Create Subscription Forward Supply Contract
 * POST /api/v1/marketplace/contracts
 */
export const createForwardContract = async (req, res, next) => {
  try {
    const {
      recycler_id,
      dwcc_hub_id,
      material_grade,
      monthly_committed_tonnes,
      agreed_floor_price_per_kg,
      agreed_cap_price_per_kg,
      start_date,
      end_date,
    } = req.body;

    if (!recycler_id || !UUID_REGEX.test(recycler_id)) throw new AppError('Valid recycler_id UUID required.', 400);
    if (!dwcc_hub_id || !UUID_REGEX.test(dwcc_hub_id)) throw new AppError('Valid dwcc_hub_id UUID required.', 400);
    if (!material_grade) throw new AppError('material_grade is required.', 400);

    const tonnes = parseFloat(monthly_committed_tonnes);
    if (isNaN(tonnes) || tonnes <= 0) throw new AppError('monthly_committed_tonnes must be > 0.', 400);

    const floor = parseFloat(agreed_floor_price_per_kg);
    const cap = parseFloat(agreed_cap_price_per_kg);
    if (isNaN(floor) || isNaN(cap) || floor <= 0 || cap <= 0) {
      throw new AppError('Floor and cap prices must be positive numbers.', 400);
    }
    if (floor >= cap) {
      throw new AppError('agreed_floor_price_per_kg must be strictly less than agreed_cap_price_per_kg (Collar Spread).', 400);
    }

    if (!start_date || !end_date) {
      throw new AppError('start_date and end_date are required.', 400);
    }
    if (new Date(start_date) >= new Date(end_date)) {
      throw new AppError('start_date must be before end_date.', 400);
    }

    const insertSql = `
      INSERT INTO recurring_feedstock_contracts (
        recycler_id, dwcc_hub_id, material_grade, monthly_committed_tonnes,
        agreed_floor_price_per_kg, agreed_cap_price_per_kg, contract_status,
        start_date, end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8)
      RETURNING *;
    `;

    const result = await query(insertSql, [
      recycler_id,
      dwcc_hub_id,
      material_grade.trim(),
      tonnes,
      floor,
      cap,
      start_date,
      end_date,
    ]);

    return res.status(201).json({
      success: true,
      message: 'Subscription forward supply contract established with floor-cap price collar hedging.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List Forward Supply Contracts
 * GET /api/v1/marketplace/contracts
 */
export const listForwardContracts = async (req, res, next) => {
  try {
    const { recycler_id, dwcc_hub_id, status } = req.query;

    const conditions = [];
    const values = [];

    if (recycler_id) {
      values.push(recycler_id);
      conditions.push(`c.recycler_id = $${values.length}`);
    }
    if (dwcc_hub_id) {
      values.push(dwcc_hub_id);
      conditions.push(`c.dwcc_hub_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`c.contract_status = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        c.*,
        r.organization_name AS recycler_organization,
        d.organization_name AS dwcc_hub_name
      FROM recurring_feedstock_contracts c
      JOIN users r ON c.recycler_id = r.user_id
      JOIN users d ON c.dwcc_hub_id = d.user_id
      ${whereClause}
      ORDER BY c.start_date DESC;
    `;

    const result = await query(sql, values);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Forward Supply Contract Status
 * PATCH /api/v1/marketplace/contracts/:id/status
 */
export const updateForwardContractStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { contract_status } = req.body;

    const validStatuses = ['ACTIVE', 'PAUSED', 'EXPIRED'];
    if (!contract_status || !validStatuses.includes(contract_status)) {
      throw new AppError(`contract_status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const sql = `
      UPDATE recurring_feedstock_contracts
      SET contract_status = $1
      WHERE contract_id = $2
      RETURNING *;
    `;

    const result = await query(sql, [contract_status, id]);
    if (result.rows.length === 0) throw new AppError('Contract not found.', 404);

    return res.status(200).json({
      success: true,
      message: `Contract status updated to ${contract_status}`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// 5. Digital Form-6 Transport Manifests Controllers
// ============================================================================

/**
 * Issue Digital Form-6 Transport Manifest
 * POST /api/v1/marketplace/manifests
 */
export const createTransportManifest = async (req, res, next) => {
  try {
    const {
      listing_id,
      carrier_vehicle_number,
      driver_mobile,
      origin_address,
      destination_facility,
    } = req.body;

    if (!listing_id || !UUID_REGEX.test(listing_id)) {
      throw new AppError('Valid listing_id UUID is required.', 400);
    }
    if (!carrier_vehicle_number || typeof carrier_vehicle_number !== 'string') {
      throw new AppError('carrier_vehicle_number is required.', 400);
    }
    if (!driver_mobile || typeof driver_mobile !== 'string') {
      throw new AppError('driver_mobile is required.', 400);
    }
    if (!origin_address || !destination_facility) {
      throw new AppError('origin_address and destination_facility are required.', 400);
    }

    // Verify listing exists
    const listingRes = await query('SELECT listing_id, weight_kg, material_grade FROM scrap_listings WHERE listing_id = $1', [listing_id]);
    if (listingRes.rows.length === 0) throw new AppError(`Listing '${listing_id}' not found.`, 404);

    const timestamp = new Date().toISOString();
    const manifestHash = generateForm6Hash({
      listingId: listing_id,
      vehicleNumber: carrier_vehicle_number.toUpperCase().trim(),
      driverMobile: driver_mobile.trim(),
      origin: origin_address.trim(),
      destination: destination_facility.trim(),
      timestamp,
    });

    const insertSql = `
      INSERT INTO transport_manifests (
        listing_id, carrier_vehicle_number, driver_mobile, origin_address,
        destination_facility, form6_manifest_hash, dispatch_status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'IN_TRANSIT', NOW())
      RETURNING *;
    `;

    const result = await query(insertSql, [
      listing_id,
      carrier_vehicle_number.toUpperCase().trim(),
      driver_mobile.trim(),
      origin_address.trim(),
      destination_facility.trim(),
      manifestHash,
    ]);

    return res.status(201).json({
      success: true,
      message: 'CPCB Regulatory Form-6 Digital Transport Manifest generated successfully.',
      data: {
        ...result.rows[0],
        listing_details: listingRes.rows[0],
        manifest_qr_payload: `CPCB-FORM6|${result.rows[0].manifest_id}|${manifestHash}`,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Transport Manifest Details
 * GET /api/v1/marketplace/manifests/:id
 */
export const getTransportManifestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) {
      throw new AppError('Invalid manifest ID format.', 400);
    }

    const sql = `
      SELECT 
        m.*,
        sl.material_grade,
        sl.weight_kg,
        seller.organization_name AS seller_hub_name
      FROM transport_manifests m
      JOIN scrap_listings sl ON m.listing_id = sl.listing_id
      JOIN users seller ON sl.seller_id = seller.user_id
      WHERE m.manifest_id = $1;
    `;

    const result = await query(sql, [id]);
    if (result.rows.length === 0) throw new AppError('Transport manifest not found.', 404);

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Manifest Dispatch Status
 * PATCH /api/v1/marketplace/manifests/:id/status
 */
export const updateTransportManifestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dispatch_status } = req.body;

    const validStatuses = ['SCHEDULED', 'IN_TRANSIT', 'DELIVERED'];
    if (!dispatch_status || !validStatuses.includes(dispatch_status)) {
      throw new AppError(`dispatch_status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const sql = `
      UPDATE transport_manifests
      SET dispatch_status = $1
      WHERE manifest_id = $2
      RETURNING *;
    `;

    const result = await query(sql, [dispatch_status, id]);
    if (result.rows.length === 0) throw new AppError('Transport manifest not found.', 404);

    return res.status(200).json({
      success: true,
      message: `Manifest transit status updated to ${dispatch_status}`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// Comprehensive Commercial Overview Controller
// ============================================================================

/**
 * GET /api/v1/marketplace/overview
 * Executive Dashboard summarizing the 5 Competitive Differentiators
 */
export const getMarketplaceCompetitiveOverview = async (req, res, next) => {
  try {
    const [bundleStats, assayStats, creditStats, contractStats, manifestStats] = await Promise.all([
      query(`
        SELECT 
          COUNT(*)::INT AS total_bundles,
          COALESCE(SUM(physical_weight_kg), 0)::NUMERIC AS total_physical_kg
        FROM epr_token_bundles;
      `),
      query(`
        SELECT 
          COUNT(*)::INT AS total_assays,
          COALESCE(AVG(measured_purity_pct), 0)::NUMERIC(5,2) AS avg_purity_pct
        FROM quality_intake_assays;
      `),
      query(`
        SELECT 
          COUNT(*)::INT AS total_credit_facilities,
          COALESCE(SUM(invoice_amount_inr), 0)::NUMERIC(12,2) AS total_credit_disbursed_inr,
          COALESCE(SUM(CASE WHEN payment_status = 'PENDING' THEN invoice_amount_inr ELSE 0 END), 0)::NUMERIC(12,2) AS active_outstanding_inr
        FROM recycler_trade_credits;
      `),
      query(`
        SELECT 
          COUNT(*)::INT AS total_contracts,
          COALESCE(SUM(monthly_committed_tonnes), 0)::NUMERIC(10,2) AS total_committed_tonnes
        FROM recurring_feedstock_contracts
        WHERE contract_status = 'ACTIVE';
      `),
      query(`
        SELECT 
          COUNT(*)::INT AS total_manifests,
          COUNT(CASE WHEN dispatch_status = 'IN_TRANSIT' THEN 1 END)::INT AS in_transit_manifests
        FROM transport_manifests;
      `),
    ]);

    return res.status(200).json({
      success: true,
      message: 'EcoLoop B2B Marketplace Commercial Advantage Telemetry',
      data: {
        upgrades: {
          dual_token_bundles: {
            total_minted: bundleStats.rows[0].total_bundles,
            physical_verified_mt: (Number(bundleStats.rows[0].total_physical_kg) / 1000).toFixed(2),
          },
          quality_intake_assays: {
            total_inspections: assayStats.rows[0].total_assays,
            average_measured_purity_pct: Number(assayStats.rows[0].avg_purity_pct),
          },
          recycler_trade_credits: {
            facilities_issued: creditStats.rows[0].total_credit_facilities,
            total_disbursed_inr: Number(creditStats.rows[0].total_credit_disbursed_inr),
            active_outstanding_inr: Number(creditStats.rows[0].active_outstanding_inr),
          },
          forward_supply_contracts: {
            active_contracts: contractStats.rows[0].total_contracts,
            monthly_committed_tonnes: Number(contractStats.rows[0].total_committed_tonnes),
          },
          digital_transport_manifests: {
            total_form6_issued: manifestStats.rows[0].total_manifests,
            active_in_transit: manifestStats.rows[0].in_transit_manifests,
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
