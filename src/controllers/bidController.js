import { query, getClient } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Place a bid on an active scrap listing
 * POST /api/v1/listings/:listing_id/bids
 */
export const placeBid = async (req, res, next) => {
  try {
    const { listing_id } = req.params;
    const { bidder_id, bid_amount } = req.body;

    if (!listing_id || !UUID_REGEX.test(listing_id)) {
      throw new AppError('Invalid listing_id format. Must be a valid UUID.', 400);
    }

    if (!bidder_id || !UUID_REGEX.test(bidder_id)) {
      throw new AppError('A valid bidder_id (UUID) is required.', 400);
    }

    const parsedAmount = Number(bid_amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new AppError('bid_amount must be a positive numeric value in INR (₹).', 400);
    }

    const client = await getClient();
    try {
      // Begin atomic transaction
      await client.query('BEGIN');

    // 1. Verify bidder exists and is an authorized Recycler
    const bidderCheck = await client.query(
      'SELECT user_id, role, verification_status FROM users WHERE user_id = $1;',
      [bidder_id]
    );

    if (bidderCheck.rows.length === 0) {
      throw new AppError(`Bidder with id '${bidder_id}' not found.`, 404);
    }

    const bidder = bidderCheck.rows[0];
    if (bidder.role !== 'Recycler') {
      throw new AppError(
        `Only verified 'Recycler' accounts can place bids. Current role: ${bidder.role}`,
        403
      );
    }

    // 2. Lock listing row for update to prevent concurrent race conditions
    const listingCheck = await client.query(
      'SELECT listing_id, seller_id, min_price, status FROM scrap_listings WHERE listing_id = $1 FOR UPDATE;',
      [listing_id]
    );

    if (listingCheck.rows.length === 0) {
      throw new AppError(`Listing with id '${listing_id}' not found.`, 404);
    }

    const listing = listingCheck.rows[0];

    // Ensure listing is open for bidding
    if (!['OPEN', 'BIDDING'].includes(listing.status)) {
      throw new AppError(
        `Listing is closed for bidding. Current status: ${listing.status}`,
        400
      );
    }

    // Seller cannot bid on their own listing
    if (listing.seller_id === bidder_id) {
      throw new AppError('Sellers are prohibited from bidding on their own listings.', 400);
    }

    // Validate bid is at least min_price
    const minPrice = Number(listing.min_price);
    if (parsedAmount < minPrice) {
      throw new AppError(
        `Bid amount (₹${parsedAmount}) must be greater than or equal to reserve price (₹${minPrice}).`,
        400
      );
    }

    // 3. Check current highest bid
    const highestBidCheck = await client.query(
      "SELECT MAX(bid_amount) as current_highest FROM bids WHERE listing_id = $1 AND bid_status = 'ACTIVE';",
      [listing_id]
    );

    const currentHighest = Number(highestBidCheck.rows[0]?.current_highest || 0);
    if (currentHighest > 0 && parsedAmount <= currentHighest) {
      throw new AppError(
        `Bid amount (₹${parsedAmount}) must be higher than current top bid (₹${currentHighest}).`,
        400
      );
    }

    // 4. Insert the new active bid
    const insertBidSql = `
      INSERT INTO bids (listing_id, bidder_id, bid_amount, bid_status)
      VALUES ($1, $2, $3, 'ACTIVE')
      RETURNING bid_id, listing_id, bidder_id, bid_amount, bid_status, created_at;
    `;
    const bidResult = await client.query(insertBidSql, [listing_id, bidder_id, parsedAmount.toFixed(2)]);
    const newBid = bidResult.rows[0];

    // 5. If listing was OPEN, advance status to BIDDING
    if (listing.status === 'OPEN') {
      await client.query("UPDATE scrap_listings SET status = 'BIDDING' WHERE listing_id = $1;", [listing_id]);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: {
        ...newBid,
        bid_amount: Number(newBid.bid_amount),
        bidder: {
          user_id: bidder.user_id,
          role: bidder.role,
          verification_status: bidder.verification_status,
        },
      },
    });
  } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // Client connection is dead; surface the original error, not the rollback failure
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

/**
 * List all bids placed on a listing
 * GET /api/v1/listings/:listing_id/bids
 */
export const getListingBids = async (req, res, next) => {
  try {
    const { listing_id } = req.params;

    if (!UUID_REGEX.test(listing_id)) {
      throw new AppError('Invalid listing_id format. Must be a valid UUID.', 400);
    }

    const sql = `
      SELECT 
        b.bid_id,
        b.listing_id,
        b.bidder_id,
        b.bid_amount,
        b.bid_status,
        b.created_at,
        u.role AS bidder_role,
        u.verification_status AS bidder_verification_status
      FROM bids b
      JOIN users u ON b.bidder_id = u.user_id
      WHERE b.listing_id = $1
      ORDER BY b.bid_amount DESC, b.created_at ASC;
    `;

    const result = await query(sql, [listing_id]);

    const formattedBids = result.rows.map((row) => ({
      bid_id: row.bid_id,
      listing_id: row.listing_id,
      bidder_id: row.bidder_id,
      bid_amount: Number(row.bid_amount),
      bid_status: row.bid_status,
      created_at: row.created_at,
      bidder: {
        role: row.bidder_role,
        verification_status: row.bidder_verification_status,
      },
    }));

    return res.status(200).json({
      success: true,
      data: {
        total: formattedBids.length,
        highest_bid: formattedBids.length > 0 ? formattedBids[0].bid_amount : null,
        bids: formattedBids,
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  placeBid,
  getListingBids,
};
