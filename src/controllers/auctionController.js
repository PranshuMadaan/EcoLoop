import crypto from 'crypto';
import QRCode from 'qrcode';
import { getClient, query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ESCROW_MERCHANT_VPA = 'ecoloop.escrow@icici';
const INTENT_TTL_MINUTES = 15;

/**
 * Generate cryptographically secure CPCB certificate hash using SHA-256.
 * The secret is read lazily so a missing EPR_HASH_SECRET surfaces as a clear
 * operational error instead of silently minting hashes under a committed default.
 */
export const generateCpcbHash = ({ listingId, recyclerId, materialGrade, weightMt, timestamp }) => {
  const secret = process.env.EPR_HASH_SECRET;
  if (!secret) {
    throw new AppError('EPR_HASH_SECRET is not configured; cannot mint or verify CPCB certificate hashes.', 500);
  }
  const payload = `${listingId}|${recyclerId}|${materialGrade}|${weightMt}|${timestamp}|${secret}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * Simulate Real-time UPI Payout to Seller's VPA with Automated Split.
 * Platform fee and welfare levy are rounded first; the seller receives the
 * residual so the three components always sum exactly to the gross amount.
 */
export const executeUpiPayout = ({ sellerVpa, amountInr, sellerId }) => {
  const transactionId = `UPI-TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const rrn = `RRN${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  const gross = Number(amountInr);
  const platformFee = Number((gross * 0.010).toFixed(2));
  const welfareLevy = Number((gross * 0.005).toFixed(2));
  const sellerNet = Number((gross - platformFee - welfareLevy).toFixed(2));

  return {
    transaction_id: transactionId,
    bank_rrn: rrn,
    seller_id: sellerId,
    payee_vpa: sellerVpa || 'seller.default@upi',
    amount_inr: gross,
    gross_amount_inr: gross,
    seller_net_amount_inr: sellerNet,
    platform_fee_inr: platformFee,
    welfare_levy_inr: welfareLevy,
    split: {
      seller_share_percent: 98.5,
      platform_commission_percent: 1.0,
      informal_picker_welfare_percent: 0.5,
    },
    currency: 'INR',
    status: 'SUCCESS',
    timestamp: new Date().toISOString(),
    gateway: 'EcoLoop FastEscrow Instant Settlement',
  };
};

/**
 * Generate Dynamic Payment Intent for Recycler (Payer) and open a PENDING
 * escrow deposit. Supports Mobile UPI Intent, Dynamic QR, and B2B Virtual
 * Account (RTGS/NEFT). The intent is persisted so accept-bid can verify the
 * recycler actually funded escrow before settlement.
 * POST /api/v1/listings/:listing_id/payment-intent  (authenticated Recycler)
 */
export const createPaymentIntent = async (req, res, next) => {
  try {
    const { listing_id } = req.params;
    const { bid_amount } = req.body;

    if (!listing_id || !UUID_REGEX.test(listing_id)) {
      throw new AppError('Invalid listing_id format. Must be a valid UUID.', 400);
    }

    const listingRes = await query(
      'SELECT listing_id, material_grade, weight_kg, min_price, mstc_lot_no, status FROM scrap_listings WHERE listing_id = $1;',
      [listing_id]
    );
    if (listingRes.rows.length === 0) {
      throw new AppError(`Listing with id '${listing_id}' not found.`, 404);
    }

    const listing = listingRes.rows[0];
    if (!['OPEN', 'BIDDING'].includes(listing.status)) {
      throw new AppError(
        `Escrow deposits are only accepted for OPEN or BIDDING lots. Current status: ${listing.status}`,
        400
      );
    }

    const amount = Number(bid_amount) || Number(listing.min_price);
    if (isNaN(amount) || amount <= 0) {
      throw new AppError('bid_amount must be a positive numeric value.', 400);
    }

    const referenceNo = `ECOP${listing_id.replace(/-/g, '').slice(0, 10).toUpperCase()}${crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;
    const expiresAt = new Date(Date.now() + INTENT_TTL_MINUTES * 60 * 1000);

    const depositRes = await query(
      `INSERT INTO deposits (listing_id, bidder_id, reference_no, amount_inr, channel, status, expires_at)
       VALUES ($1, $2, $3, $4, 'UPI', 'PENDING', $5)
       RETURNING deposit_id, reference_no, amount_inr, status, expires_at;`,
      [listing_id, req.user.user_id, referenceNo, amount.toFixed(2), expiresAt]
    );
    const deposit = depositRes.rows[0];

    const lotTag = listing.mstc_lot_no || `LOT-${listing_id.slice(0, 8)}`;
    const encodedDesc = encodeURIComponent(`EcoLoop Escrow Lot ${lotTag}`);
    const upiUri = `upi://pay?pa=${ESCROW_MERCHANT_VPA}&pn=EcoLoop%20Escrow&am=${amount.toFixed(
      2
    )}&cu=INR&tr=${referenceNo}&tn=${encodedDesc}`;
    const qrDataUrl = await QRCode.toDataURL(upiUri, { width: 260, margin: 1 });

    return res.status(201).json({
      success: true,
      data: {
        deposit_id: deposit.deposit_id,
        reference_no: deposit.reference_no,
        listing_id,
        material_grade: listing.material_grade,
        weight_kg: Number(listing.weight_kg),
        amount_inr: amount,
        escrow_merchant_vpa: ESCROW_MERCHANT_VPA,
        merchant_name: 'EcoLoop Clearing & Escrow Account',
        upi_intent_uri: upiUri,
        qr_data_url: qrDataUrl,
        van_b2b_details: {
          beneficiary_name: 'EcoLoop Clearing & Escrow Services',
          virtual_account_number: referenceNo,
          ifsc_code: 'ICIC0000104',
          bank_name: 'ICICI Bank Corporate Clearing (B2B RTGS/NEFT Rail)',
          threshold_note: 'Recommended for bulk industrial scrap settlements (>= ₹1,00,000)',
        },
        expires_at: deposit.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Accept Auction Bid, Process UPI Payout, and Mint EPR Token.
 * Settlement refuses to run unless the winning bidder has a confirmed escrow
 * deposit covering the bid amount.
 * POST /api/v1/listings/:listing_id/accept-bid  (authenticated seller or ULB)
 */
export const acceptBid = async (req, res, next) => {
  const { listing_id } = req.params;
  const { bid_id } = req.body;
  const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotency_key || null;

  if (!listing_id || !UUID_REGEX.test(listing_id)) {
    return next(new AppError('Invalid listing_id format. Must be a valid UUID.', 400));
  }

  if (bid_id && !UUID_REGEX.test(bid_id)) {
    return next(new AppError('Invalid bid_id format. Must be a valid UUID.', 400));
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Idempotent settlement: replaying a settled auction with the same key
    // returns the original outcome instead of double-paying the seller.
    if (idempotencyKey) {
      const replayRes = await client.query(
        `SELECT payout_id, listing_id, gross_amount, seller_net_amount, platform_fee, welfare_levy,
                gateway_transaction_id, bank_rrn, status, created_at
         FROM payouts WHERE idempotency_key = $1;`,
        [idempotencyKey]
      );
      if (replayRes.rows.length > 0) {
        const existing = replayRes.rows[0];
        if (existing.listing_id !== listing_id) {
          throw new AppError('Idempotency key was already used for a different listing.', 409);
        }
        const tokenRes = await client.query(
          `SELECT token_id, material_grade, verified_weight_mt, cpcb_certificate_hash, created_at
           FROM epr_tokens WHERE listing_id = $1;`,
          [listing_id]
        );
        await client.query('COMMIT');
        return res.status(200).json({
          success: true,
          data: {
            message: 'Auction already finalized for this listing; returning the original settlement.',
            idempotent_replay: true,
            listing_id,
            status: 'SOLD',
            payout: {
              transaction_id: existing.gateway_transaction_id,
              bank_rrn: existing.bank_rrn,
              payee_vpa: null,
              amount_inr: Number(existing.gross_amount),
              gross_amount_inr: Number(existing.gross_amount),
              seller_net_amount_inr: Number(existing.seller_net_amount),
              platform_fee_inr: Number(existing.platform_fee),
              welfare_levy_inr: Number(existing.welfare_levy),
              currency: 'INR',
              status: existing.status,
              timestamp: existing.created_at,
            },
            epr_token: tokenRes.rows[0]
              ? {
                  token_id: tokenRes.rows[0].token_id,
                  material_grade: tokenRes.rows[0].material_grade,
                  verified_weight_mt: Number(tokenRes.rows[0].verified_weight_mt),
                  cpcb_certificate_hash: tokenRes.rows[0].cpcb_certificate_hash,
                  created_at: tokenRes.rows[0].created_at,
                  verification_url: `/api/v1/epr/verify/${tokenRes.rows[0].cpcb_certificate_hash}`,
                }
              : null,
          },
        });
      }
    }

    // 1. Lock listing row FOR UPDATE to prevent race conditions
    const listingQuery = `
      SELECT
        l.listing_id,
        l.seller_id,
        l.material_grade,
        l.weight_kg,
        l.min_price,
        l.status,
        u.role AS seller_role,
        u.upi_vpa AS seller_upi_vpa
      FROM scrap_listings l
      JOIN users u ON l.seller_id = u.user_id
      WHERE l.listing_id = $1
      FOR UPDATE;
    `;
    const listingRes = await client.query(listingQuery, [listing_id]);

    if (listingRes.rows.length === 0) {
      throw new AppError(`Listing with id '${listing_id}' not found.`, 404);
    }

    const listing = listingRes.rows[0];

    // Verify auction status
    if (!['OPEN', 'BIDDING'].includes(listing.status)) {
      throw new AppError(
        `Cannot accept bids for listing in '${listing.status}' status. Only OPEN or BIDDING auctions can be finalized.`,
        400
      );
    }

    // Verify requester ownership (authenticate middleware guarantees req.user)
    if (req.user.role !== 'ULB' && req.user.user_id !== listing.seller_id) {
      throw new AppError('Only the listing seller or an authorized ULB administrator can accept bids.', 403);
    }

    // Listings under 0.5 kg round to 0.000 MT and can never satisfy the
    // epr_tokens verified_weight_mt > 0 constraint — fail with a clear 400
    // before any state is written instead of a constraint rollback.
    const weightMt = (Number(listing.weight_kg) / 1000).toFixed(3);
    if (!(Number(weightMt) > 0)) {
      throw new AppError(
        `Listing weight (${listing.weight_kg} kg) is below the 0.5 kg minimum required to mint an EPR credit.`,
        400
      );
    }

    // 2. Determine winning bid (either specified bid_id or highest active bid)
    let bidQuery;
    let bidParams;

    if (bid_id) {
      bidQuery = `
        SELECT bid_id, listing_id, bidder_id, bid_amount, bid_status
        FROM bids
        WHERE bid_id = $1 AND listing_id = $2
        FOR UPDATE;
      `;
      bidParams = [bid_id, listing_id];
    } else {
      bidQuery = `
        SELECT bid_id, listing_id, bidder_id, bid_amount, bid_status
        FROM bids
        WHERE listing_id = $1 AND bid_status = 'ACTIVE'
        ORDER BY bid_amount DESC, created_at ASC
        LIMIT 1
        FOR UPDATE;
      `;
      bidParams = [listing_id];
    }

    const bidRes = await client.query(bidQuery, bidParams);

    if (bidRes.rows.length === 0) {
      throw new AppError('No eligible active bids found to accept on this listing.', 404);
    }

    const winningBid = bidRes.rows[0];

    // Ensure winning bid meets min_price
    if (Number(winningBid.bid_amount) < Number(listing.min_price)) {
      throw new AppError(
        `Winning bid amount (₹${winningBid.bid_amount}) does not satisfy reserve price (₹${listing.min_price}).`,
        400
      );
    }

    // Escrow funding gate: settlement pays out only against confirmed money-in
    // from the winning bidder covering the bid amount.
    const depositCheck = await client.query(
      `SELECT deposit_id, amount_inr FROM deposits
       WHERE listing_id = $1 AND bidder_id = $2 AND status = 'SUCCESS' AND amount_inr >= $3
       LIMIT 1;`,
      [listing_id, winningBid.bidder_id, Number(winningBid.bid_amount)]
    );
    if (depositCheck.rows.length === 0) {
      throw new AppError(
        `Escrow not funded: the winning bidder must confirm a deposit of at least ₹${Number(
          winningBid.bid_amount
        ).toLocaleString('en-IN')} before settlement. The recycler can fund escrow via Payment Rails.`,
        409
      );
    }

    // Belt-and-braces against double settlement (e.g. a listing re-opened manually)
    const existingPayout = await client.query(
      'SELECT payout_id FROM payouts WHERE listing_id = $1;',
      [listing_id]
    );
    if (existingPayout.rows.length > 0) {
      throw new AppError('Auction for this listing has already been settled; a payout row exists.', 409);
    }

    // 3. Update winning bid to ACCEPTED
    await client.query(
      "UPDATE bids SET bid_status = 'ACCEPTED' WHERE bid_id = $1;",
      [winningBid.bid_id]
    );

    // 4. Update all other bids on this listing to REJECTED
    await client.query(
      "UPDATE bids SET bid_status = 'REJECTED' WHERE listing_id = $1 AND bid_id != $2 AND bid_status = 'ACTIVE';",
      [listing_id, winningBid.bid_id]
    );

    // 5. Update listing status to SOLD
    await client.query(
      "UPDATE scrap_listings SET status = 'SOLD' WHERE listing_id = $1;",
      [listing_id]
    );

    // 6. Execute Simulated Real-time UPI Payout to Seller with Automated Split
    const payoutReceipt = executeUpiPayout({
      sellerVpa: listing.seller_upi_vpa,
      amountInr: winningBid.bid_amount,
      sellerId: listing.seller_id,
    });

    // Record payout in immutable payouts ledger table
    await client.query(`
      INSERT INTO payouts (
        listing_id, seller_id, payee_vpa, gross_amount, seller_net_amount, platform_fee, welfare_levy, gateway_transaction_id, bank_rrn, status, idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
    `, [
      listing.listing_id,
      listing.seller_id,
      payoutReceipt.payee_vpa,
      payoutReceipt.gross_amount_inr,
      payoutReceipt.seller_net_amount_inr,
      payoutReceipt.platform_fee_inr,
      payoutReceipt.welfare_levy_inr,
      payoutReceipt.transaction_id,
      payoutReceipt.bank_rrn,
      payoutReceipt.status,
      idempotencyKey,
    ]);

    // 7. Mint CPCB Cryptographic EPR Compliance Token
    // Weight converted from kg to Metric Tonnes (MT)
    const nowIso = new Date().toISOString();
    const cpcbHash = generateCpcbHash({
      listingId: listing.listing_id,
      recyclerId: winningBid.bidder_id,
      materialGrade: listing.material_grade,
      weightMt,
      timestamp: nowIso,
    });

    const insertTokenSql = `
      INSERT INTO epr_tokens (
        listing_id,
        recycler_id,
        material_grade,
        verified_weight_mt,
        cpcb_certificate_hash,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING token_id, listing_id, recycler_id, material_grade, verified_weight_mt, cpcb_certificate_hash, created_at;
    `;

    const tokenRes = await client.query(insertTokenSql, [
      listing.listing_id,
      winningBid.bidder_id,
      listing.material_grade,
      weightMt,
      cpcbHash,
      nowIso,
    ]);

    const mintedEprToken = tokenRes.rows[0];

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      data: {
        message: 'Auction finalized successfully. Payout dispatched and EPR token minted.',
        listing_id: listing.listing_id,
        status: 'SOLD',
        winning_bid: {
          bid_id: winningBid.bid_id,
          bidder_id: winningBid.bidder_id,
          amount_inr: Number(winningBid.bid_amount),
          status: 'ACCEPTED',
        },
        payout: payoutReceipt,
        epr_token: {
          token_id: mintedEprToken.token_id,
          material_grade: mintedEprToken.material_grade,
          verified_weight_mt: Number(mintedEprToken.verified_weight_mt),
          cpcb_certificate_hash: mintedEprToken.cpcb_certificate_hash,
          created_at: mintedEprToken.created_at,
          verification_url: `/api/v1/epr/verify/${mintedEprToken.cpcb_certificate_hash}`,
        },
      },
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // Client connection is dead; surface the original error, not the rollback failure
    }
    next(err);
  } finally {
    client.release();
  }
};

export default {
  acceptBid,
  generateCpcbHash,
  executeUpiPayout,
  createPaymentIntent,
};
