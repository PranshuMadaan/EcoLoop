import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { confirmDeposit, getDepositByReference } from '../controllers/depositController.js';

const router = Router();

// GET /api/v1/deposits/:reference -> Deposit status by reference (owning recycler or ULB)
router.get('/:reference', authenticate, authorizeRoles('Recycler', 'ULB'), getDepositByReference);

// POST /api/v1/deposits/:reference/confirm -> Simulated bank webhook confirming escrow funding
router.post('/:reference/confirm', authenticate, authorizeRoles('Recycler', 'ULB'), confirmDeposit);

export default router;
