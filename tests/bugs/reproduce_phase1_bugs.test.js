import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../../src/app.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { createListing, ALLOWED_MATERIAL_GRADES } from '../../src/controllers/listingController.js';
import { registerUser, listUsers } from '../../src/controllers/userController.js';
import { AppError } from '../../src/middleware/errorHandler.js';

describe('Phase 1 Bug Reproduction & Edge Cases Test Suite', () => {
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
    return { status: res.status, body };
  }

  describe('Bug 1: Invalid Enum for material_grade in scrap listings', () => {
    it('POST /api/v1/listings should reject unapproved material_grade enum values with 400 Bad Request', async () => {
      const res = await apiRequest('/api/v1/listings', {
        method: 'POST',
        body: {
          seller_id: '11111111-1111-1111-1111-111111111101',
          material_grade: 'ToxicChemicalWaste',
          weight_kg: 100,
          min_price: 500,
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Allowed material grades/i);
    });

    it('POST /api/v1/listings should reject SQL injection in material_grade', async () => {
      const res = await apiRequest('/api/v1/listings', {
        method: 'POST',
        body: {
          seller_id: '11111111-1111-1111-1111-111111111101',
          material_grade: "PET'; DROP TABLE scrap_listings; --",
          weight_kg: 100,
          min_price: 500,
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Allowed material grades/i);
    });
  });

  describe('Bug 2: Invalid mobile_number format acceptance in user registration', () => {
    it('POST /api/v1/users should reject non-numeric phone strings with 400 Bad Request', async () => {
      const res = await apiRequest('/api/v1/users', {
        method: 'POST',
        body: {
          role: 'Picker',
          mobile_number: '+91-INVALID-NUMB',
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /valid mobile_number/i);
    });

    it('POST /api/v1/users should reject phone numbers with symbols or less than 10 digits', async () => {
      const res = await apiRequest('/api/v1/users', {
        method: 'POST',
        body: {
          role: 'Picker',
          mobile_number: '12345!@#$',
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /valid mobile_number/i);
    });
  });

  describe('Bug 3: Unvalidated verification_status filter in listUsers', () => {
    it('GET /api/v1/users?verification_status=GARBAGE should return 400 Bad Request', async () => {
      const res = await apiRequest('/api/v1/users?verification_status=GARBAGE_STATUS');

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Invalid verification_status filter/i);
    });
  });

  describe('Bug 4: Sensitive internal error message leaking in production for unhandled 500 errors', () => {
    it('errorHandler should sanitize unexpected 500 error messages to "Internal Server Error" in production mode', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const internalError = new Error('FATAL pg connection leak at secret_table_v2 postgres://user:pass@host');
        internalError.statusCode = 500;
        internalError.isOperational = false;

        let capturedStatus = 0;
        let capturedBody = null;

        const mockRes = {
          status(code) {
            capturedStatus = code;
            return this;
          },
          json(body) {
            capturedBody = body;
            return this;
          },
        };

        const mockReq = { method: 'GET', originalUrl: '/api/v1/test' };

        errorHandler(internalError, mockReq, mockRes, () => {});

        assert.equal(capturedStatus, 500);
        assert.equal(capturedBody.success, false);
        assert.equal(capturedBody.error, 'Internal Server Error');
        assert.equal(capturedBody.details, undefined);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it('errorHandler should preserve operational error messages in production', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const operationalError = new AppError('Resource limit exceeded. Maximum 100 items.', 429);

        let capturedStatus = 0;
        let capturedBody = null;

        const mockRes = {
          status(code) {
            capturedStatus = code;
            return this;
          },
          json(body) {
            capturedBody = body;
            return this;
          },
        };

        const mockReq = { method: 'GET', originalUrl: '/api/v1/test' };

        errorHandler(operationalError, mockReq, mockRes, () => {});

        assert.equal(capturedStatus, 429);
        assert.equal(capturedBody.success, false);
        assert.equal(capturedBody.error, 'Resource limit exceeded. Maximum 100 items.');
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });
  });
});
