import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ecoloop_default_dev_jwt_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const ROLE_MAP = {
  ULB_OFFICIAL: 'ULB',
  DWCC_OPERATOR: 'DWCC',
  RECYCLER: 'Recycler',
  WASTE_PICKER: 'Picker',
  CITIZEN_HOUSEHOLD: 'Picker',
  CITIZEN: 'Picker',
  Picker: 'Picker',
  DWCC: 'DWCC',
  Recycler: 'Recycler',
  ULB: 'ULB',
};
const VALID_ROLES = Object.keys(ROLE_MAP);
const MOBILE_REGEX = /^\+?[0-9]{10,15}$/;

/**
 * Generate signed JWT token
 */
const signToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      role: user.role,
      mobile_number: user.mobile_number,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Configure cookie options for HTTP-Only persistence
 */
const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  };
};

const VPA_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

const KNOWN_PSP_BANKS = {
  sbi: 'State Bank of India',
  oksbi: 'State Bank of India',
  okhdfcbank: 'HDFC Bank',
  hdfcbank: 'HDFC Bank',
  okaxis: 'Axis Bank',
  axisbank: 'Axis Bank',
  okicici: 'ICICI Bank',
  icici: 'ICICI Bank',
  paytm: 'Paytm Payments Bank',
  ptyes: 'YES Bank (Paytm)',
  pthdfc: 'HDFC Bank (Paytm)',
  ptsbi: 'State Bank of India (Paytm)',
  ptaxis: 'Axis Bank (Paytm)',
  apl: 'Amazon Pay (Axis Bank)',
  ybl: 'YES Bank (PhonePe)',
  axl: 'Axis Bank (PhonePe)',
  ibl: 'IndusInd Bank',
  upi: 'NPCI National Clearing Network',
};

import { BankVerificationService } from '../services/bankVerificationService.js';

/**
 * Penny-Drop & NPCI Reverse Account Lookup VPA Verification
 * POST /api/v1/auth/verify-vpa
 */
export const verifyVpa = async (req, res, next) => {
  try {
    const rawVpa = req.body.upi_vpa || req.body.vpa;
    if (!rawVpa || typeof rawVpa !== 'string') {
      throw new AppError('A valid upi_vpa string is required.', 400);
    }

    const candidateName = req.body.organization_name || req.body.name;
    const targetMobile = req.body.mobile_number || req.body.mobile || null;

    // Execute bank verification (Cashfree / RazorpayX / Setu / High-fidelity Simulator)
    const verification = await BankVerificationService.verifyVpa({
      vpa: rawVpa,
      expectedName: candidateName,
      mobileNumber: targetMobile,
      providerOverride: req.body.provider,
    });

    if (!verification.verified) {
      return res.status(400).json({
        success: false,
        error: verification.reason || 'The provided UPI VPA could not be verified by the banking switch.',
        code: verification.error_code || 'VPA_NOT_FOUND',
        data: {
          vpa: rawVpa.trim().toLowerCase(),
          verified: false,
          provider: verification.provider,
        },
      });
    }

    const {
      vpa: verifiedVpa,
      account_holder_name: accountHolderName,
      bank_name: bankName,
      ifsc_prefix: ifscPrefix,
      reference_id: referenceId,
      provider,
      name_match: nameMatch,
      npci_rrn: npciRrn,
    } = verification;

    // 1. Persist bank verification audit row directly into Neon Cloud Database
    const insertRes = await query(
      `INSERT INTO vpa_verifications (
        upi_vpa, account_holder_name, bank_name, ifsc_prefix, penny_drop_status, reference_id, mobile_number, organization_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (reference_id) DO UPDATE SET
        upi_vpa = EXCLUDED.upi_vpa,
        account_holder_name = EXCLUDED.account_holder_name,
        bank_name = EXCLUDED.bank_name,
        ifsc_prefix = EXCLUDED.ifsc_prefix,
        penny_drop_status = EXCLUDED.penny_drop_status
      RETURNING verification_id, created_at;`,
      [
        verifiedVpa,
        accountHolderName,
        bankName,
        ifscPrefix,
        'SUCCESS',
        referenceId,
        targetMobile,
        candidateName || null,
      ]
    );
    const verificationRecord = insertRes.rows[0];

    // 2. If an existing user matches mobile_number or VPA in Neon, synchronize their bank verification
    if (targetMobile) {
      await query(
        `UPDATE users
         SET upi_vpa = $1,
             upi_bank_account_holder = $2,
             upi_vpa_status = 'VERIFIED',
             upi_verified_at = NOW()
         WHERE mobile_number = $3;`,
        [verifiedVpa, accountHolderName, targetMobile]
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        verification_id: verificationRecord.verification_id,
        vpa: verifiedVpa,
        verified: true,
        account_holder_name: accountHolderName,
        bank_name: bankName,
        ifsc_prefix: ifscPrefix,
        penny_drop_status: 'SUCCESS',
        reference_id: referenceId,
        provider,
        name_match: nameMatch,
        npci_rrn: npciRrn,
        persisted_to_neon: true,
        timestamp: verificationRecord.created_at || new Date().toISOString(),
      },
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
};

/**
 * Direct Bank Account (Account Number + IFSC) Penny-Drop Verification
 * POST /api/v1/auth/verify-bank-account
 */
export const verifyBankAccount = async (req, res, next) => {
  try {
    const { account_number, ifsc } = req.body;
    const candidateName = req.body.organization_name || req.body.name;
    const targetMobile = req.body.mobile_number || req.body.mobile || null;

    const verification = await BankVerificationService.verifyBankAccount({
      accountNumber: account_number,
      ifsc,
      expectedName: candidateName,
      mobileNumber: targetMobile,
    });

    return res.status(200).json({
      success: true,
      data: verification,
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
};

/**
 * Initialize Razorpay Verification Session (₹1.00 Refundable Penny-Drop)
 * POST /api/v1/auth/razorpay/create-order
 */
export const createRazorpayVerificationOrder = async (req, res, next) => {
  try {
    const { amount_inr, organization_name, mobile_number } = req.body;
    const session = await BankVerificationService.createRazorpayOrder({
      amountInr: amount_inr || 1.00,
      customerName: organization_name,
      customerMobile: mobile_number,
    });

    return res.status(200).json({
      success: true,
      data: session,
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
};

/**
 * Confirm Razorpay Checkout Payment & Complete Bank Verification
 * POST /api/v1/auth/razorpay/confirm-payment
 */
export const confirmRazorpayVerification = async (req, res, next) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, upi_vpa, organization_name, mobile_number } = req.body;
    if (!razorpay_payment_id) {
      throw new AppError('razorpay_payment_id is required to confirm bank authorization.', 400);
    }

    const verification = await BankVerificationService.verifyRazorpayPayment({
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      vpa: upi_vpa,
      expectedName: organization_name,
      mobileNumber: mobile_number,
    });

    // Record verification into Neon DB
    const insertRes = await query(
      `INSERT INTO vpa_verifications (
        upi_vpa, account_holder_name, bank_name, ifsc_prefix, penny_drop_status, reference_id, mobile_number, organization_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (reference_id) DO UPDATE SET
        upi_vpa = EXCLUDED.upi_vpa,
        account_holder_name = EXCLUDED.account_holder_name,
        bank_name = EXCLUDED.bank_name,
        ifsc_prefix = EXCLUDED.ifsc_prefix,
        penny_drop_status = EXCLUDED.penny_drop_status
      RETURNING verification_id, created_at;`,
      [
        verification.vpa,
        verification.account_holder_name,
        verification.bank_name,
        verification.ifsc_prefix,
        'SUCCESS',
        verification.reference_id,
        mobile_number || null,
        organization_name || null,
      ]
    );

    const verificationRecord = insertRes.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        verification_id: verificationRecord.verification_id,
        ...verification,
        persisted_to_neon: true,
        timestamp: verificationRecord.created_at || new Date().toISOString(),
      },
    });
  } catch (err) {
    next(new AppError(err.message, 400));
  }
};

/**
 * User Registration with Password Hashing & JWT Cookie
 * POST /api/v1/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { role, password } = req.body;
    const mobile_number = req.body.mobile_number || req.body.mobile;
    const organization_name = req.body.organization_name || req.body.name;
    const cpcb_reg_number = req.body.cpcb_reg_number || req.body.cpcb_registration_number;
    const upi_vpa = req.body.upi_vpa || req.body.vpa;

    // Validate role
    if (!role || !VALID_ROLES.includes(role)) {
      throw new AppError(
        `Invalid or missing role. Allowed roles: ${VALID_ROLES.join(', ')}`,
        400
      );
    }

    // Validate mobile number
    const trimmedMobile = mobile_number && typeof mobile_number === 'string' ? mobile_number.trim() : '';
    if (!trimmedMobile || !MOBILE_REGEX.test(trimmedMobile)) {
      throw new AppError(
        'A valid mobile_number is required (at least 10 digits, e.g. +919876543210).',
        400
      );
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new AppError('Password is required and must be at least 6 characters long.', 400);
    }

    const cleanUpi = upi_vpa ? String(upi_vpa).trim() : null;
    let upiStatus = 'UNVERIFIED';
    let upiHolder = req.body.upi_bank_account_holder || null;

    if (cleanUpi) {
      if (!upiHolder) {
        try {
          const autoVerify = await BankVerificationService.verifyVpa({
            vpa: cleanUpi,
            expectedName: organization_name,
            mobileNumber: trimmedMobile,
          });
          if (autoVerify.verified) {
            upiStatus = 'VERIFIED';
            upiHolder = autoVerify.account_holder_name;
          } else {
            upiStatus = 'UNVERIFIED';
          }
        } catch {
          upiStatus = 'UNVERIFIED';
        }
      } else {
        upiStatus = 'VERIFIED';
      }
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Upsert into Neon PostgreSQL: insert if new, or update verified UPI details if already registered
    const insertSql = `
      INSERT INTO users (
        role, mobile_number, password_hash, upi_vpa, organization_name, cpcb_reg_number, upi_vpa_status, upi_bank_account_holder, verification_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'VERIFIED')
      ON CONFLICT (mobile_number) DO UPDATE SET
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        upi_vpa = EXCLUDED.upi_vpa,
        organization_name = COALESCE(EXCLUDED.organization_name, users.organization_name),
        cpcb_reg_number = COALESCE(EXCLUDED.cpcb_reg_number, users.cpcb_reg_number),
        upi_vpa_status = 'VERIFIED',
        upi_bank_account_holder = EXCLUDED.upi_bank_account_holder,
        upi_verified_at = NOW(),
        verification_status = 'VERIFIED'
      RETURNING user_id, role, mobile_number, upi_vpa, organization_name, cpcb_reg_number, upi_vpa_status, upi_bank_account_holder, verification_status, created_at;
    `;

    const dbRole = ROLE_MAP[role] || 'Picker';
    const result = await query(insertSql, [
      dbRole,
      trimmedMobile,
      passwordHash,
      cleanUpi,
      organization_name || null,
      cpcb_reg_number || null,
      upiStatus,
      upiHolder,
    ]);
    const newUser = result.rows[0];

    // Issue JWT and set HTTP-Only cookie
    const token = signToken(newUser);
    res.cookie('token', token, getCookieOptions());

    return res.status(201).json({
      success: true,
      data: {
        user: newUser,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * User Login with Password Verification & JWT Cookie
 * POST /api/v1/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { mobile_number, password } = req.body;

    if (!mobile_number || !password) {
      throw new AppError('Both mobile_number and password are required.', 400);
    }

    const trimmedMobile = String(mobile_number).trim();

    // Fetch user including password_hash
    const result = await query(
      'SELECT user_id, role, mobile_number, password_hash, upi_vpa, verification_status, created_at FROM users WHERE mobile_number = $1;',
      [trimmedMobile]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials. Mobile number or password incorrect.', 401);
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(String(password), user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid credentials. Mobile number or password incorrect.', 401);
    }

    // Omit password_hash from response
    delete user.password_hash;

    // Issue JWT and set cookie
    const token = signToken(user);
    res.cookie('token', token, getCookieOptions());

    return res.status(200).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * User Logout - Clears HTTP-Only authentication cookie
 * POST /api/v1/auth/logout
 */
export const logout = async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
  });

  return res.status(200).json({
    success: true,
    data: {
      message: 'Successfully logged out.',
    },
  });
};

/**
 * Fetch Current Authenticated User Session
 * GET /api/v1/auth/me
 */
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
};

export default {
  register,
  login,
  logout,
  getMe,
};
