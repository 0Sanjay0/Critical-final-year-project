// ═══════════════════════════════════════════════════════════
//  middleware/role.middleware.js — Role-based access guards
// ═══════════════════════════════════════════════════════════

const { errorResponse } = require('../utils/apiResponse');
const { VERIFICATION_STATUS, ROLES_REQUIRING_VERIFICATION } = require('../utils/constants');

/**
 * authorizeRoles(...roles)
 * Factory that returns middleware restricting access to specified roles.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, authorizeRoles('admin'), handler)
 *   router.get('/doctors-hospitals', authenticate, authorizeRoles('doctor', 'hospital'), handler)
 */
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 401, 'Authentication required.');
  }

  if (!roles.includes(req.user.role)) {
    return errorResponse(
      res,
      403,
      `Access denied. This route is restricted to: ${roles.join(', ')}.`
    );
  }

  next();
};

/**
 * requireVerified
 * Blocks access for Doctors/Hospitals/Labs whose accounts
 * are still pending or have been rejected.
 *
 * Always use AFTER authenticate and authorizeRoles.
 *
 * Usage:
 *   router.post('/appointments', authenticate, authorizeRoles('doctor'), requireVerified, handler)
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 401, 'Authentication required.');
  }

  // Patients and admins are always considered verified
  if (!ROLES_REQUIRING_VERIFICATION.includes(req.user.role)) {
    return next();
  }

  if (req.user.verificationStatus === VERIFICATION_STATUS.APPROVED) {
    return next();
  }

  if (req.user.verificationStatus === VERIFICATION_STATUS.PENDING) {
    return errorResponse(
      res,
      403,
      'Your account is pending admin verification. You will be notified once approved.'
    );
  }

  if (req.user.verificationStatus === VERIFICATION_STATUS.REJECTED) {
    return errorResponse(
      res,
      403,
      `Your account was rejected. Reason: ${req.user.rejectionReason || 'Not specified'}. Please update your documents and resubmit.`
    );
  }

  return errorResponse(res, 403, 'Account verification required.');
};

module.exports = { authorizeRoles, requireVerified };
