// ─────────────────────────────────────────
//  middleware/error.middleware.js
//  Global error handler — must be last middleware registered
// ─────────────────────────────────────────

const { errorResponse } = require('../utils/apiResponse');

const errorMiddleware = (err, req, res, next) => {
  // Log error for server-side debugging
  console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err.message);

  // ── Mongoose Validation Error ──────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return errorResponse(res, 400, messages.join('. '), err);
  }

  // ── Mongoose Duplicate Key (e.g., email already exists) ───────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(
      res,
      409,
      `An account with this ${field} already exists.`,
      err
    );
  }

  // ── Mongoose Cast Error (invalid ObjectId) ────────────────────────────
  if (err.name === 'CastError') {
    return errorResponse(res, 400, `Invalid value for field: ${err.path}`, err);
  }

  // ── JWT Errors ────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 401, 'Invalid token. Please log in again.', err);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 401, 'Token expired. Please log in again.', err);
  }

  // ── Multer Errors ─────────────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(
      res,
      400,
      `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10}MB.`,
      err
    );
  }

  if (err.message && err.message.startsWith('Invalid file type')) {
    return errorResponse(res, 400, err.message, err);
  }

  // ── Custom App Errors (thrown with statusCode) ─────────────────────────
  if (err.statusCode) {
    return errorResponse(res, err.statusCode, err.message, err);
  }

  // ── Fallback: Unknown Server Error ────────────────────────────────────
  return errorResponse(
    res,
    500,
    'Something went wrong on the server.',
    err
  );
};

module.exports = errorMiddleware;
