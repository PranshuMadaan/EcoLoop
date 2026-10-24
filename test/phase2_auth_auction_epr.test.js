import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { authenticate, authorizeRoles } from '../src/middleware/auth.js';
import { generateCpcbHash, executeUpiPayout } from '../src/controllers/auctionController.js';
import { AppError } from '../src/middleware/errorHandler.js';

describe('Phase 1.5 & Phase 2: Auth, Auction Concurrency, UPI & EPR Test Suite', () => {
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
    const url = `${baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const res = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const body = await res.json();
    return { status: res.status, headers: res.headers, body };
  }

  describe('1. Authentication Validation & Cookie Tests', () => {
    it('POST /api/v1/auth/register should reject missing or short password', async () => {
      const res = await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          role: 'Picker',
          mobile_number: '+919999999999',
          password: '123', // less than 6 chars
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /at least 6 characters/);
    });

    it('POST /api/v1/auth/register should reject invalid role', async () => {
      const res = await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          role: 'Customer',
          mobile_number: '+919999999999',
          password: 'SecurePassword@123',
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Allowed roles/);
    });

    it('POST /api/v1/auth/login should reject missing credentials', async () => {
      const res = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: { mobile_number: '+919876543210' }, // missing password
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Both mobile_number and password are required/);
    });

    it('POST /api/v1/auth/logout should clear cookie and return 200', async () => {
      const res = await apiRequest('/api/v1/auth/logout', { method: 'POST' });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.match(res.body.data.message, /Successfully logged out/);
    });

    it('GET /api/v1/auth/me should reject unauthenticated requests with 401', async () => {
      const res = await apiRequest('/api/v1/auth/me');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Authentication required/);
    });

    it('Authentication middleware should reject invalid JWT signature', async () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
      const req = {
        cookies: { token: fakeToken },
        headers: {},
      };
      let capturedError = null;

      await authenticate(req, {}, (err) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof AppError);
      assert.equal(capturedError.statusCode, 401);
      assert.match(capturedError.message, /Invalid authentication token/);
    });

    it('Role Guard (authorizeRoles) should reject unauthorized role with 403', () => {
      const guard = authorizeRoles('Recycler', 'ULB');
      const req = {
        user: { user_id: '11111111-1111-1111-1111-111111111101', role: 'Picker' },
      };
      let capturedError = null;

      guard(req, {}, (err) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof AppError);
      assert.equal(capturedError.statusCode, 403);
      assert.match(capturedError.message, /Forbidden.*Allowed roles: Recycler, ULB/);
    });
  });

  describe('2. Auction Finalization & Simulated UPI Payout Tests', () => {
    it('POST /api/v1/listings/:id/accept-bid should reject malformed listing UUID', async () => {
      const res = await apiRequest('/api/v1/listings/not-a-valid-uuid/accept-bid', {
        method: 'POST',
        body: { bid_id: '55555555-5555-5555-5555-555555555501' },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /valid UUID/);
    });

    it('POST /api/v1/listings/:id/accept-bid should reject malformed bid UUID', async () => {
      const res = await apiRequest('/api/v1/listings/44444444-4444-4444-4444-444444444401/accept-bid', {
        method: 'POST',
        body: { bid_id: 'invalid-bid-uuid' },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /valid UUID/);
    });

    it('executeUpiPayout should generate compliant transaction reference and status', () => {
      const payout = executeUpiPayout({
        sellerVpa: 'dwcc.ward150@sbi',
        amountInr: 40000,
        sellerId: '22222222-2222-2222-2222-222222222201',
      });

      assert.equal(payout.status, 'SUCCESS');
      assert.equal(payout.currency, 'INR');
      assert.equal(payout.amount_inr, 40000);
      assert.equal(payout.payee_vpa, 'dwcc.ward150@sbi');
      assert.ok(payout.transaction_id.startsWith('UPI-TXN-'));
      assert.ok(payout.bank_rrn.startsWith('RRN'));
      assert.ok(new Date(payout.timestamp).getTime() > 0);
    });
  });

  describe('3. Cryptographic CPCB EPR Token & Audit Verification Tests', () => {
    it('generateCpcbHash should produce a deterministic 64-character SHA-256 hex string', () => {
      const params = {
        listingId: '44444444-4444-4444-4444-444444444401',
        recyclerId: '33333333-3333-3333-3333-333333333301',
        materialGrade: 'PET',
        weightMt: '1.250',
        timestamp: '2026-10-24T10:00:00.000Z',
      };

      const hash1 = generateCpcbHash(params);
      const hash2 = generateCpcbHash(params);

      assert.equal(hash1.length, 64);
      assert.match(hash1, /^[0-9a-f]{64}$/);
      assert.equal(hash1, hash2, 'Hash must be strictly deterministic given the same inputs');
    });

    it('generateCpcbHash should show avalanche effect upon tampering with material or weight', () => {
      const base = {
        listingId: '44444444-4444-4444-4444-444444444401',
        recyclerId: '33333333-3333-3333-3333-333333333301',
        materialGrade: 'PET',
        weightMt: '1.250',
        timestamp: '2026-10-24T10:00:00.000Z',
      };

      const tampered = { ...base, weightMt: '1.251' }; // 1 gram discrepancy

      const originalHash = generateCpcbHash(base);
      const tamperedHash = generateCpcbHash(tampered);

      assert.notEqual(originalHash, tamperedHash, 'Any data modification must yield a different certificate hash');
    });

    it('GET /api/v1/epr/verify/:hash with non-64-char hex should reject with 400', async () => {
      const res = await apiRequest('/api/v1/epr/verify/short-fake-hash');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /64-character hex/);
    });

    it('GET /api/v1/epr/tokens/:id with invalid UUID should reject with 400', async () => {
      const res = await apiRequest('/api/v1/epr/tokens/not-a-token-uuid');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /valid UUID/);
    });

    it('GET /api/v1/epr/recycler/:recycler_id with invalid UUID should reject with 400', async () => {
      const res = await apiRequest('/api/v1/epr/recycler/bad-recycler-id');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /valid UUID/);
    });
  });
});
