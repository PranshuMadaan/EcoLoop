import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import {
  BankVerificationService,
  computeNameMatchScore,
  PSP_BANK_DIRECTORY,
} from '../src/services/bankVerificationService.js';
import { pool } from '../src/config/db.js';

describe('Bank & UPI Live Account Verification Test Suite', () => {
  let server;
  let baseUrl;

  before(async () => {
    process.env.BANK_VERIFY_PROVIDER = 'simulation';
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
    return { status: res.status, headers: res.headers, body };
  }

  describe('1. Fuzzy Name Matching Engine (computeNameMatchScore)', () => {
    it('should return 100% and EXACT_MATCH for identical names', () => {
      const result = computeNameMatchScore('GreenTech Recyclers Pvt Ltd', 'GreenTech Recyclers Pvt Ltd');
      assert.equal(result.score, 100);
      assert.equal(result.status, 'EXACT_MATCH');
    });

    it('should strip corporate noise words and detect HIGH_CONFIDENCE match', () => {
      // One has "PVT LTD", the other doesn't; one has "M/S"
      const result = computeNameMatchScore('M/S GreenTech Recyclers', 'GREENTECH RECYCLERS PRIVATE LIMITED');
      assert.ok(result.score >= 80, `Expected score >= 80, got ${result.score}`);
      assert.equal(result.status, 'HIGH_CONFIDENCE');
    });

    it('should detect MISMATCH for completely different legal entities', () => {
      const result = computeNameMatchScore('Delhi Waste Collective', 'RAMESH SHARMA');
      assert.ok(result.score < 50, `Expected score < 50 for mismatch, got ${result.score}`);
      assert.equal(result.status, 'MISMATCH');
    });

    it('should handle empty or null values gracefully', () => {
      const result = computeNameMatchScore('', null);
      assert.equal(result.score, 0);
      assert.equal(result.status, 'NOT_EVALUATED');
    });
  });

  describe('2. BankVerificationService Unit Tests', () => {
    it('should verify standard UPI VPA and resolve partner bank and IFSC', async () => {
      const res = await BankVerificationService.verifyVpa({
        vpa: 'rohini.dwcc@oksbi',
        expectedName: 'Rohini DWCC Center',
        mobileNumber: '+919876543210',
      });

      assert.equal(res.verified, true);
      assert.equal(res.vpa, 'rohini.dwcc@oksbi');
      assert.equal(res.bank_name, 'State Bank of India');
      assert.equal(res.ifsc_prefix, 'SBIN');
      assert.ok(res.reference_id.startsWith('NPCI-'));
      assert.ok(res.npci_rrn);
      assert.ok(res.name_match.score >= 70);
    });

    it('should reject test non-existent / closed VPA handles', async () => {
      const res = await BankVerificationService.verifyVpa({
        vpa: 'invalid.user@upi',
        expectedName: 'Test Seller',
      });

      assert.equal(res.verified, false);
      assert.equal(res.error_code, 'NPCI_VPA_NOT_FOUND');
    });

    it('should flag simulated name mismatch accounts', async () => {
      const res = await BankVerificationService.verifyVpa({
        vpa: 'test.mismatch@okaxis',
        expectedName: 'Green MRF Limited',
      });

      assert.equal(res.verified, true);
      assert.equal(res.name_match.status, 'MISMATCH');
      assert.ok(res.name_match.score < 50);
    });

    it('should verify Bank Account Number + IFSC via Penny Drop', async () => {
      const res = await BankVerificationService.verifyBankAccount({
        accountNumber: '918273645019',
        ifsc: 'HDFC0001234',
        expectedName: 'HDFC Aggregator',
      });

      assert.equal(res.verified, true);
      assert.equal(res.bank_name, 'HDFC Bank');
      assert.equal(res.penny_drop_status, 'SUCCESS');
      assert.equal(res.account_number_masked, '••••••••5019');
      assert.ok(res.bank_rrn);
    });

    it('should throw error for invalid IFSC code format', async () => {
      await assert.rejects(
        async () => {
          await BankVerificationService.verifyBankAccount({
            accountNumber: '1234567890',
            ifsc: 'INVALID_IFSC',
          });
        },
        /Invalid IFSC code/
      );
    });
  });

  describe('3. HTTP Endpoints Integration Tests', () => {
    it('POST /api/v1/auth/verify-vpa should verify valid VPA and return rich banking audit data', async () => {
      const res = await apiRequest('/api/v1/auth/verify-vpa', {
        method: 'POST',
        body: {
          upi_vpa: 'ecoloop.partner@okicici',
          organization_name: 'EcoLoop Green Hub',
          mobile_number: '+919988776655',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.verified, true);
      assert.equal(res.body.data.bank_name, 'ICICI Bank');
      assert.equal(res.body.data.ifsc_prefix, 'ICIC');
      assert.ok(res.body.data.reference_id);
      assert.ok(res.body.data.account_holder_name);
      assert.ok(res.body.data.name_match);
      assert.equal(res.body.data.persisted_to_neon, true);
    });

    it('POST /api/v1/auth/verify-vpa should return 400 for unassigned / invalid VPA', async () => {
      const res = await apiRequest('/api/v1/auth/verify-vpa', {
        method: 'POST',
        body: {
          upi_vpa: 'closed.account@upi',
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /NPCI central switch/);
    });

    it('POST /api/v1/auth/verify-vpa should reject missing VPA with 400', async () => {
      const res = await apiRequest('/api/v1/auth/verify-vpa', {
        method: 'POST',
        body: {},
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /A valid upi_vpa string is required/);
    });

    it('POST /api/v1/auth/verify-bank-account should perform penny-drop lookup', async () => {
      const res = await apiRequest('/api/v1/auth/verify-bank-account', {
        method: 'POST',
        body: {
          account_number: '123456789012',
          ifsc: 'SBIN0000691',
          organization_name: 'SBI Collection Center',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.verified, true);
      assert.equal(res.body.data.bank_name, 'State Bank of India');
      assert.equal(res.body.data.account_number_masked, '••••••••9012');
    });

    it('POST /api/v1/auth/razorpay/create-order should return order session', async () => {
      const res = await apiRequest('/api/v1/auth/razorpay/create-order', {
        method: 'POST',
        body: {
          amount_inr: 1.00,
          organization_name: 'Rohini DWCC MRF',
          mobile_number: '+919876543210',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.orderId);
      assert.equal(res.body.data.amount, 100);
      assert.equal(res.body.data.currency, 'INR');
    });

    it('POST /api/v1/auth/razorpay/confirm-payment should confirm and record bank verification in Neon', async () => {
      const testPayId = `pay_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const res = await apiRequest('/api/v1/auth/razorpay/confirm-payment', {
        method: 'POST',
        body: {
          razorpay_payment_id: testPayId,
          razorpay_order_id: `order_test_${Date.now()}`,
          upi_vpa: 'rohini.dwcc@oksbi',
          organization_name: 'Rohini DWCC Center',
          mobile_number: '+919876543210',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.verified, true);
      assert.equal(res.body.data.provider, 'razorpay');
      assert.equal(res.body.data.bank_name, 'State Bank of India');
      assert.equal(res.body.data.persisted_to_neon, true);
    });
  });
});
