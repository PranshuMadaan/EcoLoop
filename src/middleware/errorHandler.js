/**
 * Custom application error class with HTTP status code support
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error description
   * @param {number} [statusCode=500] - HTTP status code
   * @param {*} [details=null] - Optional detailed error context
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized Express Error Handling Middleware
 * Ensures every error response conforms to:
 * { "success": false, "error": "Message" }
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Handle known PostgreSQL error codes
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        statusCode = 409;
        message = err.detail
          ? `Conflict: ${err.detail}`
          : 'A record with the specified unique field already exists.';
        break;

      case '23503': // foreign_key_violation
        statusCode = 400;
        message = err.detail
          ? `Foreign key constraint failed: ${err.detail}`
          : 'Referenced entity does not exist.';
        break;

      case '23514': // check_violation
        statusCode = 400;
        message = err.detail
          ? `Check constraint violation: ${err.detail}`
          : 'Input data violates schema integrity constraints.';
        break;

      case '22P02': // invalid_text_representation (e.g. malformed UUID)
        statusCode = 400;
        message = 'Invalid format for identifier or numeric value.';
        break;

      case 'ECONNREFUSED':
      case '28P01': // invalid password
      case '3D000': // database does not exist
        statusCode = 503;
        message = 'Database service unavailable or connection failed.';
        break;

      default:
        break;
    }
  }

  // Log non-operational / 500 errors for observability
  if (statusCode >= 500) {
    console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err);
  }

  // FIX (BUG-004): Sanitize error messages in production for 500 / non-operational errors
  // Prevents leaking internal database details, credentials, or file paths
  if (statusCode >= 500 && process.env.NODE_ENV === 'production' && !err.isOperational) {
    message = 'Internal Server Error';
  }

  const responseBody = {
    success: false,
    error: message,
  };

  if (details && process.env.NODE_ENV !== 'production') {
    responseBody.details = details;
  }

  return res.status(statusCode).json(responseBody);
};

export default errorHandler;
