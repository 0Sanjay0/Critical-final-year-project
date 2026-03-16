// ═══════════════════════════════════════════════════════════
//  controllers/lab.controller.js
//  Lab uploads a report file directly to a patient's records
// ═══════════════════════════════════════════════════════════

const MedicalRecord = require('../models/MedicalRecord.model');
const User          = require('../models/User.model');

const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler  = require('../utils/asyncHandler');
const { ROLES, MEDICAL_RECORD_TYPES, VERIFICATION_STATUS } = require('../utils/constants');

// ═══════════════════════════════════════════════════════════
//  POST /api/lab/upload-report
//
//  Lab uploads a report file to a specific patient.
//  Patient is identified by their email (lab looks up on system).
//  A MedicalRecord of type lab_report is created and linked
//  to the patient automatically.
// ═══════════════════════════════════════════════════════════
const uploadReport = asyncHandler(async (req, res) => {
  const { patientEmail, title, description, testName, recordDate } = req.body;

  // ── 1. File is required ───────────────────────────────────
  if (!req.file) {
    return errorResponse(res, 400, 'Report file is required. Please attach a PDF or image.');
  }

  if (!patientEmail) {
    return errorResponse(res, 400, 'patientEmail is required to identify the patient.');
  }

  if (!title && !testName) {
    return errorResponse(res, 400, 'Provide a title or testName for the report.');
  }

  // ── 2. Find the patient by email ──────────────────────────
  const patient = await User.findOne({
    email:    patientEmail.toLowerCase().trim(),
    role:     ROLES.PATIENT,
    isActive: true,
  });

  if (!patient) {
    return errorResponse(res, 404, `No patient account found with email: ${patientEmail}`);
  }

  const labName = req.user.firstName
    ? `${req.user.firstName} ${req.user.lastName} Lab`
    : 'Diagnostic Lab';

  // ── 3. Create the MedicalRecord ───────────────────────────
  const record = await MedicalRecord.create({
    patient:      patient._id,
    recordType:   MEDICAL_RECORD_TYPES.LAB_REPORT,
    title:        title || `${testName} — ${labName}`,
    description:  description || `Lab report issued by ${labName}`,
    filePath:     req.file.path.replace(/\\/g, '/'),
    fileSize:     req.file.size,
    mimeType:     req.file.mimetype,
    originalName: req.file.originalname,
    issuedBy:     labName,
    recordDate:   recordDate ? new Date(recordDate) : new Date(),
    sharedWith:   [req.user._id], // Lab can always see records it uploaded
  });

  return successResponse(res, 201,
    `Lab report uploaded successfully for patient: ${patient.firstName} ${patient.lastName}.`,
    {
      record,
      patient: {
        id:        patient._id,
        firstName: patient.firstName,
        lastName:  patient.lastName,
        email:     patient.email,
      },
    }
  );
});

// ═══════════════════════════════════════════════════════════
//  GET /api/lab/reports
//  All reports this lab has uploaded (their own history)
// ═══════════════════════════════════════════════════════════
const getUploadedReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const labName = req.user.firstName
    ? `${req.user.firstName} ${req.user.lastName} Lab`
    : 'Diagnostic Lab';

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await MedicalRecord.countDocuments({
    issuedBy:   labName,
    recordType: MEDICAL_RECORD_TYPES.LAB_REPORT,
    isActive:   true,
  });

  const reports = await MedicalRecord.find({
    issuedBy:   labName,
    recordType: MEDICAL_RECORD_TYPES.LAB_REPORT,
    isActive:   true,
  })
    .populate('patient', 'firstName lastName email')
    .sort({ recordDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return successResponse(res, 200, 'Lab reports fetched.', {
    reports,
    pagination: {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/lab/patients/search?email=...
//  Search for a patient before uploading (UX helper)
// ═══════════════════════════════════════════════════════════
const searchPatient = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) return errorResponse(res, 400, 'email query parameter is required.');

  const patient = await User.findOne({
    email:    email.toLowerCase().trim(),
    role:     ROLES.PATIENT,
    isActive: true,
  }).select('firstName lastName email profilePicture dateOfBirth');

  if (!patient) {
    return errorResponse(res, 404, `No patient found with email: ${email}`);
  }

  return successResponse(res, 200, 'Patient found.', { patient });
});

module.exports = { uploadReport, getUploadedReports, searchPatient };
