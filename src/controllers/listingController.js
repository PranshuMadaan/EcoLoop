import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_STATUSES = ['OPEN', 'BIDDING', 'SOLD', 'CANCELLED'];
export const ALLOWED_MATERIAL_GRADES = [
  'PET',
  'HDPE',
  'LDPE',
  'PP',
  'E-Waste',
  'Paper',
  'Cardboard',
  'Metal',
];

/**
 * Create a new scrap listing
 * POST /api/v1/listings
 */
export const createListing = async (req, res, next) => {
  try {
    const { seller_id, material_grade, weight_kg, min_price } = req.body;

    // Validate seller_id
    if (!seller_id || !UUID_REGEX.test(seller_id)) {
      throw new AppError('A valid seller_id (UUID) is required.', 400);
    }

    // Validate material_grade
    // FIX (BUG-001): Enforce strict validation against supported material_grade enums
    if (!material_grade || typeof material_grade !== 'string' || material_grade.trim().length === 0) {
      throw new AppError(
        `material_grade is required. Allowed material grades are: ${ALLOWED_MATERIAL_GRADES.join(', ')}`,
        400
      );
    }

    const trimmedGrade = material_grade.trim();
    const matchedGrade = ALLOWED_MATERIAL_GRADES.find(
      (g) => g.toLowerCase() === trimmedGrade.toLowerCase()
    );
    if (!matchedGrade) {
      throw new AppError(
        `Invalid material_grade '${material_grade}'. Allowed material grades are: ${ALLOWED_MATERIAL_GRADES.join(', ')}`,
        400
      );
    }

    // Validate weight_kg
    const parsedWeight = Number(weight_kg);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      throw new AppError('weight_kg must be a positive numeric value.', 400);
    }

    // Validate min_price
    const parsedMinPrice = Number(min_price);
    if (isNaN(parsedMinPrice) || parsedMinPrice < 0) {
      throw new AppError('min_price must be a non-negative numeric value representing INR (₹).', 400);
    }

    // Verify seller exists and belongs to a selling role (Picker or DWCC)
    const sellerCheck = await query(
      'SELECT user_id, role, verification_status FROM users WHERE user_id = $1;',
      [seller_id]
    );

    if (sellerCheck.rows.length === 0) {
      throw new AppError(`Seller with id '${seller_id}' does not exist.`, 404);
    }

    const seller = sellerCheck.rows[0];
    if (!['Picker', 'DWCC'].includes(seller.role)) {
      throw new AppError(
        `User with role '${seller.role}' is not authorized to create scrap listings. Allowed roles: Picker, DWCC.`,
        403
      );
    }

    const sql = `
      INSERT INTO scrap_listings (seller_id, material_grade, weight_kg, min_price, status)
      VALUES ($1, $2, $3, $4, 'OPEN')
      RETURNING listing_id, seller_id, material_grade, weight_kg, min_price, status, created_at;
    `;

    const result = await query(sql, [
      seller_id,
      matchedGrade,
      parsedWeight.toFixed(2),
      parsedMinPrice.toFixed(2),
    ]);

    const newListing = result.rows[0];

    return res.status(201).json({
      success: true,
      data: {
        ...newListing,
        seller: {
          user_id: seller.user_id,
          role: seller.role,
          verification_status: seller.verification_status,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List scrap listings with optional filters (material_grade, status)
 * GET /api/v1/listings?material_grade=PET&status=OPEN
 */
export const listListings = async (req, res, next) => {
  try {
    const { material_grade, status, limit = 50, offset = 0 } = req.query;

    const conditions = [];
    const params = [];

    // Filter by material_grade
    if (material_grade) {
      params.push(material_grade.trim());
      conditions.push(`LOWER(l.material_grade) = LOWER($${params.length})`);
    }

    // Filter by status (defaulting to active listings OPEN & BIDDING if omitted)
    if (status) {
      const upperStatus = status.toUpperCase();
      if (upperStatus !== 'ALL') {
        if (!ALLOWED_STATUSES.includes(upperStatus)) {
          throw new AppError(
            `Invalid status filter '${status}'. Allowed statuses: ${ALLOWED_STATUSES.join(', ')} or ALL`,
            400
          );
        }
        params.push(upperStatus);
        conditions.push(`l.status = $${params.length}`);
      }
    } else {
      // Default to active listings available for auction / bidding
      conditions.push(`l.status IN ('OPEN', 'BIDDING')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(Math.min(Math.max(Number(limit) || 50, 1), 100));
    const limitPlaceholder = `$${params.length}`;

    params.push(Math.max(Number(offset) || 0, 0));
    const offsetPlaceholder = `$${params.length}`;

    const sql = `
      SELECT 
        l.listing_id,
        l.seller_id,
        l.material_grade,
        l.weight_kg,
        l.min_price,
        l.status,
        l.mstc_lot_no,
        l.origin_location,
        l.created_at,
        u.role AS seller_role,
        u.mobile_number AS seller_mobile,
        u.organization_name AS seller_organization,
        u.cpcb_reg_number AS seller_cpcb_reg,
        u.verification_status AS seller_verification_status,
        COUNT(b.bid_id) AS total_bids,
        COALESCE(MAX(b.bid_amount), 0) AS highest_bid
      FROM scrap_listings l
      JOIN users u ON l.seller_id = u.user_id
      LEFT JOIN bids b ON l.listing_id = b.listing_id AND b.bid_status = 'ACTIVE'
      ${whereClause}
      GROUP BY l.listing_id, u.user_id
      ORDER BY l.created_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder};
    `;

    const result = await query(sql, params);

    const formattedListings = result.rows.map((row) => ({
      listing_id: row.listing_id,
      seller_id: row.seller_id,
      material_grade: row.material_grade,
      weight_kg: Number(row.weight_kg),
      min_price: Number(row.min_price),
      status: row.status,
      mstc_lot_no: row.mstc_lot_no || null,
      origin_location: row.origin_location || null,
      created_at: row.created_at,
      total_bids: Number(row.total_bids),
      highest_bid: Number(row.highest_bid),
      seller: {
        user_id: row.seller_id,
        role: row.seller_role,
        mobile_number: row.seller_mobile,
        organization_name: row.seller_organization || null,
        cpcb_reg_number: row.seller_cpcb_reg || null,
        verification_status: row.seller_verification_status,
      },
    }));

    return res.status(200).json({
      success: true,
      data: {
        total: formattedListings.length,
        listings: formattedListings,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch a single listing by ID with complete seller and bid details
 * GET /api/v1/listings/:id
 */
export const getListingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      throw new AppError('Invalid listing_id format. Must be a valid UUID.', 400);
    }

    const listingSql = `
      SELECT 
        l.listing_id,
        l.seller_id,
        l.material_grade,
        l.weight_kg,
        l.min_price,
        l.status,
        l.mstc_lot_no,
        l.origin_location,
        l.created_at,
        u.role AS seller_role,
        u.mobile_number AS seller_mobile,
        u.upi_vpa AS seller_upi_vpa,
        u.organization_name AS seller_organization,
        u.cpcb_reg_number AS seller_cpcb_reg,
        u.verification_status AS seller_verification_status
      FROM scrap_listings l
      JOIN users u ON l.seller_id = u.user_id
      WHERE l.listing_id = $1;
    `;

    const listingResult = await query(listingSql, [id]);

    if (listingResult.rows.length === 0) {
      throw new AppError(`Scrap listing with id '${id}' not found.`, 404);
    }

    const row = listingResult.rows[0];

    // Fetch associated active bids for this listing
    const bidsSql = `
      SELECT 
        b.bid_id,
        b.bidder_id,
        b.bid_amount,
        b.bid_status,
        b.created_at,
        bu.role AS bidder_role,
        bu.verification_status AS bidder_verification_status
      FROM bids b
      JOIN users bu ON b.bidder_id = bu.user_id
      WHERE b.listing_id = $1
      ORDER BY b.bid_amount DESC, b.created_at ASC;
    `;

    const bidsResult = await query(bidsSql, [id]);

    const bids = bidsResult.rows.map((b) => ({
      bid_id: b.bid_id,
      bidder_id: b.bidder_id,
      bid_amount: Number(b.bid_amount),
      bid_status: b.bid_status,
      created_at: b.created_at,
      bidder: {
        role: b.bidder_role,
        verification_status: b.bidder_verification_status,
      },
    }));

    const highestBid = bids.length > 0 ? bids[0].bid_amount : null;

    return res.status(200).json({
      success: true,
      data: {
        listing_id: row.listing_id,
        material_grade: row.material_grade,
        weight_kg: Number(row.weight_kg),
        min_price: Number(row.min_price),
        status: row.status,
        mstc_lot_no: row.mstc_lot_no || null,
        origin_location: row.origin_location || null,
        created_at: row.created_at,
        seller: {
          user_id: row.seller_id,
          role: row.seller_role,
          mobile_number: row.seller_mobile,
          upi_vpa: row.seller_upi_vpa,
          organization_name: row.seller_organization || null,
          cpcb_reg_number: row.seller_cpcb_reg || null,
          verification_status: row.seller_verification_status,
        },
        highest_bid: highestBid,
        total_bids: bids.length,
        bids,
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  createListing,
  listListings,
  getListingById,
};
