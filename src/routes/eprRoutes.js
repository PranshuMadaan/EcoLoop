import { Router } from 'express';
import {
  getEprTokenById,
  verifyCertificateHash,
  getRecyclerEprTokens,
} from '../controllers/eprController.js';

const router = Router();

// Public CPCB Verification Endpoint by Certificate Hash
router.get('/verify/:hash', verifyCertificateHash);

// Fetch EPR Token details by UUID
router.get('/tokens/:id', getEprTokenById);

// List all EPR tokens acquired by a Recycler
router.get('/recycler/:recycler_id', getRecyclerEprTokens);

export default router;
