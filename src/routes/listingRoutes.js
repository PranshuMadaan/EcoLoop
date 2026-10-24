import { Router } from 'express';
import {
  createListing,
  listListings,
  getListingById,
} from '../controllers/listingController.js';
import {
  placeBid,
  getListingBids,
} from '../controllers/bidController.js';
import {
  acceptBid,
  createPaymentIntent,
} from '../controllers/auctionController.js';

const router = Router();

// POST /api/v1/listings -> Create listing (seller_id, material_grade, weight_kg, min_price)
router.post('/', createListing);

// GET /api/v1/listings -> List active listings (supports ?material_grade=...&status=...)
router.get('/', listListings);

// GET /api/v1/listings/:id -> Fetch single listing details with seller & bids info
router.get('/:id', getListingById);

// POST /api/v1/listings/:listing_id/bids -> Place an auction bid on a listing
router.post('/:listing_id/bids', placeBid);

// GET /api/v1/listings/:listing_id/bids -> View all bids on a listing
router.get('/:listing_id/bids', getListingBids);

// POST /api/v1/listings/:listing_id/payment-intent -> Generate dynamic UPI intent & B2B VAN for recycler
router.post('/:listing_id/payment-intent', createPaymentIntent);

// POST /api/v1/listings/:listing_id/accept-bid -> Finalize auction, process UPI payout & mint EPR token
router.post('/:listing_id/accept-bid', acceptBid);

export default router;
