import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { pool, query } from '../src/config/db.js';

describe('Informal Worker Digital Ledger (IWL / IWF Module) Test Suite', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app).listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  });

  async function apiRequest(endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const res = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const body = await res.json();
    return { status: res.status, body };
  }

  // ==========================================================================
  // 1. Worker Profile Management Tests
  // ==========================================================================
  describe('1. Worker Profile Management Endpoints', () => {
    it('GET /api/v1/workers should return seeded worker profiles with joined user details and metrics', async () => {
      const res = await apiRequest('/api/v1/workers');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.total >= 4);
      assert.ok(Array.isArray(res.body.data.workers));

      const ramesh = res.body.data.workers.find((w) => w.full_name === 'Ramesh Kumar');
      assert.ok(ramesh, 'Ramesh Kumar should be present in seeded workers');
      assert.equal(ramesh.preferred_language, 'kn');
      assert.equal(ramesh.cooperative_affiliation, 'Hasiru Dala');
      assert.equal(ramesh.user.upi_vpa, 'ramesh.waste@upi');
      assert.ok(ramesh.metrics.total_weigh_ins >= 2);
    });

    it('GET /api/v1/workers should filter by cooperative affiliation', async () => {
      const res = await apiRequest('/api/v1/workers?cooperative=SWaCH');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.workers.length >= 1);
      assert.ok(res.body.data.workers.every((w) => w.cooperative_affiliation.includes('SWaCH')));
    });

    it('GET /api/v1/workers should filter by preferred language', async () => {
      const res = await apiRequest('/api/v1/workers?language=hi');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.workers.every((w) => w.preferred_language === 'hi'));
    });

    it('GET /api/v1/workers/:id should return single worker profile by UUID', async () => {
      const res = await apiRequest('/api/v1/workers/77777777-7777-7777-7777-777777777701');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.full_name, 'Ramesh Kumar');
      assert.equal(res.body.data.municipal_id_number, 'BBMP-WP-2023-04812');
      assert.equal(res.body.data.user.mobile_number, '+919876543210');
      assert.ok(res.body.data.metrics.total_net_weight_kg > 0);
    });

    it('GET /api/v1/workers/:id with malformed UUID should reject with 400', async () => {
      const res = await apiRequest('/api/v1/workers/invalid-worker-uuid');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /UUID/i);
    });

    it('GET /api/v1/workers/:id with non-existent UUID should return 404', async () => {
      const res = await apiRequest('/api/v1/workers/00000000-0000-0000-0000-000000000000');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    it('GET /api/v1/workers/qr/:qr_code_hash should perform instant DWCC kiosk lookup', async () => {
      const res = await apiRequest('/api/v1/workers/qr/IWL-QR-777701-BLR-RAMESH-2026');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.full_name, 'Ramesh Kumar');
      assert.equal(res.body.data.payout_ready, true);
    });

    it('GET /api/v1/workers/qr/:qr_code_hash with invalid hash should return 404', async () => {
      const res = await apiRequest('/api/v1/workers/qr/UNKNOWN-QR-HASH-999');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    it('POST /api/v1/workers should create new profile and auto-generate QR code hash', async () => {
      // Create fresh user in Neon DB for testing worker profile registration
      const testMobile = `+9198${Date.now().toString().slice(-8)}`;
      const userRes = await query(
        `INSERT INTO users (role, mobile_number, password_hash, organization_name, upi_vpa)
         VALUES ('Picker', $1, 'hashed_pass_test', 'Chintan Delhi SHG', 'test.worker@upi')
         RETURNING user_id;`,
        [testMobile]
      );
      const newUserId = userRes.rows[0].user_id;

      const res = await apiRequest('/api/v1/workers', {
        method: 'POST',
        body: {
          user_id: newUserId,
          full_name: 'Bablu Yadav',
          preferred_language: 'hi',
          municipal_id_number: `MCD-WP-${Date.now().toString().slice(-6)}`,
          cooperative_affiliation: 'Chintan',
          kyc_status: 'VERIFIED',
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.full_name, 'Bablu Yadav');
      assert.equal(res.body.data.preferred_language, 'hi');
      assert.ok(res.body.data.qr_code_hash.startsWith('IWL-QR-'));

      // Re-registering profile for the same user_id should trigger 409 Conflict
      const dupRes = await apiRequest('/api/v1/workers', {
        method: 'POST',
        body: {
          user_id: newUserId,
          full_name: 'Bablu Duplicate',
        },
      });
      assert.equal(dupRes.status, 409);
      assert.equal(dupRes.body.success, false);
    });

    it('POST /api/v1/workers should reject invalid language code with 400', async () => {
      const res = await apiRequest('/api/v1/workers', {
        method: 'POST',
        body: {
          user_id: '11111111-1111-1111-1111-111111111101',
          full_name: 'Test Name',
          preferred_language: 'fr', // French is not in allowed Indian languages
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /preferred_language/i);
    });

    it('PATCH /api/v1/workers/:id should update profile fields', async () => {
      const res = await apiRequest('/api/v1/workers/77777777-7777-7777-7777-777777777704', {
        method: 'PATCH',
        body: {
          preferred_language: 'mr',
          cooperative_affiliation: 'Hasiru Dala & SWaCH Allied',
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.preferred_language, 'mr');
      assert.equal(res.body.data.cooperative_affiliation, 'Hasiru Dala & SWaCH Allied');
    });
  });

  // ==========================================================================
  // 2. Daily Weigh-In Logging & Calculation Tests
  // ==========================================================================
  describe('2. Daily Weigh-In Logging & Payout Endpoints', () => {
    it('POST /api/v1/workers/weigh-ins should log weigh-in, accurately compute net weight and total payable', async () => {
      const res = await apiRequest('/api/v1/workers/weigh-ins', {
        method: 'POST',
        body: {
          worker_id: '77777777-7777-7777-7777-777777777701',
          dwcc_hub_id: '22222222-2222-2222-2222-222222222202', // BBMP Ward 150 Hub
          material_grade: 'HDPE',
          gross_weight_kg: 52.80,
          tare_weight_kg: 2.80,
          applied_rate_per_kg: 25.00,
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.material_grade, 'HDPE');
      assert.equal(res.body.data.gross_weight_kg, 52.80);
      assert.equal(res.body.data.tare_weight_kg, 2.80);
      assert.equal(res.body.data.net_weight_kg, 50.00); // 52.80 - 2.80 = 50.00 kg
      assert.equal(res.body.data.applied_rate_per_kg, 25.00);
      assert.equal(res.body.data.total_payable_inr, 1250.00); // 50.00 * 25.00 = 1250.00 INR
      assert.equal(res.body.data.payout_status, 'PENDING');
    });

    it('POST /api/v1/workers/weigh-ins should reject if gross_weight_kg <= tare_weight_kg', async () => {
      const res = await apiRequest('/api/v1/workers/weigh-ins', {
        method: 'POST',
        body: {
          worker_id: '77777777-7777-7777-7777-777777777701',
          dwcc_hub_id: '22222222-2222-2222-2222-222222222202',
          material_grade: 'PET',
          gross_weight_kg: 10.00,
          tare_weight_kg: 12.00, // tare exceeds gross!
          applied_rate_per_kg: 20.00,
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /exceed tare_weight_kg/i);
    });

    it('POST /api/v1/workers/weigh-ins should reject negative or zero weights', async () => {
      const res = await apiRequest('/api/v1/workers/weigh-ins', {
        method: 'POST',
        body: {
          worker_id: '77777777-7777-7777-7777-777777777701',
          dwcc_hub_id: '22222222-2222-2222-2222-222222222202',
          material_grade: 'PET',
          gross_weight_kg: -5.00,
          applied_rate_per_kg: 20.00,
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /positive number/i);
    });

    it('POST /api/v1/workers/weigh-ins with auto_payout=true should atomically record payout receipt', async () => {
      const res = await apiRequest('/api/v1/workers/weigh-ins', {
        method: 'POST',
        body: {
          worker_id: '77777777-7777-7777-7777-777777777701',
          dwcc_hub_id: '22222222-2222-2222-2222-222222222202',
          material_grade: 'Cardboard',
          gross_weight_kg: 35.00,
          tare_weight_kg: 1.00,
          applied_rate_per_kg: 15.00,
          auto_payout: true,
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.payout_status, 'PAID');
      assert.ok(res.body.data.payout_receipt);
      assert.equal(res.body.data.payout_receipt.amount_inr, 510.00); // 34 * 15 = 510.00
      assert.equal(res.body.data.payout_receipt.seller_upi_vpa, 'ramesh.waste@upi');
      assert.equal(res.body.data.payout_receipt.transaction_status, 'PROCESSED');
      assert.equal(res.body.data.payout_receipt.utr_number.length, 12);
    });

    it('GET /api/v1/workers/weigh-ins should return logs and aggregate summary totals', async () => {
      const res = await apiRequest('/api/v1/workers/weigh-ins?limit=10');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.total >= 5);
      assert.ok(res.body.data.total_weight_kg > 0);
      assert.ok(res.body.data.total_payable_inr > 0);
      assert.ok(Array.isArray(res.body.data.weigh_ins));
    });

    it('GET /api/v1/workers/weigh-ins should filter by payout_status', async () => {
      const res = await apiRequest('/api/v1/workers/weigh-ins?payout_status=PENDING');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.weigh_ins.every((w) => w.payout_status === 'PENDING'));
    });

    it('GET /api/v1/workers/weigh-ins/:id should return details with DWCC hub and receipt', async () => {
      const res = await apiRequest('/api/v1/workers/weigh-ins/88888888-8888-8888-8888-888888888801');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.material_grade, 'HDPE');
      assert.equal(res.body.data.payout_status, 'PAID');
      assert.ok(res.body.data.payout_receipt);
      assert.equal(res.body.data.payout_receipt.utr_number, '629849102941');
    });

    it('POST /api/v1/workers/weigh-ins/:id/payout should process instant UPI payout for pending weigh-in', async () => {
      // Create a fresh pending weigh-in for Lakshmi Bai
      const createRes = await apiRequest('/api/v1/workers/weigh-ins', {
        method: 'POST',
        body: {
          worker_id: '77777777-7777-7777-7777-777777777704',
          dwcc_hub_id: '22222222-2222-2222-2222-222222222202',
          material_grade: 'LDPE',
          gross_weight_kg: 26.50,
          tare_weight_kg: 1.50,
          applied_rate_per_kg: 16.00,
          auto_payout: false,
        },
      });
      assert.equal(createRes.status, 201);
      const pendingWeighInId = createRes.body.data.weigh_in_id;

      const res = await apiRequest(`/api/v1/workers/weigh-ins/${pendingWeighInId}/payout`, {
        method: 'POST',
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.amount_inr, 400.00);
      assert.equal(res.body.data.payee_vpa, 'lakshmi.waste@barodampay');
      assert.equal(res.body.data.transaction_status, 'PROCESSED');
      assert.equal(res.body.data.utr_number.length, 12);

      // Attempting to settle payout again should be rejected with 409 Conflict
      const retryRes = await apiRequest(`/api/v1/workers/weigh-ins/${pendingWeighInId}/payout`, {
        method: 'POST',
      });
      assert.equal(retryRes.status, 409);
      assert.equal(retryRes.body.success, false);
      assert.match(retryRes.body.error, /already been paid/i);
    });

    it('GET /api/v1/workers/:id/summary should return worker ledger metrics & material breakdown', async () => {
      const res = await apiRequest('/api/v1/workers/77777777-7777-7777-7777-777777777701/summary');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.worker.full_name, 'Ramesh Kumar');
      assert.ok(res.body.data.lifetime_stats.total_weigh_ins >= 2);
      assert.ok(res.body.data.lifetime_stats.total_net_weight_kg > 0);
      assert.ok(res.body.data.lifetime_stats.total_earned_inr > 0);
      assert.ok(Array.isArray(res.body.data.material_breakdown));
      assert.ok(Array.isArray(res.body.data.recent_weigh_ins));
    });
  });
});
