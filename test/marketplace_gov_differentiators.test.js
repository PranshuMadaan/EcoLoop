import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

// Helper to make mock requests against Express app
const makeRequest = async (method, path, body = null) => {
  const url = `http://localhost:5000${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  // Use Node 18+ built-in fetch with the app via an ephemeral server or direct handler
  const { createServer } = await import('http');
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, options);
    const json = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, body: json };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

describe('B2B Scrap Marketplace - 5 Commercial Differentiators Test Suite', () => {
  const SEED_LISTING_ID = '44444444-4444-4444-4444-444444444401';
  const SEED_RECYCLER_ID = '33333333-3333-3333-3333-333333333303'; // Ganesha Ecosphere
  const SEED_DWCC_ID = '22222222-2222-2222-2222-222222222201'; // MCD Dwarka

  // --------------------------------------------------------------------------
  // Overview Telemetry
  // --------------------------------------------------------------------------
  it('GET /api/v1/marketplace/overview should return metrics for all 5 differentiators', async () => {
    const res = await makeRequest('GET', '/api/v1/marketplace/overview');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.upgrades.dual_token_bundles);
    assert.ok(res.body.data.upgrades.quality_intake_assays);
    assert.ok(res.body.data.upgrades.recycler_trade_credits);
    assert.ok(res.body.data.upgrades.forward_supply_contracts);
    assert.ok(res.body.data.upgrades.digital_transport_manifests);
  });

  // --------------------------------------------------------------------------
  // Pillar 1: Dual-Token Physical + EPR Credit Bundling
  // --------------------------------------------------------------------------
  describe('1. Dual-Token Physical + EPR Credit Bundles', () => {
    let createdHash = null;

    it('POST /api/v1/marketplace/bundles should mint a dual-token bundle with SHA-256 certificate hash', async () => {
      const payload = {
        listing_id: SEED_LISTING_ID,
        recycler_id: SEED_RECYCLER_ID,
        plastic_processor_id: 'CPCB-PWP-2026-TEST-999',
        gst_transaction_id: 'GSTIN-07AAAA1111A1Z1-EWAY-TEST-001',
        physical_weight_kg: 5000.0,
        material_category: 'CAT_I_RIGID',
      };

      const res = await makeRequest('POST', '/api/v1/marketplace/bundles', payload);
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.plastic_processor_id, 'CPCB-PWP-2026-TEST-999');
      assert.equal(res.body.data.cpcb_certificate_hash.length, 64);
      createdHash = res.body.data.cpcb_certificate_hash;
    });

    it('POST /api/v1/marketplace/bundles should reject invalid material_category with 400', async () => {
      const payload = {
        listing_id: SEED_LISTING_ID,
        recycler_id: SEED_RECYCLER_ID,
        plastic_processor_id: 'CPCB-PWP-2026-TEST-999',
        gst_transaction_id: 'GSTIN-07AAAA1111A1Z1-EWAY-TEST-001',
        physical_weight_kg: 5000.0,
        material_category: 'INVALID_CATEGORY',
      };

      const res = await makeRequest('POST', '/api/v1/marketplace/bundles', payload);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('GET /api/v1/marketplace/bundles should list dual-token bundles with joined details', async () => {
      const res = await makeRequest('GET', `/api/v1/marketplace/bundles?recycler_id=${SEED_RECYCLER_ID}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
    });

    it('GET /api/v1/marketplace/bundles/verify/:hash should return verified=true for authentic certificate', async () => {
      const hashToVerify = createdHash || '4f8a1e2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f';
      const res = await makeRequest('GET', `/api/v1/marketplace/bundles/verify/${hashToVerify}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.verified, true);
      assert.equal(res.body.data.cpcb_certificate_hash, hashToVerify);
    });

    it('GET /api/v1/marketplace/bundles/verify/:hash with unseeded hash should return 404', async () => {
      const fakeHash = '0000000000000000000000000000000000000000000000000000000000000000';
      const res = await makeRequest('GET', `/api/v1/marketplace/bundles/verify/${fakeHash}`);
      assert.equal(res.status, 404);
      assert.equal(res.body.verified, false);
    });
  });

  // --------------------------------------------------------------------------
  // Pillar 2: Pre-Auction Quality Intake Assays
  // --------------------------------------------------------------------------
  describe('2. Pre-Auction Quality Intake Assays', () => {
    it('POST /api/v1/marketplace/assays should log verified weight, purity, and compute net deductions', async () => {
      const payload = {
        listing_id: SEED_LISTING_ID,
        inspector_id: SEED_DWCC_ID,
        declared_weight_kg: 10000.0,
        verified_weight_kg: 9950.0,
        measured_purity_pct: 92.5,
        moisture_deduction_kg: 150.0,
        inspection_notes: 'Automated gravimetric weighbridge + optical infrared NIR polymer scan.',
      };

      const res = await makeRequest('POST', '/api/v1/marketplace/assays', payload);
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(Number(res.body.data.verified_weight_kg), 9950.0);
      assert.equal(Number(res.body.data.measured_purity_pct), 92.5);
      assert.equal(res.body.data.net_effective_weight_kg, 9800.0); // 9950 - 150
      assert.ok(Number(res.body.data.final_payable_amount_inr) > 0);
    });

    it('GET /api/v1/marketplace/assays/listing/:listing_id should return assay reports for listing', async () => {
      const res = await makeRequest('GET', `/api/v1/marketplace/assays/listing/${SEED_LISTING_ID}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
    });
  });

  // --------------------------------------------------------------------------
  // Pillar 3: Recycler Trade Credit & Invoices (14/30-Day Terms)
  // --------------------------------------------------------------------------
  describe('3. Recycler Trade Credit (14/30-Day Working Capital)', () => {
    let creditId = null;

    it('POST /api/v1/marketplace/credits should issue 14-day trade credit with auto-calculated due date', async () => {
      const payload = {
        recycler_id: SEED_RECYCLER_ID,
        listing_id: SEED_LISTING_ID,
        invoice_amount_inr: 250000.0,
        credit_period_days: 14,
      };

      const res = await makeRequest('POST', '/api/v1/marketplace/credits', payload);
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.credit_period_days, 14);
      assert.equal(res.body.data.payment_status, 'PENDING');
      creditId = res.body.data.credit_id;
    });

    it('POST /api/v1/marketplace/credits should reject invalid credit period days with 400', async () => {
      const payload = {
        recycler_id: SEED_RECYCLER_ID,
        listing_id: SEED_LISTING_ID,
        invoice_amount_inr: 100000.0,
        credit_period_days: 45, // Only 14 or 30 allowed
      };

      const res = await makeRequest('POST', '/api/v1/marketplace/credits', payload);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('GET /api/v1/marketplace/credits/recycler/:recycler_id should return credit facility and utilization %', async () => {
      const res = await makeRequest('GET', `/api/v1/marketplace/credits/recycler/${SEED_RECYCLER_ID}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.credit_summary.total_outstanding_inr > 0);
      assert.ok(res.body.credit_summary.credit_limit_ceiling_inr >= 5000000.0);
    });

    it('POST /api/v1/marketplace/credits/:credit_id/settle should settle invoice and mark as PAID', async () => {
      assert.ok(creditId);
      const res = await makeRequest('POST', `/api/v1/marketplace/credits/${creditId}/settle`, {
        payment_reference: 'UTR-BANK-SETTLE-2026',
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.payment_status, 'PAID');
    });
  });

  // --------------------------------------------------------------------------
  // Pillar 4: Subscription Forward Supply Contracts
  // --------------------------------------------------------------------------
  describe('4. Subscription Forward Supply Contracts', () => {
    let contractId = null;

    it('POST /api/v1/marketplace/contracts should create forward contract with floor-cap price collar', async () => {
      const payload = {
        recycler_id: SEED_RECYCLER_ID,
        dwcc_hub_id: SEED_DWCC_ID,
        material_grade: 'PET_CLEAR',
        monthly_committed_tonnes: 40.0,
        agreed_floor_price_per_kg: 30.0,
        agreed_cap_price_per_kg: 40.0,
        start_date: '2026-11-01',
        end_date: '2027-04-30',
      };

      const res = await makeRequest('POST', '/api/v1/marketplace/contracts', payload);
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(Number(res.body.data.monthly_committed_tonnes), 40.0);
      assert.equal(res.body.data.contract_status, 'ACTIVE');
      contractId = res.body.data.contract_id;
    });

    it('POST /api/v1/marketplace/contracts should reject floor price >= cap price with 400', async () => {
      const payload = {
        recycler_id: SEED_RECYCLER_ID,
        dwcc_hub_id: SEED_DWCC_ID,
        material_grade: 'PET_CLEAR',
        monthly_committed_tonnes: 40.0,
        agreed_floor_price_per_kg: 45.0, // Invalid: floor > cap
        agreed_cap_price_per_kg: 35.0,
        start_date: '2026-11-01',
        end_date: '2027-04-30',
      };

      const res = await makeRequest('POST', '/api/v1/marketplace/contracts', payload);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('GET /api/v1/marketplace/contracts should list bilateral recurring contracts', async () => {
      const res = await makeRequest('GET', '/api/v1/marketplace/contracts');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
    });

    it('PATCH /api/v1/marketplace/contracts/:id/status should update contract status to PAUSED', async () => {
      assert.ok(contractId);
      const res = await makeRequest('PATCH', `/api/v1/marketplace/contracts/${contractId}/status`, {
        contract_status: 'PAUSED',
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.contract_status, 'PAUSED');
    });
  });

  // --------------------------------------------------------------------------
  // Pillar 5: Digital Form-6 Transport Manifests (SRO Synergy)
  // --------------------------------------------------------------------------
  describe('5. Digital Form-6 Transport Manifests', () => {
    let manifestId = null;

    it('POST /api/v1/marketplace/manifests should issue digital Form-6 manifest with SHA-256 hash', async () => {
      const payload = {
        listing_id: SEED_LISTING_ID,
        carrier_vehicle_number: 'KA-01-MJ-9921',
        driver_mobile: '+919876543299',
        origin_address: 'MCD Dwarka Sector 14 MRF Hub, New Delhi',
        destination_facility: 'Ganesha Ecosphere Recycling Terminal, Greater Noida',
      };

      const res = await makeRequest('POST', '/api/v1/marketplace/manifests', payload);
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.form6_manifest_hash.length, 64);
      assert.equal(res.body.data.dispatch_status, 'IN_TRANSIT');
      manifestId = res.body.data.manifest_id;
    });

    it('GET /api/v1/marketplace/manifests/:id should return manifest details with QR payload', async () => {
      assert.ok(manifestId);
      const res = await makeRequest('GET', `/api/v1/marketplace/manifests/${manifestId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.manifest_id, manifestId);
      assert.equal(res.body.data.carrier_vehicle_number, 'KA-01-MJ-9921');
    });

    it('PATCH /api/v1/marketplace/manifests/:id/status should update status to DELIVERED', async () => {
      assert.ok(manifestId);
      const res = await makeRequest('PATCH', `/api/v1/marketplace/manifests/${manifestId}/status`, {
        dispatch_status: 'DELIVERED',
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.dispatch_status, 'DELIVERED');
    });
  });
});
