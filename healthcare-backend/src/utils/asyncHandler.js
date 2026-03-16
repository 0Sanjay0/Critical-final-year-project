// ─────────────────────────────────────────
//  asyncHandler.js — Wraps async controllers
//  Eliminates repetitive try/catch blocks
// ─────────────────────────────────────────

/**
 * Wraps an async route handler and forwards errors to Express error middleware.
 *
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => { ... }))
 *
 * @param {Function} fn - Async controller function
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
