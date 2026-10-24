import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import {
  createCenter,
  listCenters,
  getRateCard,
  registerOfflinePicker,
  listOfflinePickers,
  recordDirectSale,
  listCenterSales,
} from '../controllers/municipalController.js';

const router = Router();

// Public discovery endpoints (find a counter / check today's official rates)
router.get('/centers', listCenters);
router.get('/rates', getRateCard);

// Municipal administration (ULB only)
router.post('/centers', authenticate, authorizeRoles('ULB'), createCenter);

// Tier-2 offline picker registry (ULB / DWCC operators at counters)
router.post('/pickers/offline', authenticate, authorizeRoles('ULB', 'DWCC'), registerOfflinePicker);
router.get('/pickers/offline', authenticate, authorizeRoles('ULB', 'DWCC'), listOfflinePickers);

// Tier-2 direct-sale desk (walk-in sales at a municipal counter)
router.post('/centers/:centerId/sales', authenticate, authorizeRoles('ULB', 'DWCC'), recordDirectSale);
router.get('/centers/:centerId/sales', authenticate, authorizeRoles('ULB', 'DWCC'), listCenterSales);

export default router;
