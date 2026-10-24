import crypto from 'crypto';
import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH_REGEX = /^[0-9a-f]{64}$/i;

/**
 * Recompute the CPCB certificate hash from the underlying listing data so
 * verification actually detects tampering rather than confirming existence.
 * Mirrors generateCpcbHash in auctionController.
 */
const recomputeCertificateHash = ({ listingId, recyclerId, materialGrade, weightKg, timestamp }) => {
  const secret = process.env.EPR_HASH_SECRET;
  if (!secret) {
    throw new AppError('EPR_HASH_SECRET is not configured; cannot verify CPCB certificate hashes.', 500);
  }
  const weightMt = (Number(weightKg) / 1000).toFixed(3);
  const payload = `${listingId}|${recyclerId}|${materialGrade}|${weightMt}|${new Date(timestamp).toISOString()}|${secret}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

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
 * The certificate hash is recomputed from the underlying listing data and
 * compared against the stored hash, so tampered listings or tokens are
 * reported as fraudulent even when the row itself still exists.
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
        u.verification_status AS recycler_verification_status,
        l.material_grade AS listing_material_grade,
        l.weight_kg AS listing_weight_kg
      FROM epr_tokens e
      JOIN users u ON e.recycler_id = u.user_id
      JOIN scrap_listings l ON e.listing_id = l.listing_id
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

    const expectedHash = recomputeCertificateHash({
      listingId: record.listing_id,
      recyclerId: record.recycler_id,
      materialGrade: record.listing_material_grade,
      weightKg: record.listing_weight_kg,
      timestamp: record.created_at,
    });
    const hashMatches = expectedHash === record.cpcb_certificate_hash;

    if (!hashMatches) {
      return res.status(200).json({
        success: true,
        data: {
          verified: false,
          hash_match: false,
          status: 'TAMPER_DETECTED',
          authority: 'CPCB EPR Portal Integration',
          token_id: record.token_id,
          listing_id: record.listing_id,
          reason:
            'Stored certificate hash does not match the hash recomputed from the underlying listing data. Listing or token records were modified after minting.',
          certificate_hash: record.cpcb_certificate_hash,
          expected_hash: expectedHash,
          issue_timestamp: record.created_at,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        verified: true,
        hash_match: true,
        status: 'OFFICIALLY_REGISTERED',
        authority: 'CPCB EPR Portal Integration',
        token_id: record.token_id,
        listing_id: record.listing_id,
        recycler_id: record.recycler_id,
        material_grade: record.material_grade,
        verified_weight_mt: Number(record.verified_weight_mt),
        certificate_hash: record.cpcb_certificate_hash,
        issue_timestamp: record.created_at,
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
  getRecyclerEprTokens,
};
