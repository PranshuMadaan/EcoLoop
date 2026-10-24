import crypto from 'crypto';
import { getClient, query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Concurrency-Safe Instant Razorpay Spot UPI Payout
 * POST /api/v1/iwl/payout/instant
 *
 * Uses explicit PostgreSQL transaction with SELECT ... FOR UPDATE row-level
 * locking to prevent double-payment race conditions. Atomically:
 *  1. Locks the weigh-in record
 *  2. Verifies PENDING status
 *  3. Retrieves worker UPI VPA
 *  4. Simulates Razorpay Payouts API
 *  5. Records payout transaction receipt
 *  6. Updates weigh-in status to PAID
 */
export const processInstantWorkerPayout = async (req, res, next) => {
  const client = await getClient();
  try {
    const { weigh_in_id } = req.body;

    // --- Input Validation ---
    if (!weigh_in_id || !UUID_REGEX.test(weigh_in_id)) {
      throw new AppError('Valid weigh_in_id (UUID) is required.', 400);
    }

    // --- Step 1: BEGIN transaction ---
    await client.query('BEGIN');

    // --- Step 2: Lock weigh-in record with FOR UPDATE ---
    // This prevents concurrent payout attempts on the same weigh-in
    const lockRes = await client.query(
      `SELECT
         wi.weigh_in_id,
         wi.worker_id,
         wi.material_grade,
         wi.net_weight_kg,
         wi.applied_rate_per_kg,
         wi.total_payable_inr,
         wi.payout_status,
         wi.created_at AS weigh_in_date
       FROM worker_weigh_ins wi
       WHERE wi.weigh_in_id = $1
       FOR UPDATE;`,
      [weigh_in_id]
    );

    if (lockRes.rows.length === 0) {
      throw new AppError(`Weigh-in record '${weigh_in_id}' not found.`, 404);
    }

    const weighIn = lockRes.rows[0];

    // --- Step 3: Verify PENDING status ---
    if (weighIn.payout_status !== 'PENDING') {
      throw new AppError(
        `Cannot process payout: weigh-in is already '${weighIn.payout_status}'. Only PENDING weigh-ins can be paid.`,
        409
      );
    }

    // --- Step 4: Retrieve worker's registered UPI VPA ---
    const workerRes = await client.query(
      `SELECT
         wp.worker_id,
         wp.full_name,
         wp.cooperative_affiliation,
         wp.kyc_status,
         u.upi_vpa,
         u.mobile_number,
         u.upi_bank_account_holder
       FROM worker_profiles wp
       JOIN users u ON wp.user_id = u.user_id
       WHERE wp.worker_id = $1;`,
      [weighIn.worker_id]
    );

    if (workerRes.rows.length === 0) {
      throw new AppError(`Worker profile for id '${weighIn.worker_id}' not found.`, 404);
    }

    const worker = workerRes.rows[0];

    // Allow override of destination VPA from request body
    const destinationVpa = req.body.upi_vpa || worker.upi_vpa;

    if (!destinationVpa) {
      throw new AppError(
        'No UPI VPA found for this worker. Please provide upi_vpa in the request body or register one on the worker profile.',
        400
      );
    }

    // Verify KYC is not suspended
    if (worker.kyc_status === 'SUSPENDED') {
      throw new AppError(
        `Worker KYC status is SUSPENDED. Payouts are blocked until KYC is re-verified.`,
        403
      );
    }

    // --- Step 5: Simulate Razorpay Payouts API execution ---
    const razorpayPayoutId = `pout_mock_iwl_${crypto.randomBytes(8).toString('hex')}`;
    const utrNumber = `${Date.now().toString().slice(-6)}${Math.floor(100000 + Math.random() * 900000)}`;
    const payoutAmount = Number(weighIn.total_payable_inr);

    // Simulate latency and Razorpay API call
    // In production: const rzpResult = await razorpay.payouts.create({ ... });

    // --- Step 6: Record payout transaction in worker_payout_transactions ---
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
      weigh_in_id,
      weighIn.worker_id,
      payoutAmount,
      destinationVpa,
      razorpayPayoutId,
      utrNumber,
    ]);

    const payoutReceipt = payoutRes.rows[0];

    // --- Step 7: Update weigh-in payout_status to PAID ---
    await client.query(
      `UPDATE worker_weigh_ins SET payout_status = 'PAID' WHERE weigh_in_id = $1;`,
      [weigh_in_id]
    );

    // --- Step 8: COMMIT transaction ---
    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Instant UPI payout processed successfully via Razorpay.',
      data: {
        payout_id: payoutReceipt.payout_id,
        weigh_in_id: payoutReceipt.weigh_in_id,
        worker: {
          worker_id: worker.worker_id,
          full_name: worker.full_name,
          cooperative: worker.cooperative_affiliation,
          mobile_number: worker.mobile_number,
        },
        transaction: {
          amount_inr: Number(payoutReceipt.amount_inr),
          destination_upi_vpa: payoutReceipt.seller_upi_vpa,
          account_holder: worker.upi_bank_account_holder || null,
          razorpay_payout_id: payoutReceipt.razorpay_payout_id,
          utr_number: payoutReceipt.utr_number,
          transaction_status: payoutReceipt.transaction_status,
          processed_at: payoutReceipt.processed_at,
        },
        weigh_in_summary: {
          material_grade: weighIn.material_grade,
          net_weight_kg: Number(weighIn.net_weight_kg),
          applied_rate_per_kg: Number(weighIn.applied_rate_per_kg),
          total_payable_inr: payoutAmount,
          weigh_in_date: weighIn.weigh_in_date,
        },
      },
    });
  } catch (err) {
    // --- ROLLBACK on any error ---
    await client.query('ROLLBACK');
    next(err);
  } finally {
    // --- Always release client back to pool ---
    client.release();
  }
};

/**
 * Batch Payout Processing for multiple pending weigh-ins
 * POST /api/v1/iwl/payout/batch
 *
 * Accepts an array of weigh_in_ids and processes each atomically.
 */
export const processBatchPayout = async (req, res, next) => {
  try {
    const { weigh_in_ids } = req.body;

    if (!Array.isArray(weigh_in_ids) || weigh_in_ids.length === 0) {
      throw new AppError('weigh_in_ids must be a non-empty array of UUIDs.', 400);
    }

    if (weigh_in_ids.length > 50) {
      throw new AppError('Batch payout is limited to 50 weigh-ins per request.', 400);
    }

    // Validate all UUIDs
    for (const id of weigh_in_ids) {
      if (!UUID_REGEX.test(id)) {
        throw new AppError(`Invalid UUID format: '${id}'`, 400);
      }
    }

    const results = [];
    const errors = [];

    for (const wId of weigh_in_ids) {
      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Lock the row
        const lockRes = await client.query(
          `SELECT wi.weigh_in_id, wi.worker_id, wi.total_payable_inr, wi.payout_status
           FROM worker_weigh_ins wi
           WHERE wi.weigh_in_id = $1
           FOR UPDATE;`,
          [wId]
        );

        if (lockRes.rows.length === 0) {
          errors.push({ weigh_in_id: wId, error: 'Not found' });
          await client.query('ROLLBACK');
          continue;
        }

        const wi = lockRes.rows[0];

        if (wi.payout_status !== 'PENDING') {
          errors.push({ weigh_in_id: wId, error: `Already ${wi.payout_status}` });
          await client.query('ROLLBACK');
          continue;
        }

        // Get worker UPI
        const workerRes = await client.query(
          `SELECT u.upi_vpa FROM worker_profiles wp JOIN users u ON wp.user_id = u.user_id WHERE wp.worker_id = $1;`,
          [wi.worker_id]
        );

        const vpa = workerRes.rows[0]?.upi_vpa;
        if (!vpa) {
          errors.push({ weigh_in_id: wId, error: 'No UPI VPA registered' });
          await client.query('ROLLBACK');
          continue;
        }

        const razorpayId = `pout_mock_iwl_${crypto.randomBytes(8).toString('hex')}`;
        const utr = `${Date.now().toString().slice(-6)}${Math.floor(100000 + Math.random() * 900000)}`;

        await client.query(
          `INSERT INTO worker_payout_transactions (weigh_in_id, worker_id, amount_inr, seller_upi_vpa, razorpay_payout_id, utr_number, transaction_status)
           VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSED');`,
          [wId, wi.worker_id, wi.total_payable_inr, vpa, razorpayId, utr]
        );

        await client.query(
          `UPDATE worker_weigh_ins SET payout_status = 'PAID' WHERE weigh_in_id = $1;`,
          [wId]
        );

        await client.query('COMMIT');

        results.push({
          weigh_in_id: wId,
          amount_inr: Number(wi.total_payable_inr),
          upi_vpa: vpa,
          utr_number: utr,
          razorpay_payout_id: razorpayId,
          status: 'PAID',
        });
      } catch (batchErr) {
        await client.query('ROLLBACK');
        errors.push({ weigh_in_id: wId, error: batchErr.message });
      } finally {
        client.release();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Batch payout complete: ${results.length} paid, ${errors.length} failed.`,
      data: {
        total_requested: weigh_in_ids.length,
        total_paid: results.length,
        total_failed: errors.length,
        total_amount_inr: results.reduce((sum, r) => sum + r.amount_inr, 0),
        paid: results,
        failed: errors,
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  processInstantWorkerPayout,
  processBatchPayout,
};
