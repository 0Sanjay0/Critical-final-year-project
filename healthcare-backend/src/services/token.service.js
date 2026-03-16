// ─────────────────────────────────────────
//  services/token.service.js — JWT helpers
// ─────────────────────────────────────────

const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token for a user.
 * @param {object} payload - Data to embed in token (userId, role)
 * @returns {string} Signed JWT
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Verify and decode a JWT token.
 * @param {string} token
 * @returns {object} Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
