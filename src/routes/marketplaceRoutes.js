import { Router } from 'express';
import {
  createEprTokenBundle,
  listEprTokenBundles,
  verifyBundleCertificateHash,
  createQualityIntakeAssay,
  getQualityAssayByListing,
  issueRecyclerTradeCredit,
  getRecyclerCreditLedger,
  settleRecyclerTradeCredit,
  createForwardContract,
  listForwardContracts,
  updateForwardContractStatus,
  createTransportManifest,
  getTransportManifestById,
  updateTransportManifestStatus,
  getMarketplaceCompetitiveOverview,
} from '../controllers/marketplaceGovController.js';

const router = Router();

// ============================================================================
// Marketplace Commercial Telemetry Overview
// ============================================================================
router.get('/overview', getMarketplaceCompetitiveOverview);

// ============================================================================
// 1. Dual-Token Physical + EPR Credit Bundles
// ============================================================================
router.post('/bundles', createEprTokenBundle);
router.get('/bundles', listEprTokenBundles);
router.get('/bundles/verify/:hash', verifyBundleCertificateHash);

// ============================================================================
// 2. Pre-Auction Quality Intake Assays
// ============================================================================
router.post('/assays', createQualityIntakeAssay);
router.get('/assays/listing/:listing_id', getQualityAssayByListing);

// ============================================================================
// 3. Recycler Trade Credit (14/30-Day Working Capital)
// ============================================================================
router.post('/credits', issueRecyclerTradeCredit);
router.get('/credits/recycler/:recycler_id', getRecyclerCreditLedger);
router.post('/credits/:credit_id/settle', settleRecyclerTradeCredit);

// ============================================================================
// 4. Subscription Forward Supply Contracts
// ============================================================================
router.post('/contracts', createForwardContract);
router.get('/contracts', listForwardContracts);
router.patch('/contracts/:id/status', updateForwardContractStatus);

// ============================================================================
// 5. Digital Form-6 Transport Manifests
// ============================================================================
router.post('/manifests', createTransportManifest);
router.get('/manifests/:id', getTransportManifestById);
router.patch('/manifests/:id/status', updateTransportManifestStatus);

export default router;
