import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ecoloop_default_dev_jwt_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const VALID_ROLES = ['Picker', 'DWCC', 'Recycler', 'ULB'];
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

/**
 * Penny-Drop VPA Verification (NPCI Reverse Account Lookup — simulated)
 * POST /api/v1/auth/verify-vpa
 * Persists the verified VPA when mobile_number identifies an existing user.
 */
export const verifyVpa = async (req, res, next) => {
  try {
    const rawVpa = req.body.upi_vpa || req.body.vpa;
    if (!rawVpa || typeof rawVpa !== 'string') {
      throw new AppError('A valid upi_vpa string is required.', 400);
    }

    const trimmed = rawVpa.trim().toLowerCase();
    if (!VPA_REGEX.test(trimmed)) {
      throw new AppError('Invalid UPI VPA format. Expected handle like user@bank or 9876543210@upi', 400);
    }

    const [handle, psp] = trimmed.split('@');
    const bankName = KNOWN_PSP_BANKS[psp] || `${psp.toUpperCase()} Partner Bank`;

    // Derive account holder name from handle or mock registry
    let accountHolderName = 'PRIMARY ACCOUNT HOLDER (VERIFIED)';
    const candidateName = req.body.organization_name || req.body.name;
    if (candidateName) {
      accountHolderName = `${candidateName.toUpperCase().trim()} (VERIFIED HOLDER)`;
    } else if (handle.includes('mcd')) accountHolderName = 'MUNICIPAL CORPORATION OF DELHI';
    else if (handle.includes('bbmp')) accountHolderName = 'BRUHAT BENGALURU MAHANAGARA PALIKE';
    else if (handle.includes('railway') || handle.includes('rly')) accountHolderName = 'WESTERN RAILWAY CENTRAL STORES';
    else if (handle.includes('iocl')) accountHolderName = 'INDIAN OIL CORPORATION LIMITED';
    else if (handle.includes('sunita')) accountHolderName = 'SUNITA DEVI (AGGREGATOR)';
    else if (handle.includes('attero')) accountHolderName = 'ATTERO RECYCLING PVT LTD';
    else if (handle.includes('banyan')) accountHolderName = 'BANYAN ECO TECH LLP';
    else if (handle.includes('ganesha')) accountHolderName = 'GANESHA ECOSPHERE LTD';
    else if (/^\d{10,12}$/.test(handle)) {
      accountHolderName = `VERIFIED HOLDER (MOB +91-${handle.slice(-10)})`;
    } else {
      accountHolderName = `${handle.replace(/[^a-zA-Z0-9]/g, ' ').toUpperCase().trim()} (VERIFIED)`;
    }

    const verifiedAt = new Date().toISOString();

    // Persist the verification onto the user when the request identifies one
    // (e.g. re-verifying a stored VPA). Registration-time VPAs are marked
    // VERIFIED by register itself since onboarding includes penny-drop.
    let persisted = false;
    const mobile = req.body.mobile_number ? String(req.body.mobile_number).trim() : null;
    if (mobile) {
      const updateRes = await query(
        `UPDATE users
         SET upi_vpa = $1, upi_vpa_status = 'VERIFIED', upi_bank_account_holder = $2, upi_verified_at = NOW()
         WHERE mobile_number = $3;`,
        [trimmed, accountHolderName, mobile]
      );
      persisted = updateRes.rowCount > 0;
    }

    return res.status(200).json({
      success: true,
      data: {
        vpa: trimmed,
        verified: true,
        account_holder_name: accountHolderName,
        bank_name: bankName,
        ifsc_prefix: (psp.length >= 4 ? psp.slice(0, 4) : 'NPCI').toUpperCase(),
        penny_drop_status: 'SUCCESS',
        reference_id: `PND-${Date.now().toString(36).toUpperCase()}`,
        persisted,
        verified_at: verifiedAt,
        timestamp: verifiedAt,
      },
    });
  } catch (err) {
    next(err);
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
    let upiStatus = cleanUpi ? 'VERIFIED' : 'UNVERIFIED';
    let upiHolder = req.body.upi_bank_account_holder || null;

    if (cleanUpi && !upiHolder) {
      const handle = cleanUpi.split('@')[0] || 'User';
      upiHolder = organization_name 
        ? `${organization_name.toUpperCase().trim()} (VERIFIED HOLDER)`
        : `${handle.replace(/[^a-zA-Z0-9]/g, ' ').toUpperCase().trim()} (VERIFIED HOLDER)`;
    }

    // Check if mobile number is already registered
    const existing = await query('SELECT user_id FROM users WHERE mobile_number = $1;', [trimmedMobile]);
    if (existing.rows.length > 0) {
      throw new AppError('An account with this mobile number already exists.', 409);
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const insertSql = `
      INSERT INTO users (
        role, mobile_number, password_hash, upi_vpa, organization_name, cpcb_reg_number, upi_vpa_status, upi_bank_account_holder, verification_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'VERIFIED')
      RETURNING user_id, role, mobile_number, upi_vpa, organization_name, cpcb_reg_number, upi_vpa_status, upi_bank_account_holder, verification_status, created_at;
    `;

    const result = await query(insertSql, [
      role,
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
