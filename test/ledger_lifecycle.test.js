import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { getMyPayouts, listAllPayouts, getPayoutsForListing, reversePayout } from '../src/controllers/payoutController.js';
import { confirmDeposit, getDepositByReference } from '../src/controllers/depositController.js';
import { generateCpcbHash } from '../src/controllers/auctionController.js';
import { AppError } from '../src/middleware/errorHandler.js';

process.env.EPR_HASH_SECRET = process.env.EPR_HASH_SECRET || 'ecoloop_test_epr_hash_secret';

describe('Ledger Lifecycle: Payout Reads, Deposits & Reversal Guard Rails', () => {
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
  });

  async function apiRequest(endpoint, options = {}) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const body = await res.json();
    return { status: res.status, body };
  }

  /**
   * Invoke a controller directly so validation branches run without Postgres
   * (the repo's test convention is DB-free: no test may require a live DB).
   */
  async function captureControllerError(controller, req) {
    let capturedError = null;
    await controller(req, {}, (err) => {
      capturedError = err;
    });
    return capturedError;
  }

  describe('1. Ledger endpoints require authentication', () => {
    it('GET /api/v1/payouts should reject unauthenticated requests with 401', async () => {
      const res = await apiRequest('/api/v1/payouts');
      assert.equal(res.status, 401);
      assert.match(res.body.error, /Authentication required/);
    });

    it('GET /api/v1/payouts/all should reject unauthenticated requests with 401', async () => {
      const res = await apiRequest('/api/v1/payouts/all');
      assert.equal(res.status, 401);
      assert.match(res.body.error, /Authentication required/);
    });

    it('GET /api/v1/payouts/listing/:id should reject unauthenticated requests with 401', async () => {
      const res = await apiRequest('/api/v1/payouts/listing/44444444-4444-4444-4444-444444444404');
      assert.equal(res.status, 401);
      assert.match(res.body.error, /Authentication required/);
    });

    it('POST /api/v1/payouts/:id/reverse should reject unauthenticated requests with 401', async () => {
      const res = await apiRequest('/api/v1/payouts/66666666-6666-6666-6666-666666666601/reverse', {
        method: 'POST',
        body: {},
      });
      assert.equal(res.status, 401);
      assert.match(res.body.error, /Authentication required/);
    });

    it('POST /api/v1/deposits/:reference/confirm should reject unauthenticated requests with 401', async () => {
      const res = await apiRequest('/api/v1/deposits/ECOPREFTEST123/confirm', { method: 'POST', body: {} });
      assert.equal(res.status, 401);
      assert.match(res.body.error, /Authentication required/);
    });
  });

  describe('2. Payout ledger validation branches', () => {
    it('getMyPayouts should reject invalid status filter with 400', async () => {
      const err = await captureControllerError(getMyPayouts, {
        user: { user_id: '22222222-2222-2222-2222-222222222201' },
        query: { status: 'HACKED' },
      });
      assert.ok(err instanceof AppError);
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Invalid status filter/);
    });

    it('listAllPayouts should reject invalid status filter with 400', async () => {
      const err = await captureControllerError(listAllPayouts, {
        user: { user_id: '22222222-2222-2222-2222-222222222210', role: 'ULB' },
        query: { status: 'DOUBLE_SPEND' },
      });
      assert.ok(err instanceof AppError);
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Invalid status filter/);
    });

    it('listAllPayouts should reject non-UUID seller_id filter with 400', async () => {
      const err = await captureControllerError(listAllPayouts, {
        user: { user_id: '22222222-2222-2222-2222-222222222210', role: 'ULB' },
        query: { seller_id: 'not-a-uuid' },
      });
      assert.ok(err instanceof AppError);
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /valid UUID/);
    });

    it('getPayoutsForListing should reject malformed listing UUID with 400', async () => {
      const err = await captureControllerError(getPayoutsForListing, {
        user: { user_id: '22222222-2222-2222-2222-222222222201', role: 'DWCC' },
        params: { listing_id: 'garbage' },
      });
      assert.ok(err instanceof AppError);
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /valid UUID/);
    });

    it('reversePayout should reject malformed payout UUID with 400', async () => {
      const err = await captureControllerError(reversePayout, {
        user: { user_id: '22222222-2222-2222-2222-222222222210', role: 'ULB' },
        params: { payout_id: 'nope' },
      });
      assert.ok(err instanceof AppError);
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /valid UUID/);
    });
  });

  describe('3. Escrow deposit validation branches', () => {
    it('confirmDeposit should reject missing/short reference with 400', async () => {
      const err = await captureControllerError(confirmDeposit, {
        user: { user_id: '33333333-3333-3333-3333-333333333301', role: 'Recycler' },
        params: { reference: 'AB' },
      });
      assert.ok(err instanceof AppError);
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /valid deposit reference/);
    });

    it('getDepositByReference should reject missing/short reference with 400', async () => {
      const err = await captureControllerError(getDepositByReference, {
        user: { user_id: '33333333-3333-3333-3333-333333333301', role: 'Recycler' },
        params: { reference: '' },
      });
      assert.ok(err instanceof AppError);
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /valid deposit reference/);
    });
  });

  describe('4. CPCB hash secret governance', () => {
    it('generateCpcbHash should refuse to mint when EPR_HASH_SECRET is not configured', async () => {
      const originalSecret = process.env.EPR_HASH_SECRET;
      delete process.env.EPR_HASH_SECRET;
      try {
        assert.throws(
          () =>
            generateCpcbHash({
              listingId: '44444444-4444-4444-4444-444444444401',
              recyclerId: '33333333-3333-3333-3333-333333333301',
              materialGrade: 'PET',
              weightMt: '1.250',
              timestamp: '2026-10-24T10:00:00.000Z',
            }),
          (err) => err instanceof AppError && err.statusCode === 500 && /EPR_HASH_SECRET/.test(err.message)
        );
      } finally {
        process.env.EPR_HASH_SECRET = originalSecret;
      }
    });
  });
});
