import crypto from 'crypto';
import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_LANGUAGES = ['hi', 'mr', 'kn', 'en', 'ta', 'te', 'bn'];
const ALLOWED_KYC_STATUSES = ['PENDING', 'VERIFIED', 'SUSPENDED'];

/**
 * Register a new Informal Wastepicker Profile
 * POST /api/v1/workers
 */
export const createWorkerProfile = async (req, res, next) => {
  try {
    const {
      user_id,
      full_name,
      preferred_language = 'hi',
      municipal_id_number,
      cooperative_affiliation,
      kyc_status = 'VERIFIED',
      qr_code_hash,
    } = req.body;

    if (!user_id || !UUID_REGEX.test(user_id)) {
      throw new AppError('Valid user_id (UUID) is required.', 400);
    }

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      throw new AppError('full_name is required and must be at least 2 characters.', 400);
    }

    const cleanLang = (preferred_language || 'hi').toLowerCase().trim();
    if (!ALLOWED_LANGUAGES.includes(cleanLang)) {
      throw new AppError(`Invalid preferred_language. Allowed languages: ${ALLOWED_LANGUAGES.join(', ')}`, 400);
    }

    const cleanKyc = (kyc_status || 'VERIFIED').toUpperCase().trim();
    if (!ALLOWED_KYC_STATUSES.includes(cleanKyc)) {
      throw new AppError(`Invalid kyc_status. Allowed values: ${ALLOWED_KYC_STATUSES.join(', ')}`, 400);
    }

    // Verify user exists and has role 'Picker'
    const userCheck = await query(
      'SELECT user_id, role, mobile_number, upi_vpa, organization_name FROM users WHERE user_id = $1;',
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      throw new AppError(`User with id '${user_id}' does not exist.`, 404);
    }

    const user = userCheck.rows[0];

    // Check if worker profile already exists for this user
    const existingProfile = await query(
      'SELECT worker_id FROM worker_profiles WHERE user_id = $1;',
      [user_id]
    );

    if (existingProfile.rows.length > 0) {
      throw new AppError(`A worker profile already exists for user_id '${user_id}'.`, 409);
    }

    // Auto-generate QR code hash if not provided
    const finalQrHash = qr_code_hash && qr_code_hash.trim()
      ? qr_code_hash.trim()
      : `IWL-QR-${crypto.randomBytes(6).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const insertSql = `
      INSERT INTO worker_profiles (
        user_id,
        full_name,
        preferred_language,
        municipal_id_number,
        cooperative_affiliation,
        kyc_status,
        qr_code_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const result = await query(insertSql, [
      user_id,
      full_name.trim(),
      cleanLang,
      municipal_id_number ? municipal_id_number.trim() : null,
      cooperative_affiliation ? cooperative_affiliation.trim() : null,
      cleanKyc,
      finalQrHash,
    ]);

    const created = result.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Informal worker profile successfully registered.',
      data: {
        ...created,
        user: {
          mobile_number: user.mobile_number,
          upi_vpa: user.upi_vpa,
          organization_name: user.organization_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List Worker Profiles with Filtering and Aggregated Statistics
 * GET /api/v1/workers
 */
export const listWorkerProfiles = async (req, res, next) => {
  try {
    const {
      kyc_status,
      cooperative,
      language,
      search,
      limit = 20,
      offset = 0,
    } = req.query;

    const conditions = [];
    const params = [];

    if (kyc_status) {
      params.push(kyc_status.toUpperCase().trim());
      conditions.push(`wp.kyc_status = $${params.length}`);
    }

    if (cooperative) {
      params.push(`%${cooperative.trim()}%`);
      conditions.push(`wp.cooperative_affiliation ILIKE $${params.length}`);
    }

    if (language) {
      params.push(language.toLowerCase().trim());
      conditions.push(`wp.preferred_language = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      conditions.push(`(wp.full_name ILIKE $${pIdx} OR wp.municipal_id_number ILIKE $${pIdx} OR u.mobile_number ILIKE $${pIdx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
    const safeOffset = Math.max(0, Number(offset) || 0);

    const countSql = `
      SELECT COUNT(*) AS total
      FROM worker_profiles wp
      JOIN users u ON wp.user_id = u.user_id
      ${whereClause};
    `;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    params.push(safeLimit);
    const limitIdx = params.length;
    params.push(safeOffset);
    const offsetIdx = params.length;

    const dataSql = `
      SELECT 
        wp.worker_id,
        wp.user_id,
        wp.full_name,
        wp.preferred_language,
        wp.municipal_id_number,
        wp.cooperative_affiliation,
        wp.kyc_status,
        wp.qr_code_hash,
        wp.created_at,
        u.mobile_number,
        u.upi_vpa,
        u.upi_vpa_status,
        u.upi_bank_account_holder,
        COALESCE(COUNT(wi.weigh_in_id), 0) AS total_weigh_ins,
        COALESCE(SUM(wi.net_weight_kg), 0.00) AS total_net_weight_kg,
        COALESCE(SUM(wi.total_payable_inr), 0.00) AS total_earned_inr,
        COALESCE(SUM(CASE WHEN wi.payout_status = 'PENDING' THEN wi.total_payable_inr ELSE 0 END), 0.00) AS pending_payout_inr
      FROM worker_profiles wp
      JOIN users u ON wp.user_id = u.user_id
      LEFT JOIN worker_weigh_ins wi ON wp.worker_id = wi.worker_id
      ${whereClause}
      GROUP BY wp.worker_id, u.user_id
      ORDER BY wp.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const result = await query(dataSql, params);

    return res.status(200).json({
      success: true,
      data: {
        total,
        limit: safeLimit,
        offset: safeOffset,
        workers: result.rows.map((row) => ({
          worker_id: row.worker_id,
          user_id: row.user_id,
          full_name: row.full_name,
          preferred_language: row.preferred_language,
          municipal_id_number: row.municipal_id_number,
          cooperative_affiliation: row.cooperative_affiliation,
          kyc_status: row.kyc_status,
          qr_code_hash: row.qr_code_hash,
          created_at: row.created_at,
          user: {
            mobile_number: row.mobile_number,
            upi_vpa: row.upi_vpa,
            upi_vpa_status: row.upi_vpa_status,
            upi_bank_account_holder: row.upi_bank_account_holder,
          },
          metrics: {
            total_weigh_ins: parseInt(row.total_weigh_ins, 10),
            total_net_weight_kg: Number(parseFloat(row.total_net_weight_kg).toFixed(2)),
            total_earned_inr: Number(parseFloat(row.total_earned_inr).toFixed(2)),
            pending_payout_inr: Number(parseFloat(row.pending_payout_inr).toFixed(2)),
          },
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch Worker Profile by Worker ID (UUID)
 * GET /api/v1/workers/:id
 */
export const getWorkerProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      throw new AppError('Invalid worker_id format. Must be a valid UUID.', 400);
    }

    const sql = `
      SELECT 
        wp.worker_id,
        wp.user_id,
        wp.full_name,
        wp.preferred_language,
        wp.municipal_id_number,
        wp.cooperative_affiliation,
        wp.kyc_status,
        wp.qr_code_hash,
        wp.created_at,
        u.mobile_number,
        u.upi_vpa,
        u.upi_vpa_status,
        u.upi_bank_account_holder,
        COALESCE(COUNT(wi.weigh_in_id), 0) AS total_weigh_ins,
        COALESCE(SUM(wi.net_weight_kg), 0.00) AS total_net_weight_kg,
        COALESCE(SUM(wi.total_payable_inr), 0.00) AS total_earned_inr,
        COALESCE(SUM(CASE WHEN wi.payout_status = 'PENDING' THEN wi.total_payable_inr ELSE 0 END), 0.00) AS pending_payout_inr
      FROM worker_profiles wp
      JOIN users u ON wp.user_id = u.user_id
      LEFT JOIN worker_weigh_ins wi ON wp.worker_id = wi.worker_id
      WHERE wp.worker_id = $1
      GROUP BY wp.worker_id, u.user_id;
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      throw new AppError(`Worker profile with id '${id}' not found.`, 404);
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        worker_id: row.worker_id,
        user_id: row.user_id,
        full_name: row.full_name,
        preferred_language: row.preferred_language,
        municipal_id_number: row.municipal_id_number,
        cooperative_affiliation: row.cooperative_affiliation,
        kyc_status: row.kyc_status,
        qr_code_hash: row.qr_code_hash,
        created_at: row.created_at,
        user: {
          mobile_number: row.mobile_number,
          upi_vpa: row.upi_vpa,
          upi_vpa_status: row.upi_vpa_status,
          upi_bank_account_holder: row.upi_bank_account_holder,
        },
        metrics: {
          total_weigh_ins: parseInt(row.total_weigh_ins, 10),
          total_net_weight_kg: Number(parseFloat(row.total_net_weight_kg).toFixed(2)),
          total_earned_inr: Number(parseFloat(row.total_earned_inr).toFixed(2)),
          pending_payout_inr: Number(parseFloat(row.pending_payout_inr).toFixed(2)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fast QR Code Lookup for DWCC Weighbridge Kiosks
 * GET /api/v1/workers/qr/:qr_code_hash
 */
export const getWorkerProfileByQr = async (req, res, next) => {
  try {
    const { qr_code_hash } = req.params;

    if (!qr_code_hash || !qr_code_hash.trim()) {
      throw new AppError('qr_code_hash parameter is required.', 400);
    }

    const sql = `
      SELECT 
        wp.worker_id,
        wp.user_id,
        wp.full_name,
        wp.preferred_language,
        wp.municipal_id_number,
        wp.cooperative_affiliation,
        wp.kyc_status,
        wp.qr_code_hash,
        wp.created_at,
        u.mobile_number,
        u.upi_vpa,
        u.upi_vpa_status,
        u.upi_bank_account_holder
      FROM worker_profiles wp
      JOIN users u ON wp.user_id = u.user_id
      WHERE wp.qr_code_hash = $1;
    `;

    const result = await query(sql, [qr_code_hash.trim()]);

    if (result.rows.length === 0) {
      throw new AppError(`No worker profile registered with QR code hash '${qr_code_hash}'.`, 404);
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        worker_id: row.worker_id,
        user_id: row.user_id,
        full_name: row.full_name,
        preferred_language: row.preferred_language,
        municipal_id_number: row.municipal_id_number,
        cooperative_affiliation: row.cooperative_affiliation,
        kyc_status: row.kyc_status,
        qr_code_hash: row.qr_code_hash,
        created_at: row.created_at,
        user: {
          mobile_number: row.mobile_number,
          upi_vpa: row.upi_vpa,
          upi_vpa_status: row.upi_vpa_status,
          upi_bank_account_holder: row.upi_bank_account_holder,
        },
        payout_ready: Boolean(row.upi_vpa && row.kyc_status === 'VERIFIED'),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Worker Profile Details
 * PATCH /api/v1/workers/:id
 */
export const updateWorkerProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      throw new AppError('Invalid worker_id format. Must be a valid UUID.', 400);
    }

    const updates = [];
    const values = [];

    if (req.body.full_name !== undefined) {
      if (typeof req.body.full_name !== 'string' || req.body.full_name.trim().length < 2) {
        throw new AppError('full_name must be at least 2 characters.', 400);
      }
      values.push(req.body.full_name.trim());
      updates.push(`full_name = $${values.length}`);
    }

    if (req.body.preferred_language !== undefined) {
      const cleanLang = req.body.preferred_language.toLowerCase().trim();
      if (!ALLOWED_LANGUAGES.includes(cleanLang)) {
        throw new AppError(`Invalid preferred_language. Allowed languages: ${ALLOWED_LANGUAGES.join(', ')}`, 400);
      }
      values.push(cleanLang);
      updates.push(`preferred_language = $${values.length}`);
    }

    if (req.body.municipal_id_number !== undefined) {
      values.push(req.body.municipal_id_number ? req.body.municipal_id_number.trim() : null);
      updates.push(`municipal_id_number = $${values.length}`);
    }

    if (req.body.cooperative_affiliation !== undefined) {
      values.push(req.body.cooperative_affiliation ? req.body.cooperative_affiliation.trim() : null);
      updates.push(`cooperative_affiliation = $${values.length}`);
    }

    if (req.body.kyc_status !== undefined) {
      const cleanKyc = req.body.kyc_status.toUpperCase().trim();
      if (!ALLOWED_KYC_STATUSES.includes(cleanKyc)) {
        throw new AppError(`Invalid kyc_status. Allowed values: ${ALLOWED_KYC_STATUSES.join(', ')}`, 400);
      }
      values.push(cleanKyc);
      updates.push(`kyc_status = $${values.length}`);
    }

    if (updates.length === 0) {
      throw new AppError('No valid profile fields provided for update.', 400);
    }

    values.push(id);
    const sql = `
      UPDATE worker_profiles
      SET ${updates.join(', ')}
      WHERE worker_id = $${values.length}
      RETURNING *;
    `;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      throw new AppError(`Worker profile with id '${id}' not found.`, 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Worker profile updated successfully.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

export default {
  createWorkerProfile,
  listWorkerProfiles,
  getWorkerProfileById,
  getWorkerProfileByQr,
  updateWorkerProfile,
};
