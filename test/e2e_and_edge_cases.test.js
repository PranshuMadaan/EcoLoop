import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { query } from '../src/config/db.js';

describe('Comprehensive EcoLoop API Test Suite & Bug Hunting', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Start Express app on an ephemeral port for testing
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
  });

  // Helper for making JSON HTTP requests
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

  describe('1. HTTP Routing & Standard Error Envelope Tests', () => {
    it('GET / should return 200 with API welcome info', async () => {
      const res = await apiRequest('/');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.message.includes('EcoLoop'));
    });

    it('GET /health should return structured JSON even if DB is offline', async () => {
      const res = await apiRequest('/health');
      // DB may be offline (503) or online (200), but format must conform to contract
      assert.ok([200, 503].includes(res.status));
      assert.equal(typeof res.body.success, 'boolean');
      if (res.body.success) {
        assert.equal(res.body.data.database.status, 'UP');
      } else {
        assert.equal(res.body.data.database.status, 'DOWN');
      }
    });

    it('GET /non-existent-route should return 404 with standard error contract', async () => {
      const res = await apiRequest('/api/v1/invalid-path-endpoint');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Endpoint.*not found/);
    });

    it('POST with malformed JSON body should return 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid_json_format',
      });
      assert.equal(res.status, 400);
    });
  });

  describe('2. User Route Parameter Validation & Security Tests', () => {
    it('POST /api/v1/users with invalid role should reject with 400', async () => {
      const res = await apiRequest('/api/v1/users', {
        method: 'POST',
        body: { role: 'SuperAdmin', mobile_number: '+919876543210' },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Allowed roles/);
    });

    it('POST /api/v1/users with SQL injection attempt in role should fail cleanly', async () => {
      const res = await apiRequest('/api/v1/users', {
        method: 'POST',
        body: { role: "Picker'; DROP TABLE users; --", mobile_number: '+919876543210' },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('POST /api/v1/users with blank or missing mobile number should reject with 400', async () => {
      const res = await apiRequest('/api/v1/users', {
        method: 'POST',
        body: { role: 'Picker', mobile_number: '   ' },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /mobile_number is required/);
    });

    it('GET /api/v1/users/:id with non-UUID should return 400', async () => {
      const res = await apiRequest('/api/v1/users/admin-1234');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /valid UUID/);
    });

    it('GET /api/v1/users with invalid role filter should return 400', async () => {
      const res = await apiRequest('/api/v1/users?role=InvalidRole');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Invalid role filter/);
    });
  });

  describe('3. Scrap Listing Parameter Validation & Security Tests', () => {
    it('POST /api/v1/listings with missing seller_id should return 400', async () => {
      const res = await apiRequest('/api/v1/listings', {
        method: 'POST',
        body: {
          material_grade: 'PET',
          weight_kg: 100,
          min_price: 3000,
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /seller_id/);
    });

    it('POST /api/v1/listings with empty material_grade should return 400', async () => {
      const res = await apiRequest('/api/v1/listings', {
        method: 'POST',
        body: {
          seller_id: '11111111-1111-1111-1111-111111111101',
          material_grade: '   ',
          weight_kg: 50,
          min_price: 1500,
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /material_grade is required/);
    });

    it('POST /api/v1/listings with NaN or negative weight_kg should return 400', async () => {
      const res = await apiRequest('/api/v1/listings', {
        method: 'POST',
        body: {
          seller_id: '11111111-1111-1111-1111-111111111101',
          material_grade: 'PET',
          weight_kg: 'not-a-number',
          min_price: 1500,
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /positive numeric value/);
    });

    it('POST /api/v1/listings with negative min_price should return 400', async () => {
      const res = await apiRequest('/api/v1/listings', {
        method: 'POST',
        body: {
          seller_id: '11111111-1111-1111-1111-111111111101',
          material_grade: 'HDPE',
          weight_kg: 50,
          min_price: -100,
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /non-negative numeric/);
    });

    it('GET /api/v1/listings with invalid status filter should return 400', async () => {
      const res = await apiRequest('/api/v1/listings?status=HACKED_STATUS');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Invalid status filter/);
    });

    it('GET /api/v1/listings/:id with malformed UUID should return 400', async () => {
      const res = await apiRequest('/api/v1/listings/abc-invalid-id');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /valid UUID/);
    });
  });

  describe('4. Bids Route Parameter Validation Tests', () => {
    it('POST /api/v1/listings/:id/bids with invalid listing_id should return 400', async () => {
      const res = await apiRequest('/api/v1/listings/bad-listing-uuid/bids', {
        method: 'POST',
        body: {
          bidder_id: '33333333-3333-3333-3333-333333333301',
          bid_amount: 50000,
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /valid UUID/);
    });

    it('POST /api/v1/listings/:id/bids with invalid bidder_id format should return 400', async () => {
      const res = await apiRequest('/api/v1/listings/44444444-4444-4444-4444-444444444401/bids', {
        method: 'POST',
        body: {
          bidder_id: 'not-a-valid-uuid',
          bid_amount: 50000,
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /valid bidder_id/);
    });

    it('POST /api/v1/listings/:id/bids with non-positive bid_amount should return 400', async () => {
      const res = await apiRequest('/api/v1/listings/44444444-4444-4444-4444-444444444401/bids', {
        method: 'POST',
        body: {
          bidder_id: '33333333-3333-3333-3333-333333333301',
          bid_amount: -500,
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /positive numeric value/);
    });

    it('GET /api/v1/listings/:id/bids with invalid listing_id should return 400', async () => {
      const res = await apiRequest('/api/v1/listings/not-a-uuid/bids');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /valid UUID/);
    });
  });
});
