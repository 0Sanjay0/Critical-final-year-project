// ═══════════════════════════════════════════════════════════
//  middleware/auth.middleware.js — JWT verification
// ═══════════════════════════════════════════════════════════

const { verifyToken } = require('../services/token.service');
const User = require('../models/User.model');
const { errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * authenticate
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches the full user document to req.user on success.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // ── 1. Extract token ─────────────────────────────────────
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, 401, 'Access denied. No token provided.');
  }

  // ── 2. Verify token signature & expiry ───────────────────
  const decoded = verifyToken(token); // throws if invalid/expired

  // ── 3. Check user still exists and is active ─────────────
  const user = await User.findById(decoded.userId).select('-password');

  if (!user) {
    return errorResponse(res, 401, 'User belonging to this token no longer exists.');
  }

  if (!user.isActive) {
    return errorResponse(res, 403, 'Your account has been deactivated. Please contact support.');
  }

  // ── 4. Attach user to request ────────────────────────────
  req.user = user;
  next();
});

module.exports = { authenticate };
