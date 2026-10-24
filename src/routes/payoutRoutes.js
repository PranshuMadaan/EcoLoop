import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import {
  getMyPayouts,
  listAllPayouts,
  getPayoutsForListing,
  reversePayout,
} from '../controllers/payoutController.js';

const router = Router();

// GET /api/v1/payouts -> Authenticated seller's own payout ledger history
router.get('/', authenticate, getMyPayouts);

// GET /api/v1/payouts/all -> ULB audit view with status/date/seller filters
router.get('/all', authenticate, authorizeRoles('ULB'), listAllPayouts);

// GET /api/v1/payouts/listing/:listing_id -> Payout trail for one listing (seller or ULB)
router.get('/listing/:listing_id', authenticate, getPayoutsForListing);

// POST /api/v1/payouts/:payout_id/reverse -> ULB reverses a settled payout (compensating escrow entry)
router.post('/:payout_id/reverse', authenticate, authorizeRoles('ULB'), reversePayout);

export default router;
