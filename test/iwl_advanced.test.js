import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { pool, query } from '../src/config/db.js';

describe('IWL Advanced Engine Test Suite (Voice AI, Transactions, UPI Payouts & Ledger)', () => {
  let server;
  let baseUrl;
  let seededWorkerId;
  let pendingWeighInId;

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app).listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Fetch existing seeded worker (Ramesh Kumar or first available)
    const workerRes = await query(`
      SELECT wp.worker_id, u.mobile_number, u.upi_vpa
      FROM worker_profiles wp
      JOIN users u ON wp.user_id = u.user_id
      ORDER BY wp.created_at ASC
      LIMIT 1;
    `);

    assert.ok(workerRes.rows.length > 0, 'Seed workers must exist');
    seededWorkerId = workerRes.rows[0].worker_id;

    // Fetch a user for dwcc_hub_id
    const hubRes = await query(`SELECT user_id FROM users LIMIT 1;`);
    const dwccHubId = hubRes.rows[0].user_id;

    // Create a fresh PENDING weigh-in for testing the instant payout transaction
    const newWeighIn = await query(`
      INSERT INTO worker_weigh_ins (
        worker_id,
        dwcc_hub_id,
        material_grade,
        gross_weight_kg,
        tare_weight_kg,
        net_weight_kg,
        applied_rate_per_kg,
        total_payable_inr,
        payout_status
      ) VALUES ($1, $2, 'PET_CLEAR', 50.00, 5.00, 45.00, 22.00, 990.00, 'PENDING')
      RETURNING weigh_in_id;
    `, [seededWorkerId, dwccHubId]);

    pendingWeighInId = newWeighIn.rows[0].weigh_in_id;
  });

  after(async () => {
    // Cleanup created test weigh-ins and payouts
    if (pendingWeighInId) {
      await query(`DELETE FROM worker_payout_transactions WHERE weigh_in_id = $1;`, [pendingWeighInId]);
      await query(`DELETE FROM worker_weigh_ins WHERE weigh_in_id = $1;`, [pendingWeighInId]);
    }
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
  // 1. WhatsApp Voice Webhook & Benchmark Rates
  // ==========================================================================
  describe('1. WhatsApp Voice Webhook & Benchmark Rates', () => {
    it('GET /api/v1/iwl/rates should return fair benchmark scrap prices', async () => {
      const res = await apiRequest('/api/v1/iwl/rates');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.rates));
      const pet = res.body.data.rates.find((r) => r.material_grade === 'PET_CLEAR');
      assert.ok(pet);
      assert.ok(pet.rate_per_kg_inr >= 20);
    });

    it('POST /api/v1/iwl/whatsapp/voice-webhook should parse simulated voice note for registered worker', async () => {
      const res = await apiRequest('/api/v1/iwl/whatsapp/voice-webhook', {
        method: 'POST',
        body: {
          from_mobile_number: '+919876543210', // Ramesh Kumar
          audio_url: 'https://cdn.whatsapp.com/audio/mock_note_01.ogg',
          simulated_transcript: '25 kilo PET plastic',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.worker);
      assert.equal(res.body.data.worker.is_registered, true);
      assert.equal(res.body.data.stt_result.material_grade, 'PET_CLEAR');
      assert.equal(res.body.data.stt_result.estimated_weight_kg, 25);
      assert.equal(res.body.data.rate_lookup.benchmark_rate_per_kg, 22);
      assert.equal(res.body.data.rate_lookup.estimated_total_inr, 550);
      assert.ok(res.body.data.whatsapp_reply.includes('550'));
      assert.ok(res.body.data.nearest_dwcc_hub.name);
    });

    it('POST /api/v1/iwl/whatsapp/voice-webhook should handle regional language voice text in Hindi', async () => {
      const res = await apiRequest('/api/v1/iwl/whatsapp/voice-webhook', {
        method: 'POST',
        body: {
          from_mobile_number: '+919876543211', // Sunita Devi (hi)
          audio_url: 'https://cdn.whatsapp.com/audio/mock_hindi.ogg',
          simulated_transcript: '30 किलो गत्ता कागज',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.stt_result.material_grade, 'CORRUGATED_CARDBOARD');
      assert.equal(res.body.data.stt_result.estimated_weight_kg, 30);
      assert.equal(res.body.data.rate_lookup.estimated_total_inr, 360);
      assert.ok(res.body.data.whatsapp_reply.includes('नमस्ते'));
    });

    it('POST /api/v1/iwl/whatsapp/voice-webhook should support guest / unregistered number with default fallback', async () => {
      const res = await apiRequest('/api/v1/iwl/whatsapp/voice-webhook', {
        method: 'POST',
        body: {
          from_mobile_number: '+919999999999',
          audio_url: 'https://cdn.whatsapp.com/audio/mock_guest.ogg',
          simulated_transcript: '15 kg metal iron',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.worker.is_registered, false);
      assert.equal(res.body.data.stt_result.material_grade, 'FERROUS_METAL');
      assert.equal(res.body.data.rate_lookup.estimated_total_inr, 480);
    });

    it('POST /api/v1/iwl/whatsapp/voice-webhook should reject missing audio_url or from_mobile_number', async () => {
      const res = await apiRequest('/api/v1/iwl/whatsapp/voice-webhook', {
        method: 'POST',
        body: {},
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  // ==========================================================================
  // 2. Concurrency-Safe Instant UPI Spot Payout
  // ==========================================================================
  describe('2. Concurrency-Safe Instant UPI Spot Payout', () => {
    it('POST /api/v1/iwl/payout/instant should atomically process instant UPI payout with UTR and Razorpay ID', async () => {
      const res = await apiRequest('/api/v1/iwl/payout/instant', {
        method: 'POST',
        body: {
          weigh_in_id: pendingWeighInId,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.weigh_in_id, pendingWeighInId);
      assert.equal(res.body.data.transaction.amount_inr, 990);
      assert.ok(res.body.data.transaction.razorpay_payout_id.startsWith('pout_mock_iwl_'));
      assert.ok(res.body.data.transaction.utr_number.length === 12);
      assert.equal(res.body.data.transaction.transaction_status, 'PROCESSED');

      // Verify DB state was updated to PAID
      const checkRes = await query(`SELECT payout_status FROM worker_weigh_ins WHERE weigh_in_id = $1;`, [pendingWeighInId]);
      assert.equal(checkRes.rows[0].payout_status, 'PAID');
    });

    it('POST /api/v1/iwl/payout/instant should reject second payout attempt with 409 Conflict', async () => {
      const res = await apiRequest('/api/v1/iwl/payout/instant', {
        method: 'POST',
        body: {
          weigh_in_id: pendingWeighInId,
        },
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('already \'PAID\''));
    });

    it('POST /api/v1/iwl/payout/instant should validate UUID format', async () => {
      const res = await apiRequest('/api/v1/iwl/payout/instant', {
        method: 'POST',
        body: {
          weigh_in_id: 'non-uuid-string',
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  // ==========================================================================
  // 3. Worker Earnings & Impact Ledger
  // ==========================================================================
  describe('3. Worker Earnings & Impact Ledger', () => {
    it('GET /api/v1/iwl/worker/:id/ledger should return comprehensive lifetime, monthly, CO2 offsets and receipts', async () => {
      const res = await apiRequest(`/api/v1/iwl/worker/${seededWorkerId}/ledger`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.worker.full_name);
      assert.ok(res.body.data.worker.qr_code_hash);

      // Lifetime & Financial metrics
      assert.ok(typeof res.body.data.lifetime_impact.total_earnings_inr === 'number');
      assert.ok(typeof res.body.data.lifetime_impact.total_paid_inr === 'number');
      assert.ok(res.body.data.lifetime_impact.total_weight_kg > 0);
      assert.ok(res.body.data.lifetime_impact.total_weight_mt >= 0);

      // Environmental Carbon Impact (EPA WARM model)
      assert.ok(res.body.data.lifetime_impact.estimated_co2_offset_kg > 0);
      assert.ok(res.body.data.lifetime_impact.equivalent_trees_planted >= 0);

      // Current month, material breakdown & recent payouts
      assert.ok(res.body.data.current_month);
      assert.ok(Array.isArray(res.body.data.material_breakdown));
      assert.ok(Array.isArray(res.body.data.recent_payout_receipts));
      assert.ok(Array.isArray(res.body.data.monthly_trend));
    });

    it('GET /api/v1/iwl/worker/:id/ledger with invalid UUID should return 400', async () => {
      const res = await apiRequest('/api/v1/iwl/worker/not-a-valid-uuid/ledger');
      assert.equal(res.status, 400);
    });

    it('GET /api/v1/iwl/worker/:id/ledger with non-existent worker should return 404', async () => {
      const res = await apiRequest('/api/v1/iwl/worker/00000000-0000-0000-0000-000000000000/ledger');
      assert.equal(res.status, 404);
    });
  });
});
