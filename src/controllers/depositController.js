import { query } from '../config/db.js';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Confirm an escrow deposit (simulated bank webhook).
 * Flips a PENDING deposit created by payment-intent to SUCCESS once the
 * "bank" reports the money as received. Expired intents are marked FAILED.
 * POST /api/v1/deposits/:reference/confirm  (owning Recycler or ULB)
 */
export const confirmDeposit = async (req, res, next) => {
  try {
    const { reference } = req.params;
    if (!reference || typeof reference !== 'string' || reference.trim().length < 6) {
      throw new AppError('A valid deposit reference number is required.', 400);
    }

    const depositRes = await query(
      `SELECT deposit_id, listing_id, bidder_id, reference_no, amount_inr, channel, status, expires_at
       FROM deposits WHERE reference_no = $1;`,
      [reference.trim()]
    );
    if (depositRes.rows.length === 0) {
      throw new AppError(`Deposit with reference '${reference.trim()}' not found.`, 404);
    }

    const deposit = depositRes.rows[0];
    if (deposit.bidder_id !== req.user.user_id && req.user.role !== 'ULB') {
      throw new AppError('Only the depositing recycler or a ULB administrator can confirm this deposit.', 403);
    }

    if (deposit.status === 'SUCCESS') {
      throw new AppError('This deposit has already been confirmed.', 409);
    }
    if (deposit.status !== 'PENDING') {
      throw new AppError(`Deposit is '${deposit.status}' and cannot be confirmed. Create a new payment intent.`, 409);
    }
    if (deposit.expires_at && new Date(deposit.expires_at).getTime() < Date.now()) {
      await query("UPDATE deposits SET status = 'FAILED' WHERE deposit_id = $1;", [deposit.deposit_id]);
      throw new AppError('Payment intent has expired. Generate a new payment intent to fund escrow.', 409);
    }

    const gatewayTxnId = `DEP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    // Atomic status transition: a concurrent duplicate confirm leaves zero rows
    const confirmed = await query(
      `UPDATE deposits
       SET status = 'SUCCESS', gateway_transaction_id = $1, confirmed_at = NOW()
       WHERE deposit_id = $2 AND status = 'PENDING'
       RETURNING deposit_id, listing_id, bidder_id, reference_no, amount_inr, channel, status, confirmed_at;`,
      [gatewayTxnId, deposit.deposit_id]
    );
    if (confirmed.rows.length === 0) {
      throw new AppError('Deposit is no longer pending (already confirmed or failed).', 409);
    }

    return res.status(200).json({
      success: true,
      data: {
        message: 'Escrow deposit confirmed. The seller can now finalize the auction.',
        deposit: {
          ...confirmed.rows[0],
          amount_inr: Number(confirmed.rows[0].amount_inr),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Deposit status lookup by reference (owning recycler or ULB).
 * GET /api/v1/deposits/:reference
 */
export const getDepositByReference = async (req, res, next) => {
  try {
    const { reference } = req.params;
    if (!reference || typeof reference !== 'string' || reference.trim().length < 6) {
      throw new AppError('A valid deposit reference number is required.', 400);
    }

    const result = await query(
      `SELECT deposit_id, listing_id, bidder_id, reference_no, amount_inr, channel, status,
              gateway_transaction_id, expires_at, confirmed_at, created_at
       FROM deposits WHERE reference_no = $1;`,
      [reference.trim()]
    );
    if (result.rows.length === 0) {
      throw new AppError(`Deposit with reference '${reference.trim()}' not found.`, 404);
    }

    const deposit = result.rows[0];
    if (deposit.bidder_id !== req.user.user_id && req.user.role !== 'ULB') {
      throw new AppError('Only the depositing recycler or a ULB administrator can view this deposit.', 403);
    }

    return res.status(200).json({
      success: true,
      data: {
        deposit: {
          ...deposit,
          amount_inr: Number(deposit.amount_inr),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  confirmDeposit,
  getDepositByReference,
};
