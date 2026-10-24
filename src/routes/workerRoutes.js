import express from 'express';
import {
  createWorkerProfile,
  listWorkerProfiles,
  getWorkerProfileById,
  getWorkerProfileByQr,
  updateWorkerProfile,
} from '../controllers/workerProfileController.js';
import {
  createWeighIn,
  listWeighIns,
  getWeighInById,
  processWeighInPayout,
  getWorkerSummary,
} from '../controllers/workerWeighInController.js';

const router = express.Router();

// ============================================================================
// Weigh-In Endpoints (specific subpaths must precede generic /:id)
// ============================================================================
router.post('/weigh-ins', createWeighIn);
router.get('/weigh-ins', listWeighIns);
router.get('/weigh-ins/:id', getWeighInById);
router.post('/weigh-ins/:id/payout', processWeighInPayout);

// ============================================================================
// Worker Profile Endpoints
// ============================================================================
router.post('/', createWorkerProfile);
router.get('/', listWorkerProfiles);
router.get('/qr/:qr_code_hash', getWorkerProfileByQr);
router.get('/:id/summary', getWorkerSummary);
router.get('/:id', getWorkerProfileById);
router.patch('/:id', updateWorkerProfile);

export default router;
