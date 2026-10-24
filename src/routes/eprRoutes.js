import { Router } from 'express';
import {
  listAllEprTokens,
  getEprTokenById,
  verifyCertificateHash,
  getRecyclerEprTokens,
} from '../controllers/eprController.js';

const router = Router();

// Public CPCB Verification Endpoint by Certificate Hash
router.get('/verify/:hash', verifyCertificateHash);

// List all recently minted EPR tokens on the Ledger
router.get('/tokens', listAllEprTokens);

// Fetch EPR Token details by UUID
router.get('/tokens/:id', getEprTokenById);

// List all EPR tokens acquired by a Recycler
router.get('/recycler/:recycler_id', getRecyclerEprTokens);

export default router;
