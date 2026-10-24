import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppError, errorHandler } from '../src/middleware/errorHandler.js';
import { registerUser, getUserById, listUsers } from '../src/controllers/userController.js';
import { createListing, getListingById } from '../src/controllers/listingController.js';
import { placeBid } from '../src/controllers/bidController.js';

describe('1. Error Handler Middleware Tests', () => {
  it('should format operational AppError into standard JSON error contract', () => {
    const error = new AppError('Custom validation failed', 400);
    const req = { method: 'POST', originalUrl: '/api/v1/test' };
    let capturedStatus = 0;
    let capturedBody = null;

    const res = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(body) {
        capturedBody = body;
        return this;
      },
    };

    errorHandler(error, req, res, () => {});

    assert.equal(capturedStatus, 400);
    assert.equal(capturedBody.success, false);
    assert.equal(capturedBody.error, 'Custom validation failed');
  });

  it('should map PostgreSQL 23505 unique constraint violation to 409 Conflict', () => {
    const error = { code: '23505', detail: 'Key (mobile_number)=(+919876543210) already exists.' };
    const req = { method: 'POST', originalUrl: '/api/v1/users' };
    let capturedStatus = 0;
    let capturedBody = null;

    const res = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(body) {
        capturedBody = body;
        return this;
      },
    };

    errorHandler(error, req, res, () => {});

    assert.equal(capturedStatus, 409);
    assert.equal(capturedBody.success, false);
    assert.match(capturedBody.error, /already exists/);
  });

  it('should map PostgreSQL 22P02 invalid UUID format to 400 Bad Request', () => {
    const error = { code: '22P02' };
    const req = { method: 'GET', originalUrl: '/api/v1/users/not-a-uuid' };
    let capturedStatus = 0;
    let capturedBody = null;

    const res = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(body) {
        capturedBody = body;
        return this;
      },
    };

    errorHandler(error, req, res, () => {});

    assert.equal(capturedStatus, 400);
    assert.equal(capturedBody.success, false);
    assert.match(capturedBody.error, /Invalid format/);
  });
});

describe('2. User Controller Validation Tests', () => {
  it('should reject registration if role is missing or invalid', async () => {
    const req = { body: { role: 'Admin', mobile_number: '+919876543210' } };
    let forwardedError = null;

    await registerUser(req, {}, (err) => {
      forwardedError = err;
    });

    assert.ok(forwardedError instanceof AppError);
    assert.equal(forwardedError.statusCode, 400);
    assert.match(forwardedError.message, /Allowed roles/);
  });

  it('should reject registration if mobile number is too short or missing', async () => {
    const req = { body: { role: 'Picker', mobile_number: '123' } };
    let forwardedError = null;

    await registerUser(req, {}, (err) => {
      forwardedError = err;
    });

    assert.ok(forwardedError instanceof AppError);
    assert.equal(forwardedError.statusCode, 400);
    assert.match(forwardedError.message, /valid mobile_number is required/);
  });

  it('should reject getUserById with malformed UUID', async () => {
    const req = { params: { id: 'invalid-uuid-123' } };
    let forwardedError = null;

    await getUserById(req, {}, (err) => {
      forwardedError = err;
    });

    assert.ok(forwardedError instanceof AppError);
    assert.equal(forwardedError.statusCode, 400);
    assert.match(forwardedError.message, /valid UUID/);
  });
});

describe('3. Scrap Listing Controller Validation Tests', () => {
  it('should reject listing if seller_id is not a valid UUID', async () => {
    const req = {
      body: {
        seller_id: '123-bad-id',
        material_grade: 'PET',
        weight_kg: 500,
        min_price: 15000,
      },
    };
    let forwardedError = null;

    await createListing(req, {}, (err) => {
      forwardedError = err;
    });

    assert.ok(forwardedError instanceof AppError);
    assert.equal(forwardedError.statusCode, 400);
    assert.match(forwardedError.message, /valid seller_id/);
  });

  it('should reject listing if weight_kg is zero or negative', async () => {
    const req = {
      body: {
        seller_id: '11111111-1111-1111-1111-111111111101',
        material_grade: 'PET',
        weight_kg: -10,
        min_price: 15000,
      },
    };
    let forwardedError = null;

    await createListing(req, {}, (err) => {
      forwardedError = err;
    });

    assert.ok(forwardedError instanceof AppError);
    assert.equal(forwardedError.statusCode, 400);
    assert.match(forwardedError.message, /positive numeric value/);
  });

  it('should reject listing if min_price is negative', async () => {
    const req = {
      body: {
        seller_id: '11111111-1111-1111-1111-111111111101',
        material_grade: 'PET',
        weight_kg: 100,
        min_price: -50,
      },
    };
    let forwardedError = null;

    await createListing(req, {}, (err) => {
      forwardedError = err;
    });

    assert.ok(forwardedError instanceof AppError);
    assert.equal(forwardedError.statusCode, 400);
    assert.match(forwardedError.message, /non-negative numeric/);
  });
});

describe('4. Bids Controller Validation Tests', () => {
  it('should reject bid placement if bid_amount is non-positive', async () => {
    const req = {
      params: { listing_id: '44444444-4444-4444-4444-444444444401' },
      body: {
        bidder_id: '33333333-3333-3333-3333-333333333301',
        bid_amount: 0,
      },
    };
    let forwardedError = null;

    await placeBid(req, {}, (err) => {
      forwardedError = err;
    });

    assert.ok(forwardedError instanceof AppError);
    assert.equal(forwardedError.statusCode, 400);
    assert.match(forwardedError.message, /positive numeric value/);
  });
});
