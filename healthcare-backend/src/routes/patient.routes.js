// ═══════════════════════════════════════════════════════════
//  routes/patient.routes.js
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();

const {
  getProfile,
  updateProfile,
  addAllergy,
  removeAllergy,
  addDisease,
  removeDisease,
  addMedication,
  updateMedication,
  removeMedication,
  addEmergencyContact,
  updateEmergencyContact,
  removeEmergencyContact,
  uploadRecord,
  getRecords,
  getRecordById,
  deleteRecord,
  getMedicalSummary,
} = require('../controllers/patient.controller');

const { authenticate }   = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { medicalUpload }  = require('../config/multer');
const { ROLES }          = require('../utils/constants');

// All routes: must be authenticated patient
router.use(authenticate);
router.use(authorizeRoles(ROLES.PATIENT));

// ── Profile ────────────────────────────────────────────────
router.get ('/profile',  getProfile);
router.put ('/profile',  updateProfile);
router.get ('/summary',  getMedicalSummary);

// ── Allergies ──────────────────────────────────────────────
router.post  ('/allergies',          addAllergy);
router.delete('/allergies/:allergyId', removeAllergy);

// ── Chronic diseases ───────────────────────────────────────
router.post  ('/diseases',           addDisease);
router.delete('/diseases/:diseaseId',  removeDisease);

// ── Medications ────────────────────────────────────────────
router.post  ('/medications',               addMedication);
router.put   ('/medications/:medicationId', updateMedication);
router.delete('/medications/:medicationId', removeMedication);

// ── Emergency contacts ─────────────────────────────────────
router.post  ('/emergency-contacts',            addEmergencyContact);
router.put   ('/emergency-contacts/:contactId', updateEmergencyContact);
router.delete('/emergency-contacts/:contactId', removeEmergencyContact);

// ── Medical records (file uploads) ────────────────────────
router.post('/records/upload',
  medicalUpload.single('file'),
  uploadRecord
);
router.get   ('/records',           getRecords);
router.get   ('/records/:recordId', getRecordById);
router.delete('/records/:recordId', deleteRecord);

module.exports = router;
