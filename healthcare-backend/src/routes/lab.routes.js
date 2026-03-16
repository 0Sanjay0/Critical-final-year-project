// ═══════════════════════════════════════════════════════════
//  routes/lab.routes.js
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();

const { uploadReport, getUploadedReports, searchPatient } = require('../controllers/lab.controller');
const { authenticate }    = require('../middleware/auth.middleware');
const { authorizeRoles, requireVerified } = require('../middleware/role.middleware');
const { medicalUpload }   = require('../config/multer');
const { ROLES }           = require('../utils/constants');

router.use(authenticate);
router.use(authorizeRoles(ROLES.LAB));
router.use(requireVerified);

// GET  /api/lab/patients/search?email=patient@email.com
router.get('/patients/search', searchPatient);

// GET  /api/lab/reports
router.get('/reports', getUploadedReports);

// POST /api/lab/upload-report  (multipart/form-data)
// Fields: file (required), patientEmail, title, testName, description, recordDate
router.post(
  '/upload-report',
  medicalUpload.single('file'),
  uploadReport
);

module.exports = router;
