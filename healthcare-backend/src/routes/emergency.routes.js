const express = require('express');
const router  = express.Router();

const {
  getEmergencyData,
  getMyQRInfo,
  regenerateQRImage,
  getEmergencyLogs,
} = require('../controllers/emergency.controller');

const { authenticate }   = require('../middleware/auth.middleware');
const { optionalAuth }   = require('../middleware/optionalAuth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { ROLES }          = require('../utils/constants');

// Public (optional auth) — the URL the QR code always points to
router.get('/patient/:qrId', optionalAuth, getEmergencyData);

// Patient — own QR info
router.get('/qr-info',      authenticate, authorizeRoles(ROLES.PATIENT), getMyQRInfo);
router.post('/regenerate-qr', authenticate, authorizeRoles(ROLES.PATIENT), regenerateQRImage);

// Admin — audit logs
router.get('/logs', authenticate, authorizeRoles(ROLES.ADMIN), getEmergencyLogs);

module.exports = router;
