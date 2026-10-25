import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { AppError } from './errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ecoloop_default_dev_jwt_secret_key';

/**
 * Authentication Middleware
 * Validates JWT from HTTP-Only cookie or Authorization Bearer header
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HTTP-Only cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.signedCookies && req.signedCookies.token) {
      token = req.signedCookies.token;
    }

    // 2. Check Authorization Bearer header fallback
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Authentication required. Please log in to access this resource.', 401);
    }

    // 3. Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Session expired. Please log in again.', 401);
      }
      throw new AppError('Invalid authentication token.', 401);
    }

    // 4. Verify user exists in database (with graceful offline dev fallback)
    try {
      const userResult = await query(
        'SELECT user_id, mobile_number, role, upi_vpa, verification_status FROM users WHERE user_id = $1;',
        [decoded.user_id]
      );

      if (userResult.rows.length === 0) {
        throw new AppError('The user account associated with this token no longer exists.', 401);
      }

      req.user = userResult.rows[0];
    } catch (dbErr) {
      if (dbErr.code === 'ECONNREFUSED' || dbErr.message?.includes('ECONNREFUSED')) {
        // Fallback to decoded token payload when database is offline in local dev
        req.user = {
          user_id: decoded.user_id || 'demo_user_1',
          mobile_number: decoded.mobile_number || '+919823014820',
          role: decoded.role || 'ULB_OFFICIAL',
          upi_vpa: 'demo.user@sbi',
          verification_status: 'VERIFIED',
        };
      } else {
        throw dbErr;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-Based Authorization Guard Middleware
 * @param {...string} allowedRoles - List of roles permitted to access endpoint
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required before authorization check.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user.role}' is not authorized to perform this action. Allowed roles: ${allowedRoles.join(', ')}`,
          403
        )
      );
    }

    next();
  };
};

export default {
  authenticate,
  authorizeRoles,
};
