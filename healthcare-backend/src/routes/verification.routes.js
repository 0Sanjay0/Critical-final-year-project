// ═══════════════════════════════════════════════════════════
//  routes/verification.routes.js
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();

const {
  setupDoctorProfile,
  setupHospitalProfile,
  setupLabProfile,
  getOwnProfile,
} = require('../controllers/verification.controller');

const { authenticate }       = require('../middleware/auth.middleware');
const { authorizeRoles }     = require('../middleware/role.middleware');
const { verificationUpload } = require('../config/multer');
const { ROLES }              = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// ── Doctor profile setup ───────────────────────────────────
// multipart/form-data with 3 file fields
router.post(
  '/doctor/setup',
  authorizeRoles(ROLES.DOCTOR),
  verificationUpload.fields([
    { name: 'registrationDoc', maxCount: 1 },
    { name: 'licenseDoc',      maxCount: 1 },
    { name: 'authorizationDoc',maxCount: 1 },
  ]),
  setupDoctorProfile
);

// ── Hospital profile setup ─────────────────────────────────
router.post(
  '/hospital/setup',
  authorizeRoles(ROLES.HOSPITAL),
  verificationUpload.fields([
    { name: 'registrationDoc', maxCount: 1 },
    { name: 'licenseDoc',      maxCount: 1 },
    { name: 'authorizationDoc',maxCount: 1 },
  ]),
  setupHospitalProfile
);

// ── Lab profile setup ──────────────────────────────────────
router.post(
  '/lab/setup',
  authorizeRoles(ROLES.LAB),
  verificationUpload.fields([
    { name: 'registrationDoc', maxCount: 1 },
    { name: 'licenseDoc',      maxCount: 1 },
    { name: 'authorizationDoc',maxCount: 1 },
  ]),
  setupLabProfile
);

// ── Get own professional profile ───────────────────────────
router.get(
  '/profile',
  authorizeRoles(ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.LAB),
  getOwnProfile
);

module.exports = router;
