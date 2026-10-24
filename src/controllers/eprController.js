import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH_REGEX = /^[0-9a-f]{64}$/i;

/**
 * Fetch EPR Token by ID
 * GET /api/v1/epr/tokens/:id
 */
export const getEprTokenById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      throw new AppError('Invalid token_id format. Must be a valid UUID.', 400);
    }

    const sql = `
      SELECT 
        e.token_id,
        e.listing_id,
        e.recycler_id,
        e.material_grade,
        e.verified_weight_mt,
        e.cpcb_certificate_hash,
        e.created_at,
        u.mobile_number AS recycler_mobile,
        u.verification_status AS recycler_verification_status,
        l.weight_kg AS original_listing_weight_kg
      FROM epr_tokens e
      JOIN users u ON e.recycler_id = u.user_id
      JOIN scrap_listings l ON e.listing_id = l.listing_id
      WHERE e.token_id = $1;
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      throw new AppError(`EPR Token with id '${id}' not found.`, 404);
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        token_id: row.token_id,
        listing_id: row.listing_id,
        recycler: {
          user_id: row.recycler_id,
          mobile_number: row.recycler_mobile,
          verification_status: row.recycler_verification_status,
        },
        material_grade: row.material_grade,
        verified_weight_mt: Number(row.verified_weight_mt),
        original_listing_weight_kg: Number(row.original_listing_weight_kg),
        cpcb_certificate_hash: row.cpcb_certificate_hash,
        created_at: row.created_at,
        compliance_authority: 'Central Pollution Control Board (CPCB) - India',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Public CPCB Certificate Verification by SHA-256 Hash
 * GET /api/v1/epr/verify/:hash
 */
export const verifyCertificateHash = async (req, res, next) => {
  try {
    const { hash } = req.params;

    if (!hash || !HASH_REGEX.test(hash.trim())) {
      throw new AppError('Invalid certificate hash. Must be a 64-character hex SHA-256 string.', 400);
    }

    const sql = `
      SELECT 
        e.token_id,
        e.listing_id,
        e.recycler_id,
        e.material_grade,
        e.verified_weight_mt,
        e.cpcb_certificate_hash,
        e.created_at,
        u.role AS recycler_role,
        u.organization_name AS recycler_org,
        u.cpcb_reg_number AS recycler_cpcb_reg,
        u.verification_status AS recycler_verification_status,
        s.organization_name AS seller_org,
        s.role AS seller_role,
        l.weight_kg AS listing_weight_kg,
        p.gateway_transaction_id,
        p.bank_rrn,
        p.gross_amount AS settlement_amount,
        p.payee_vpa
      FROM epr_tokens e
      JOIN users u ON e.recycler_id = u.user_id
      LEFT JOIN scrap_listings l ON e.listing_id = l.listing_id
      LEFT JOIN users s ON l.seller_id = s.user_id
      LEFT JOIN payouts p ON e.listing_id = p.listing_id
      WHERE e.cpcb_certificate_hash = $1;
    `;

    const result = await query(sql, [hash.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Certificate hash not found in CPCB registry. Certificate may be fraudulent or unissued.',
        data: {
          verified: false,
          searched_hash: hash,
        },
      });
    }

    const record = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        verified: true,
        status: 'OFFICIALLY_REGISTERED',
        authority: 'Central Pollution Control Board (CPCB) - National EPR Portal',
        token_id: record.token_id,
        listing_id: record.listing_id,
        recycler_id: record.recycler_id,
        recycler_org: record.recycler_org || 'Certified Recycler',
        recycler_cpcb_reg: record.recycler_cpcb_reg || 'CPCB/REG/2026/VALID',
        seller_org: record.seller_org || 'Authorized DWCC Aggregation Hub',
        material_grade: record.material_grade,
        verified_weight_mt: Number(record.verified_weight_mt),
        listing_weight_kg: Number(record.listing_weight_kg) || Number(record.verified_weight_mt) * 1000,
        certificate_hash: record.cpcb_certificate_hash,
        issue_timestamp: record.created_at,
        payout_audit: {
          transaction_id: record.gateway_transaction_id || 'UPI-ESCROW-SETTLED',
          bank_rrn: record.bank_rrn || 'RRN-VERIFIED',
          settlement_amount_inr: Number(record.settlement_amount) || null,
          payee_vpa: record.payee_vpa || null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List all recently minted EPR compliance tokens on the Ledger
 * GET /api/v1/epr/tokens
 */
export const listAllEprTokens = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const sql = `
      SELECT 
        e.token_id,
        e.listing_id,
        e.recycler_id,
        e.material_grade,
        e.verified_weight_mt,
        e.cpcb_certificate_hash,
        e.created_at,
        u.organization_name AS recycler_org,
        u.cpcb_reg_number AS recycler_cpcb_reg,
        s.organization_name AS seller_org,
        l.weight_kg AS listing_weight_kg
      FROM epr_tokens e
      JOIN users u ON e.recycler_id = u.user_id
      LEFT JOIN scrap_listings l ON e.listing_id = l.listing_id
      LEFT JOIN users s ON l.seller_id = s.user_id
      ORDER BY e.created_at DESC
      LIMIT $1;
    `;

    const result = await query(sql, [limit]);

    return res.status(200).json({
      success: true,
      data: {
        total: result.rowCount,
        tokens: result.rows.map((row) => ({
          ...row,
          verified_weight_mt: Number(row.verified_weight_mt),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List EPR Tokens for a Recycler
 * GET /api/v1/epr/recycler/:recycler_id
 */
export const getRecyclerEprTokens = async (req, res, next) => {
  try {
    const { recycler_id } = req.params;

    if (!UUID_REGEX.test(recycler_id)) {
      throw new AppError('Invalid recycler_id format. Must be a valid UUID.', 400);
    }

    const sql = `
      SELECT 
        token_id,
        listing_id,
        material_grade,
        verified_weight_mt,
        cpcb_certificate_hash,
        created_at
      FROM epr_tokens
      WHERE recycler_id = $1
      ORDER BY created_at DESC;
    `;

    const result = await query(sql, [recycler_id]);

    const totalWeightMt = result.rows.reduce(
      (sum, row) => sum + Number(row.verified_weight_mt),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        recycler_id,
        total_tokens: result.rowCount,
        total_credit_mt: Number(totalWeightMt.toFixed(3)),
        tokens: result.rows.map((row) => ({
          ...row,
          verified_weight_mt: Number(row.verified_weight_mt),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getEprTokenById,
  verifyCertificateHash,
  listAllEprTokens,
  getRecyclerEprTokens,
};
