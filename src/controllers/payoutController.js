import { query, getClient } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYOUT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REVERSED'];

const PAYOUT_SELECT = `
  SELECT
    p.payout_id,
    p.listing_id,
    p.seller_id,
    p.payee_vpa,
    p.gross_amount,
    p.seller_net_amount,
    p.platform_fee,
    p.welfare_levy,
    p.gateway_transaction_id,
    p.bank_rrn,
    p.status,
    p.created_at,
    l.material_grade,
    l.mstc_lot_no
  FROM payouts p
  JOIN scrap_listings l ON p.listing_id = l.listing_id
`;

const formatPayout = (row) => ({
  payout_id: row.payout_id,
  listing_id: row.listing_id,
  seller_id: row.seller_id,
  payee_vpa: row.payee_vpa,
  gross_amount_inr: Number(row.gross_amount),
  seller_net_amount_inr: Number(row.seller_net_amount),
  platform_fee_inr: Number(row.platform_fee),
  welfare_levy_inr: Number(row.welfare_levy),
  gateway_transaction_id: row.gateway_transaction_id,
  bank_rrn: row.bank_rrn,
  status: row.status,
  created_at: row.created_at,
  material_grade: row.material_grade,
  mstc_lot_no: row.mstc_lot_no,
});

/**
 * Seller's own payout history from the immutable payouts ledger.
 * GET /api/v1/payouts  (?status=SUCCESS|PENDING|FAILED|REVERSED)
 */
export const getMyPayouts = async (req, res, next) => {
  try {
    const { status } = req.query;
    if (status && !PAYOUT_STATUSES.includes(status)) {
      throw new AppError(`Invalid status filter. Allowed: ${PAYOUT_STATUSES.join(', ')}.`, 400);
    }

    const sql = `${PAYOUT_SELECT} WHERE p.seller_id = $1 ${
      status ? 'AND p.status = $2' : ''
    } ORDER BY p.created_at DESC;`;

    const result = await query(sql, status ? [req.user.user_id, status] : [req.user.user_id]);
    const payouts = result.rows.map(formatPayout);

    const totals = payouts.reduce(
      (acc, p) => {
        if (p.status === 'SUCCESS') {
          acc.total_gross_inr += p.gross_amount_inr;
          acc.total_net_inr += p.seller_net_amount_inr;
        }
        return acc;
      },
      { total_gross_inr: 0, total_net_inr: 0 }
    );

    return res.status(200).json({
      success: true,
      data: {
        total: payouts.length,
        total_gross_inr: Number(totals.total_gross_inr.toFixed(2)),
        total_net_inr: Number(totals.total_net_inr.toFixed(2)),
        payouts,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ULB audit view over the full payouts ledger with status/date/seller filters.
 * GET /api/v1/payouts/all  (?status=&seller_id=&from=YYYY-MM-DD&to=YYYY-MM-DD)
 */
export const listAllPayouts = async (req, res, next) => {
  try {
    const { status, seller_id, from, to } = req.query;
    if (status && !PAYOUT_STATUSES.includes(status)) {
      throw new AppError(`Invalid status filter. Allowed: ${PAYOUT_STATUSES.join(', ')}.`, 400);
    }
    if (seller_id && !UUID_REGEX.test(seller_id)) {
      throw new AppError('Invalid seller_id filter. Must be a valid UUID.', 400);
    }

    const conditions = [];
    const params = [];
    if (status) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }
    if (seller_id) {
      params.push(seller_id);
      conditions.push(`p.seller_id = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`p.created_at >= $${params.length}::timestamptz`);
    }
    if (to) {
      params.push(to);
      conditions.push(`p.created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `${PAYOUT_SELECT} ${where} ORDER BY p.created_at DESC LIMIT 500;`;

    const result = await query(sql, params);
    const payouts = result.rows.map(formatPayout);

    return res.status(200).json({
      success: true,
      data: {
        total: payouts.length,
        payouts,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Payout trail for a single listing. Visible to the listing's seller and ULB.
 * GET /api/v1/payouts/listing/:listing_id
 */
export const getPayoutsForListing = async (req, res, next) => {
  try {
    const { listing_id } = req.params;
    if (!listing_id || !UUID_REGEX.test(listing_id)) {
      throw new AppError('Invalid listing_id format. Must be a valid UUID.', 400);
    }

    const listingRes = await query(
      'SELECT seller_id FROM scrap_listings WHERE listing_id = $1;',
      [listing_id]
    );
    if (listingRes.rows.length === 0) {
      throw new AppError(`Listing with id '${listing_id}' not found.`, 404);
    }

    const isSeller = listingRes.rows[0].seller_id === req.user.user_id;
    if (!isSeller && req.user.role !== 'ULB') {
      throw new AppError('Only the listing seller or a ULB administrator can view this payout trail.', 403);
    }

    const result = await query(`${PAYOUT_SELECT} WHERE p.listing_id = $1 ORDER BY p.created_at DESC;`, [
      listing_id,
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total: result.rowCount,
        payouts: result.rows.map(formatPayout),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reverse a settled payout (ULB only). Flips the ledger row to REVERSED and
 * writes a compensating REVERSAL deposit returning the gross amount to the
 * escrow pool, keeping money-in and money-out reconciled.
 * POST /api/v1/payouts/:payout_id/reverse
 */
export const reversePayout = async (req, res, next) => {
  try {
    const { payout_id } = req.params;
    if (!payout_id || !UUID_REGEX.test(payout_id)) {
      throw new AppError('Invalid payout_id format. Must be a valid UUID.', 400);
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const payoutRes = await client.query(
        'SELECT payout_id, listing_id, seller_id, gross_amount, status FROM payouts WHERE payout_id = $1 FOR UPDATE;',
        [payout_id]
      );
      if (payoutRes.rows.length === 0) {
        throw new AppError(`Payout with id '${payout_id}' not found.`, 404);
      }

      const payout = payoutRes.rows[0];
      if (payout.status === 'REVERSED') {
        throw new AppError('This payout has already been reversed.', 409);
      }
      if (payout.status !== 'SUCCESS') {
        throw new AppError(`Only SUCCESS payouts can be reversed. Current status: ${payout.status}`, 409);
      }

      // Identify the escrow payer (winning bidder) for the compensating entry
      const bidderRes = await client.query(
        `SELECT bidder_id FROM bids WHERE listing_id = $1 AND bid_status = 'ACCEPTED' LIMIT 1;`,
        [payout.listing_id]
      );
      let bidderId = bidderRes.rows[0]?.bidder_id || null;
      if (!bidderId) {
        const depositRes = await client.query(
          'SELECT bidder_id FROM deposits WHERE listing_id = $1 LIMIT 1;',
          [payout.listing_id]
        );
        bidderId = depositRes.rows[0]?.bidder_id || null;
      }
      if (!bidderId) {
        throw new AppError('Cannot reverse payout: escrow payer for this listing could not be determined.', 409);
      }

      const nowIso = new Date().toISOString();
      await client.query(
        "UPDATE payouts SET status = 'REVERSED' WHERE payout_id = $1;",
        [payout_id]
      );

      const compensatingRes = await client.query(
        `INSERT INTO deposits (listing_id, bidder_id, reference_no, amount_inr, channel, status, gateway_transaction_id, confirmed_at)
         VALUES ($1, $2, $3, $4, 'REVERSAL', 'SUCCESS', $5, $6)
         RETURNING deposit_id, reference_no, amount_inr, channel, status;`,
        [
          payout.listing_id,
          bidderId,
          `REV-${payout.payout_id.replace(/-/g, '').slice(0, 16).toUpperCase()}`,
          Number(payout.gross_amount).toFixed(2),
          `REV-TXN-${Date.now()}`,
          nowIso,
        ]
      );

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        data: {
          message: 'Payout reversed; compensating escrow entry recorded.',
          payout_id,
          status: 'REVERSED',
          compensating_deposit: compensatingRes.rows[0],
        },
      });
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // Client connection is dead; surface the original error
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

export default {
  getMyPayouts,
  listAllPayouts,
  getPayoutsForListing,
  reversePayout,
};
