import express from 'express';
import {
  handleWhatsAppVoiceWebhook,
  getBenchmarkRates,
} from '../controllers/whatsappVoiceController.js';
import {
  processInstantWorkerPayout,
  processBatchPayout,
} from '../controllers/iwlPayoutController.js';
import {
  getWorkerLedger,
} from '../controllers/workerLedgerController.js';

const router = express.Router();

// ============================================================================
// WhatsApp Voice Webhook & Rate Lookup
// ============================================================================
router.post('/whatsapp/voice-webhook', handleWhatsAppVoiceWebhook);
router.get('/rates', getBenchmarkRates);

// ============================================================================
// Concurrency-Safe Instant Payout Endpoints
// ============================================================================
router.post('/payout/instant', processInstantWorkerPayout);
router.post('/payout/batch', processBatchPayout);

// ============================================================================
// Worker Earnings & Impact Ledger
// ============================================================================
router.get('/worker/:id/ledger', getWorkerLedger);

export default router;
