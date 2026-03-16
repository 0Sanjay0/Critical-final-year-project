// ═══════════════════════════════════════════════════════════
//  middleware/optionalAuth.middleware.js
//
//  Like authenticate, but does NOT block unauthenticated requests.
//  If a valid token is present → req.user is populated.
//  If no token / invalid token  → req.user stays null.
//
//  Used by the emergency QR endpoint so it works for:
//    - Unauthenticated public scans (unconscious patient)
//    - Authenticated doctors/hospitals
// ═══════════════════════════════════════════════════════════

const { verifyToken } = require('../services/token.service');
const User = require('../models/User.model');

const optionalAuth = async (req, res, next) => {
  req.user = null; // default — unauthenticated

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token   = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId).select('-password');
    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // Invalid or expired token — treat as unauthenticated, don't block
  }

  next();
};

module.exports = { optionalAuth };
