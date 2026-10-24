import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const VALID_ROLES = ['Picker', 'DWCC', 'Recycler', 'ULB'];
const VALID_VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MOBILE_REGEX = /^\+?[0-9]{10,15}$/;

/**
 * Register a new user in the marketplace
 * POST /api/v1/users
 */
export const registerUser = async (req, res, next) => {
  try {
    const { role, mobile_number, upi_vpa, password } = req.body;

    // Validate role
    if (!role || !VALID_ROLES.includes(role)) {
      throw new AppError(
        `Invalid or missing role. Allowed roles are: ${VALID_ROLES.join(', ')}`,
        400
      );
    }

    // Validate mobile_number
    // FIX (BUG-002): Enforce phone number format with digits and optional leading plus
    const trimmedMobile = mobile_number && typeof mobile_number === 'string' ? mobile_number.trim() : '';
    if (!trimmedMobile || !MOBILE_REGEX.test(trimmedMobile)) {
      throw new AppError(
        'A valid mobile_number is required (e.g., "+919876543210" or "9876543210").',
        400
      );
    }

    const cleanUpi = upi_vpa ? String(upi_vpa).trim() : null;

    // Hash password or generate secure default for legacy registration
    const plainPassword = password && typeof password === 'string' && password.length >= 6
      ? password
      : crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const sql = `
      INSERT INTO users (role, mobile_number, password_hash, upi_vpa)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id, role, mobile_number, upi_vpa, verification_status, created_at;
    `;

    const result = await query(sql, [role, trimmedMobile, passwordHash, cleanUpi]);
    const newUser = result.rows[0];

    return res.status(201).json({
      success: true,
      data: newUser,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch a single user profile by ID
 * GET /api/v1/users/:id
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      throw new AppError('Invalid user_id format. Must be a valid UUID.', 400);
    }

    const sql = `
      SELECT user_id, role, mobile_number, upi_vpa, organization_name, cpcb_reg_number, upi_vpa_status, upi_bank_account_holder, verification_status, created_at
      FROM users
      WHERE user_id = $1;
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      throw new AppError(`User with id '${id}' not found.`, 404);
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List all users, optionally filtered by role
 * GET /api/v1/users?role=Picker
 */
export const listUsers = async (req, res, next) => {
  try {
    const { role, verification_status, limit = 50, offset = 0 } = req.query;

    const conditions = [];
    const params = [];

    if (role) {
      if (!VALID_ROLES.includes(role)) {
        throw new AppError(
          `Invalid role filter '${role}'. Allowed roles: ${VALID_ROLES.join(', ')}`,
          400
        );
      }
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    if (verification_status) {
      const upperStatus = String(verification_status).toUpperCase();
      // FIX (BUG-003): Validate verification_status filter against allowed values
      if (!VALID_VERIFICATION_STATUSES.includes(upperStatus)) {
        throw new AppError(
          `Invalid verification_status filter '${verification_status}'. Allowed values: ${VALID_VERIFICATION_STATUSES.join(', ')}`,
          400
        );
      }
      params.push(upperStatus);
      conditions.push(`verification_status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(Math.min(Math.max(Number(limit) || 50, 1), 100));
    const limitPlaceholder = `$${params.length}`;

    params.push(Math.max(Number(offset) || 0, 0));
    const offsetPlaceholder = `$${params.length}`;

    const sql = `
      SELECT user_id, role, mobile_number, upi_vpa, organization_name, cpcb_reg_number, upi_vpa_status, upi_bank_account_holder, verification_status, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder};
    `;

    const result = await query(sql, params);

    return res.status(200).json({
      success: true,
      data: {
        total: result.rowCount,
        users: result.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  registerUser,
  getUserById,
  listUsers,
};
