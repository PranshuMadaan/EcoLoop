import crypto from 'crypto';
import { getClient } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EPR_HASH_SECRET = process.env.EPR_HASH_SECRET || 'cpcb_epr_audit_hash_salt_key_2026';

/**
 * Generate cryptographically secure CPCB certificate hash using SHA-256
 */
export const generateCpcbHash = ({ listingId, recyclerId, materialGrade, weightMt, timestamp }) => {
  const payload = `${listingId}|${recyclerId}|${materialGrade}|${weightMt}|${timestamp}|${EPR_HASH_SECRET}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * Simulate Real-time UPI Payout to Seller's VPA with Automated Split
 */
export const executeUpiPayout = ({ sellerVpa, amountInr, sellerId }) => {
  const transactionId = `UPI-TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const rrn = `RRN${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  const gross = Number(amountInr);
  const sellerNet = Number((gross * 0.985).toFixed(2));
  const platformFee = Number((gross * 0.010).toFixed(2));
  const welfareLevy = Number((gross * 0.005).toFixed(2));

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
 * Generate Dynamic Payment Intent for Recycler (Payer)
 * Supports Mobile UPI Intent, Dynamic QR, and B2B Virtual Account (RTGS/NEFT)
 * POST /api/v1/listings/:listing_id/payment-intent
 */
export const createPaymentIntent = async (req, res, next) => {
  try {
    const { listing_id } = req.params;
    const { bid_amount } = req.body;

    if (!listing_id || !UUID_REGEX.test(listing_id)) {
      throw new AppError('Invalid listing_id format. Must be a valid UUID.', 400);
    }

    const { query: dbQuery } = await import('../config/db.js');
    const listingRes = await dbQuery(
      'SELECT listing_id, material_grade, weight_kg, min_price, mstc_lot_no, status FROM scrap_listings WHERE listing_id = $1;',
      [listing_id]
    );
    if (listingRes.rows.length === 0) {
      throw new AppError(`Listing with id '${listing_id}' not found.`, 404);
    }

    const listing = listingRes.rows[0];
    const amount = Number(bid_amount) || Number(listing.min_price);
    if (isNaN(amount) || amount <= 0) {
      throw new AppError('bid_amount must be a positive numeric value.', 400);
    }

    const lotTag = listing.mstc_lot_no || `LOT-${listing_id.slice(0, 8)}`;
    const encodedDesc = encodeURIComponent(`EcoLoop Escrow Lot ${lotTag}`);
    const upiUri = `upi://pay?pa=ecoloop.escrow@icici&pn=EcoLoop%20Escrow&am=${amount.toFixed(2)}&cu=INR&tn=${encodedDesc}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiUri)}`;
    const vanNumber = `ECOP${listing_id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    return res.status(200).json({
      success: true,
      data: {
        listing_id,
        material_grade: listing.material_grade,
        weight_kg: Number(listing.weight_kg),
        amount_inr: amount,
        escrow_merchant_vpa: 'ecoloop.escrow@icici',
        merchant_name: 'EcoLoop Clearing & Escrow Account',
        upi_intent_uri: upiUri,
        dynamic_qr_url: qrUrl,
        van_b2b_details: {
          beneficiary_name: 'EcoLoop Clearing & Escrow Services',
          virtual_account_number: vanNumber,
          ifsc_code: 'ICIC0000104',
          bank_name: 'ICICI Bank Corporate Clearing (B2B RTGS/NEFT Rail)',
          threshold_note: 'Recommended for bulk industrial scrap settlements (>= ₹1,00,000)',
        },
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Accept Auction Bid, Process UPI Payout, and Mint EPR Token
 * POST /api/v1/listings/:listing_id/accept-bid
 */
export const acceptBid = async (req, res, next) => {
  const { listing_id } = req.params;
  const { bid_id } = req.body;

  if (!listing_id || !UUID_REGEX.test(listing_id)) {
    return next(new AppError('Invalid listing_id format. Must be a valid UUID.', 400));
  }

  if (bid_id && !UUID_REGEX.test(bid_id)) {
    return next(new AppError('Invalid bid_id format. Must be a valid UUID.', 400));
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

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

    // Verify requester ownership (if authenticated)
    if (req.user && req.user.role !== 'ULB' && req.user.user_id !== listing.seller_id) {
      throw new AppError('Only the listing seller or an authorized ULB administrator can accept bids.', 403);
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
        listing_id, seller_id, payee_vpa, gross_amount, seller_net_amount, platform_fee, welfare_levy, gateway_transaction_id, bank_rrn, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'SUCCESS');
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
    ]);

    // 7. Mint CPCB Cryptographic EPR Compliance Token
    // Weight converted from kg to Metric Tonnes (MT)
    const weightMt = (Number(listing.weight_kg) / 1000).toFixed(3);
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
    await client.query('ROLLBACK');
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
