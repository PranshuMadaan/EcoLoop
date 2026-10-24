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

/**
 * User Registration with Password Hashing & JWT Cookie
 * POST /api/v1/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { role, mobile_number, password, upi_vpa } = req.body;

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

    // Check if mobile number is already registered
    const existing = await query('SELECT user_id FROM users WHERE mobile_number = $1;', [trimmedMobile]);
    if (existing.rows.length > 0) {
      throw new AppError('An account with this mobile number already exists.', 409);
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const insertSql = `
      INSERT INTO users (role, mobile_number, password_hash, upi_vpa, verification_status)
      VALUES ($1, $2, $3, $4, 'PENDING')
      RETURNING user_id, role, mobile_number, upi_vpa, verification_status, created_at;
    `;

    const result = await query(insertSql, [role, trimmedMobile, passwordHash, cleanUpi]);
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
