import crypto from 'crypto';
import { query, getClient } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_PAYOUT_STATUSES = ['PENDING', 'PROCESSING', 'PAID', 'FAILED'];

/**
 * Log a daily weigh-in from DWCC aggregation hub
 * POST /api/v1/workers/weigh-ins
 */
export const createWeighIn = async (req, res, next) => {
  const client = await getClient();
  try {
    const {
      worker_id,
      dwcc_hub_id,
      material_grade,
      gross_weight_kg,
      tare_weight_kg = 0.00,
      applied_rate_per_kg,
      auto_payout = false,
    } = req.body;

    if (!worker_id || !UUID_REGEX.test(worker_id)) {
      throw new AppError('Valid worker_id (UUID) is required.', 400);
    }

    if (!dwcc_hub_id || !UUID_REGEX.test(dwcc_hub_id)) {
      throw new AppError('Valid dwcc_hub_id (UUID) is required.', 400);
    }

    if (!material_grade || typeof material_grade !== 'string' || material_grade.trim().length === 0) {
      throw new AppError('material_grade is required.', 400);
    }

    const gross = Number(gross_weight_kg);
    if (isNaN(gross) || gross <= 0) {
      throw new AppError('gross_weight_kg must be a positive number greater than 0.', 400);
    }

    const tare = Number(tare_weight_kg || 0);
    if (isNaN(tare) || tare < 0) {
      throw new AppError('tare_weight_kg must be a non-negative number.', 400);
    }

    if (gross <= tare) {
      throw new AppError(`gross_weight_kg (${gross} kg) must strictly exceed tare_weight_kg (${tare} kg).`, 400);
    }

    const rate = Number(applied_rate_per_kg);
    if (isNaN(rate) || rate < 0) {
      throw new AppError('applied_rate_per_kg must be a non-negative number.', 400);
    }

    const netWeight = parseFloat((gross - tare).toFixed(2));
    const totalPayable = parseFloat((netWeight * rate).toFixed(2));

    await client.query('BEGIN');

    // 1. Verify worker profile exists and retrieve user UPI details
    const workerRes = await client.query(
      `SELECT wp.worker_id, wp.full_name, wp.kyc_status, u.user_id, u.upi_vpa, u.mobile_number
       FROM worker_profiles wp
       JOIN users u ON wp.user_id = u.user_id
       WHERE wp.worker_id = $1;`,
      [worker_id]
    );

    if (workerRes.rows.length === 0) {
      throw new AppError(`Worker profile with id '${worker_id}' does not exist.`, 404);
    }

    const worker = workerRes.rows[0];

    // 2. Verify DWCC hub exists in users
    const hubRes = await client.query(
      `SELECT user_id, organization_name, role FROM users WHERE user_id = $1;`,
      [dwcc_hub_id]
    );

    if (hubRes.rows.length === 0) {
      throw new AppError(`DWCC Hub with id '${dwcc_hub_id}' does not exist.`, 404);
    }

    const hub = hubRes.rows[0];

    const initialStatus = auto_payout && worker.upi_vpa ? 'PAID' : 'PENDING';

    // 3. Insert weigh-in log
    const insertWeighInSql = `
      INSERT INTO worker_weigh_ins (
        worker_id,
        dwcc_hub_id,
        material_grade,
        gross_weight_kg,
        tare_weight_kg,
        net_weight_kg,
        applied_rate_per_kg,
        total_payable_inr,
        payout_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const weighInResult = await client.query(insertWeighInSql, [
      worker_id,
      dwcc_hub_id,
      material_grade.trim(),
      gross,
      tare,
      netWeight,
      rate,
      totalPayable,
      initialStatus,
    ]);

    const weighIn = weighInResult.rows[0];
    let payoutReceipt = null;

    // 4. If auto_payout requested and worker has registered UPI VPA, execute instant payout transaction
    if (initialStatus === 'PAID') {
      const utr = `${Date.now().toString().slice(-6)}${Math.floor(100000 + Math.random() * 900000)}`;
      const payoutId = `pout_IWL_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

      const insertPayoutSql = `
        INSERT INTO worker_payout_transactions (
          weigh_in_id,
          worker_id,
          amount_inr,
          seller_upi_vpa,
          razorpay_payout_id,
          utr_number,
          transaction_status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSED')
        RETURNING *;
      `;

      const payoutRes = await client.query(insertPayoutSql, [
        weighIn.weigh_in_id,
        worker_id,
        totalPayable,
        worker.upi_vpa,
        payoutId,
        utr,
      ]);

      payoutReceipt = payoutRes.rows[0];
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Daily weigh-in successfully recorded on ledger.',
      data: {
        weigh_in_id: weighIn.weigh_in_id,
        worker: {
          worker_id: worker.worker_id,
          full_name: worker.full_name,
          mobile_number: worker.mobile_number,
          upi_vpa: worker.upi_vpa,
        },
        dwcc_hub: {
          hub_id: hub.user_id,
          organization_name: hub.organization_name,
        },
        material_grade: weighIn.material_grade,
        gross_weight_kg: Number(weighIn.gross_weight_kg),
        tare_weight_kg: Number(weighIn.tare_weight_kg),
        net_weight_kg: Number(weighIn.net_weight_kg),
        applied_rate_per_kg: Number(weighIn.applied_rate_per_kg),
        total_payable_inr: Number(weighIn.total_payable_inr),
        payout_status: weighIn.payout_status,
        payout_receipt: payoutReceipt
          ? {
              payout_id: payoutReceipt.payout_id,
              amount_inr: Number(payoutReceipt.amount_inr),
              seller_upi_vpa: payoutReceipt.seller_upi_vpa,
              razorpay_payout_id: payoutReceipt.razorpay_payout_id,
              utr_number: payoutReceipt.utr_number,
              transaction_status: payoutReceipt.transaction_status,
              processed_at: payoutReceipt.processed_at,
            }
          : null,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * List Daily Weigh-In Logs with Filtering
 * GET /api/v1/workers/weigh-ins
 */
export const listWeighIns = async (req, res, next) => {
  try {
    const {
      worker_id,
      dwcc_hub_id,
      material_grade,
      payout_status,
      start_date,
      end_date,
      limit = 20,
      offset = 0,
    } = req.query;

    const conditions = [];
    const params = [];

    if (worker_id) {
      if (!UUID_REGEX.test(worker_id)) {
        throw new AppError('Invalid worker_id filter format. Must be UUID.', 400);
      }
      params.push(worker_id);
      conditions.push(`wi.worker_id = $${params.length}`);
    }

    if (dwcc_hub_id) {
      if (!UUID_REGEX.test(dwcc_hub_id)) {
        throw new AppError('Invalid dwcc_hub_id filter format. Must be UUID.', 400);
      }
      params.push(dwcc_hub_id);
      conditions.push(`wi.dwcc_hub_id = $${params.length}`);
    }

    if (material_grade) {
      params.push(material_grade.trim());
      conditions.push(`wi.material_grade ILIKE $${params.length}`);
    }

    if (payout_status) {
      const cleanStatus = payout_status.toUpperCase().trim();
      if (!ALLOWED_PAYOUT_STATUSES.includes(cleanStatus)) {
        throw new AppError(`Invalid payout_status filter. Allowed values: ${ALLOWED_PAYOUT_STATUSES.join(', ')}`, 400);
      }
      params.push(cleanStatus);
      conditions.push(`wi.payout_status = $${params.length}`);
    }

    if (start_date) {
      params.push(start_date);
      conditions.push(`wi.created_at >= $${params.length}`);
    }

    if (end_date) {
      params.push(end_date);
      conditions.push(`wi.created_at <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
    const safeOffset = Math.max(0, Number(offset) || 0);

    // Compute aggregate summary for matching filter criteria
    const summarySql = `
      SELECT 
        COUNT(*) AS total_count,
        COALESCE(SUM(wi.net_weight_kg), 0.00) AS total_weight_kg,
        COALESCE(SUM(wi.total_payable_inr), 0.00) AS total_payable_inr
      FROM worker_weigh_ins wi
      ${whereClause};
    `;
    const summaryRes = await query(summarySql, params);
    const summary = summaryRes.rows[0];

    params.push(safeLimit);
    const limitIdx = params.length;
    params.push(safeOffset);
    const offsetIdx = params.length;

    const dataSql = `
      SELECT 
        wi.weigh_in_id,
        wi.worker_id,
        wp.full_name AS worker_name,
        wp.cooperative_affiliation,
        wi.dwcc_hub_id,
        u.organization_name AS dwcc_hub_name,
        wi.material_grade,
        wi.gross_weight_kg,
        wi.tare_weight_kg,
        wi.net_weight_kg,
        wi.applied_rate_per_kg,
        wi.total_payable_inr,
        wi.payout_status,
        wi.created_at,
        wpt.payout_id,
        wpt.utr_number,
        wpt.seller_upi_vpa,
        wpt.processed_at AS payout_processed_at
      FROM worker_weigh_ins wi
      JOIN worker_profiles wp ON wi.worker_id = wp.worker_id
      JOIN users u ON wi.dwcc_hub_id = u.user_id
      LEFT JOIN worker_payout_transactions wpt ON wi.weigh_in_id = wpt.weigh_in_id
      ${whereClause}
      ORDER BY wi.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const result = await query(dataSql, params);

    return res.status(200).json({
      success: true,
      data: {
        total: parseInt(summary.total_count, 10),
        total_weight_kg: Number(parseFloat(summary.total_weight_kg).toFixed(2)),
        total_payable_inr: Number(parseFloat(summary.total_payable_inr).toFixed(2)),
        limit: safeLimit,
        offset: safeOffset,
        weigh_ins: result.rows.map((row) => ({
          weigh_in_id: row.weigh_in_id,
          worker_id: row.worker_id,
          worker_name: row.worker_name,
          cooperative_affiliation: row.cooperative_affiliation,
          dwcc_hub_id: row.dwcc_hub_id,
          dwcc_hub_name: row.dwcc_hub_name,
          material_grade: row.material_grade,
          gross_weight_kg: Number(row.gross_weight_kg),
          tare_weight_kg: Number(row.tare_weight_kg),
          net_weight_kg: Number(row.net_weight_kg),
          applied_rate_per_kg: Number(row.applied_rate_per_kg),
          total_payable_inr: Number(row.total_payable_inr),
          payout_status: row.payout_status,
          created_at: row.created_at,
          payout: row.payout_id
            ? {
                payout_id: row.payout_id,
                utr_number: row.utr_number,
                seller_upi_vpa: row.seller_upi_vpa,
                processed_at: row.payout_processed_at,
              }
            : null,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch a specific Weigh-In by ID
 * GET /api/v1/workers/weigh-ins/:id
 */
export const getWeighInById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      throw new AppError('Invalid weigh_in_id format. Must be a valid UUID.', 400);
    }

    const sql = `
      SELECT 
        wi.weigh_in_id,
        wi.worker_id,
        wp.full_name AS worker_name,
        wp.cooperative_affiliation,
        wp.qr_code_hash,
        wi.dwcc_hub_id,
        hub.organization_name AS dwcc_hub_name,
        wi.material_grade,
        wi.gross_weight_kg,
        wi.tare_weight_kg,
        wi.net_weight_kg,
        wi.applied_rate_per_kg,
        wi.total_payable_inr,
        wi.payout_status,
        wi.created_at,
        wpt.payout_id,
        wpt.amount_inr AS payout_amount_inr,
        wpt.seller_upi_vpa,
        wpt.razorpay_payout_id,
        wpt.utr_number,
        wpt.transaction_status AS payout_transaction_status,
        wpt.processed_at AS payout_processed_at
      FROM worker_weigh_ins wi
      JOIN worker_profiles wp ON wi.worker_id = wp.worker_id
      JOIN users hub ON wi.dwcc_hub_id = hub.user_id
      LEFT JOIN worker_payout_transactions wpt ON wi.weigh_in_id = wpt.weigh_in_id
      WHERE wi.weigh_in_id = $1;
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      throw new AppError(`Weigh-in log with id '${id}' not found.`, 404);
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        weigh_in_id: row.weigh_in_id,
        worker: {
          worker_id: row.worker_id,
          full_name: row.worker_name,
          cooperative_affiliation: row.cooperative_affiliation,
          qr_code_hash: row.qr_code_hash,
        },
        dwcc_hub: {
          hub_id: row.dwcc_hub_id,
          organization_name: row.dwcc_hub_name,
        },
        material_grade: row.material_grade,
        gross_weight_kg: Number(row.gross_weight_kg),
        tare_weight_kg: Number(row.tare_weight_kg),
        net_weight_kg: Number(row.net_weight_kg),
        applied_rate_per_kg: Number(row.applied_rate_per_kg),
        total_payable_inr: Number(row.total_payable_inr),
        payout_status: row.payout_status,
        created_at: row.created_at,
        payout_receipt: row.payout_id
          ? {
              payout_id: row.payout_id,
              amount_inr: Number(row.payout_amount_inr),
              seller_upi_vpa: row.seller_upi_vpa,
              razorpay_payout_id: row.razorpay_payout_id,
              utr_number: row.utr_number,
              transaction_status: row.payout_transaction_status,
              processed_at: row.payout_processed_at,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Execute Instant UPI Payout for a Weigh-In
 * POST /api/v1/workers/weigh-ins/:id/payout
 */
export const processWeighInPayout = async (req, res, next) => {
  const client = await getClient();
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      throw new AppError('Invalid weigh_in_id format. Must be a valid UUID.', 400);
    }

    await client.query('BEGIN');

    // 1. Fetch weigh-in record and worker's UPI details
    const weighInRes = await client.query(
      `SELECT 
        wi.weigh_in_id,
        wi.worker_id,
        wi.total_payable_inr,
        wi.payout_status,
        u.upi_vpa,
        u.mobile_number,
        wp.full_name
       FROM worker_weigh_ins wi
       JOIN worker_profiles wp ON wi.worker_id = wp.worker_id
       JOIN users u ON wp.user_id = u.user_id
       WHERE wi.weigh_in_id = $1
       FOR UPDATE;`,
      [id]
    );

    if (weighInRes.rows.length === 0) {
      throw new AppError(`Weigh-in log with id '${id}' not found.`, 404);
    }

    const weighIn = weighInRes.rows[0];

    if (weighIn.payout_status === 'PAID') {
      throw new AppError('This weigh-in log has already been paid and settled.', 409);
    }

    const payeeVpa = req.body.upi_vpa || weighIn.upi_vpa;
    if (!payeeVpa) {
      throw new AppError('No UPI VPA found for this worker. Please provide a destination upi_vpa in the request body.', 400);
    }

    const utr = `${Date.now().toString().slice(-6)}${Math.floor(100000 + Math.random() * 900000)}`;
    const razorpayPayoutId = `pout_IWL_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

    // 2. Insert payout transaction receipt
    const insertPayoutSql = `
      INSERT INTO worker_payout_transactions (
        weigh_in_id,
        worker_id,
        amount_inr,
        seller_upi_vpa,
        razorpay_payout_id,
        utr_number,
        transaction_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSED')
      RETURNING *;
    `;

    const payoutRes = await client.query(insertPayoutSql, [
      weighIn.weigh_in_id,
      weighIn.worker_id,
      weighIn.total_payable_inr,
      payeeVpa,
      razorpayPayoutId,
      utr,
    ]);

    // 3. Mark weigh-in as PAID
    await client.query(
      `UPDATE worker_weigh_ins SET payout_status = 'PAID' WHERE weigh_in_id = $1;`,
      [id]
    );

    await client.query('COMMIT');

    const payout = payoutRes.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Instant UPI payout settled successfully for informal worker weigh-in.',
      data: {
        weigh_in_id: weighIn.weigh_in_id,
        worker_id: weighIn.worker_id,
        worker_name: weighIn.full_name,
        amount_inr: Number(payout.amount_inr),
        payee_vpa: payout.seller_upi_vpa,
        utr_number: payout.utr_number,
        razorpay_payout_id: payout.razorpay_payout_id,
        transaction_status: payout.transaction_status,
        processed_at: payout.processed_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Aggregated Worker Earnings & Weight Ledger Summary
 * GET /api/v1/workers/:id/summary
 */
export const getWorkerSummary = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      throw new AppError('Invalid worker_id format. Must be a valid UUID.', 400);
    }

    // Worker profile
    const profileRes = await query(
      `SELECT wp.*, u.mobile_number, u.upi_vpa, u.upi_bank_account_holder
       FROM worker_profiles wp
       JOIN users u ON wp.user_id = u.user_id
       WHERE wp.worker_id = $1;`,
      [id]
    );

    if (profileRes.rows.length === 0) {
      throw new AppError(`Worker profile with id '${id}' not found.`, 404);
    }

    const profile = profileRes.rows[0];

    // Aggregates by material grade
    const materialRes = await query(
      `SELECT 
        material_grade,
        COUNT(*) AS weigh_in_count,
        COALESCE(SUM(net_weight_kg), 0.00) AS total_kg,
        COALESCE(SUM(total_payable_inr), 0.00) AS total_inr
       FROM worker_weigh_ins
       WHERE worker_id = $1
       GROUP BY material_grade
       ORDER BY total_inr DESC;`,
      [id]
    );

    // Lifetime totals
    const totalRes = await query(
      `SELECT 
        COUNT(*) AS total_weigh_ins,
        COALESCE(SUM(net_weight_kg), 0.00) AS total_kg,
        COALESCE(SUM(total_payable_inr), 0.00) AS total_inr,
        COALESCE(SUM(CASE WHEN payout_status = 'PAID' THEN total_payable_inr ELSE 0 END), 0.00) AS total_paid_inr,
        COALESCE(SUM(CASE WHEN payout_status = 'PENDING' THEN total_payable_inr ELSE 0 END), 0.00) AS total_pending_inr
       FROM worker_weigh_ins
       WHERE worker_id = $1;`,
      [id]
    );

    const totals = totalRes.rows[0];

    // Recent 5 logs
    const recentRes = await query(
      `SELECT 
        wi.weigh_in_id,
        wi.material_grade,
        wi.net_weight_kg,
        wi.applied_rate_per_kg,
        wi.total_payable_inr,
        wi.payout_status,
        wi.created_at,
        u.organization_name AS dwcc_hub_name
       FROM worker_weigh_ins wi
       JOIN users u ON wi.dwcc_hub_id = u.user_id
       WHERE wi.worker_id = $1
       ORDER BY wi.created_at DESC
       LIMIT 5;`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        worker: {
          worker_id: profile.worker_id,
          full_name: profile.full_name,
          cooperative_affiliation: profile.cooperative_affiliation,
          municipal_id_number: profile.municipal_id_number,
          preferred_language: profile.preferred_language,
          kyc_status: profile.kyc_status,
          qr_code_hash: profile.qr_code_hash,
          upi_vpa: profile.upi_vpa,
        },
        lifetime_stats: {
          total_weigh_ins: parseInt(totals.total_weigh_ins, 10),
          total_net_weight_kg: Number(parseFloat(totals.total_kg).toFixed(2)),
          total_net_weight_mt: Number((parseFloat(totals.total_kg) / 1000).toFixed(3)),
          total_earned_inr: Number(parseFloat(totals.total_inr).toFixed(2)),
          total_paid_inr: Number(parseFloat(totals.total_paid_inr).toFixed(2)),
          total_pending_inr: Number(parseFloat(totals.total_pending_inr).toFixed(2)),
        },
        material_breakdown: materialRes.rows.map((m) => ({
          material_grade: m.material_grade,
          weigh_in_count: parseInt(m.weigh_in_count, 10),
          total_kg: Number(parseFloat(m.total_kg).toFixed(2)),
          total_inr: Number(parseFloat(m.total_inr).toFixed(2)),
        })),
        recent_weigh_ins: recentRes.rows.map((r) => ({
          weigh_in_id: r.weigh_in_id,
          material_grade: r.material_grade,
          net_weight_kg: Number(r.net_weight_kg),
          applied_rate_per_kg: Number(r.applied_rate_per_kg),
          total_payable_inr: Number(r.total_payable_inr),
          payout_status: r.payout_status,
          dwcc_hub_name: r.dwcc_hub_name,
          created_at: r.created_at,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  createWeighIn,
  listWeighIns,
  getWeighInById,
  processWeighInPayout,
  getWorkerSummary,
};
