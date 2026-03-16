const User          = require('../models/User.model');
const Patient       = require('../models/Patient.model');
const MedicalRecord = require('../models/MedicalRecord.model');
const EmergencyLog  = require('../models/EmergencyLog.model');

const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler  = require('../utils/asyncHandler');
const { ROLES, MEDICAL_RECORD_TYPES, VERIFICATION_STATUS } = require('../utils/constants');

// ── Log every QR scan ──────────────────────────────────────
const logAccess = async (req, patientUser, accessLevel) => {
  try {
    const requester = req.user;
    await EmergencyLog.create({
      patient:      patientUser._id,
      qrId:         patientUser.qrId,
      accessedBy:   requester?._id || null,
      accessorRole: requester?.role || 'public',
      accessorName: requester
        ? `${requester.firstName} ${requester.lastName}`
        : 'Anonymous (Public)',
      accessLevel,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent']?.slice(0, 200) || null,
    });
  } catch { /* never crash on log failure */ }
};

const buildDoctorPayload   = (user, patient, records) => ({
  accessLevel: 'full',
  patient: {
    id: user._id, fullName: user.fullName,
    firstName: user.firstName, lastName: user.lastName,
    email: user.email, phone: user.phone,
    dateOfBirth: user.dateOfBirth, age: user.age,
    gender: user.gender, address: user.address,
    profilePicture: user.profilePicture,
    bloodGroup: patient?.bloodGroup || 'unknown',
    height: patient?.height || null, weight: patient?.weight || null,
    bmi: patient?.bmi || null, isOrganDonor: patient?.isOrganDonor || false,
    allergies: patient?.allergies || [],
    chronicDiseases: patient?.chronicDiseases || [],
    medications: patient?.medications || [],
    emergencyContacts: patient?.emergencyContacts || [],
    insuranceProvider: patient?.insuranceProvider || null,
    notes: patient?.notes || null,
  },
  records: {
    prescriptions: records.filter(r => r.recordType === MEDICAL_RECORD_TYPES.PRESCRIPTION),
    labReports:    records.filter(r => r.recordType === MEDICAL_RECORD_TYPES.LAB_REPORT),
    documents:     records.filter(r => r.recordType === MEDICAL_RECORD_TYPES.DOCUMENT),
  },
});

const buildHospitalPayload = (user, patient) => ({
  accessLevel: 'emergency_essential',
  patient: {
    fullName: user.fullName, age: user.age,
    gender: user.gender, dateOfBirth: user.dateOfBirth,
    bloodGroup: patient?.bloodGroup || 'unknown',
    allergies: patient?.allergies || [],
    chronicDiseases: patient?.chronicDiseases || [],
    medications: patient?.medications || [],
    isOrganDonor: patient?.isOrganDonor || false,
    emergencyContacts: patient?.emergencyContacts || [],
  },
  records: null,
  note: 'Records restricted. Contact patient or doctor for full history.',
});

const buildPublicPayload   = (user, patient) => ({
  accessLevel: 'public_emergency',
  patient: {
    fullName: user.fullName,
    bloodGroup: patient?.bloodGroup || 'unknown',
    allergies: (patient?.allergies || []).map(a => ({ allergen: a.allergen, severity: a.severity })),
    emergencyContacts: (patient?.emergencyContacts || []).map(c => ({
      name: c.name, relationship: c.relationship, phone: c.phone,
    })),
    isOrganDonor: patient?.isOrganDonor || false,
  },
  records: null,
  note: 'For full access, scan with an authenticated doctor or hospital account.',
});

// ═══════════════════════════════════════════════════════════
//  GET /api/emergency/patient/:qrId
// ═══════════════════════════════════════════════════════════
const getEmergencyData = asyncHandler(async (req, res) => {
  const { qrId } = req.params;
  const patientUser = await User.findOne({ qrId, role: ROLES.PATIENT });

  if (!patientUser) return errorResponse(res, 404, 'Invalid QR code. Patient not found.');

  const patientProfile = await Patient.findOne({ user: patientUser._id });
  const requester = req.user;

  if (!requester) {
    const payload = buildPublicPayload(patientUser, patientProfile);
    await logAccess(req, patientUser, 'public_emergency');
    return successResponse(res, 200, 'Emergency data retrieved (public access).', payload);
  }

  if (requester.role === ROLES.DOCTOR) {
    if (requester.verificationStatus !== VERIFICATION_STATUS.APPROVED)
      return errorResponse(res, 403, 'Your account is not yet approved.');
    const records = await MedicalRecord.find({ patient: patientUser._id, isActive: true }).sort({ recordDate: -1 });
    const payload = buildDoctorPayload(patientUser, patientProfile, records);
    await logAccess(req, patientUser, 'full');
    return successResponse(res, 200, 'Full patient data retrieved.', payload);
  }

  if (requester.role === ROLES.HOSPITAL) {
    if (requester.verificationStatus !== VERIFICATION_STATUS.APPROVED)
      return errorResponse(res, 403, 'Your account is not yet approved.');
    const payload = buildHospitalPayload(patientUser, patientProfile);
    await logAccess(req, patientUser, 'emergency_essential');
    return successResponse(res, 200, 'Emergency patient data retrieved (essential only).', payload);
  }

  if (requester.role === ROLES.PATIENT) {
    const payload = buildPublicPayload(patientUser, patientProfile);
    await logAccess(req, patientUser, 'public_emergency');
    return successResponse(res, 200, 'Your emergency QR preview.', payload);
  }

  return errorResponse(res, 403, 'Your role does not have emergency access permission.');
});

// ═══════════════════════════════════════════════════════════
//  GET /api/emergency/qr-info  (patient only)
// ═══════════════════════════════════════════════════════════
const getMyQRInfo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.role !== ROLES.PATIENT) return errorResponse(res, 403, 'Only patients have a QR code.');
  if (!user.qrId)                  return errorResponse(res, 404, 'QR code not found.');

  const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  return successResponse(res, 200, 'QR info fetched.', {
    qrId:         user.qrId,
    qrImageUrl:   `${serverUrl}/qr/${user.qrId}.png`,
    emergencyUrl: `${clientUrl}/emergency/${user.qrId}`,
    apiEndpoint:  `${serverUrl}/api/emergency/patient/${user.qrId}`,
  });
});

// ═══════════════════════════════════════════════════════════
//  POST /api/emergency/regenerate-qr  (patient only)
// ═══════════════════════════════════════════════════════════
const regenerateQRImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.role !== ROLES.PATIENT) return errorResponse(res, 403, 'Only patients can regenerate their QR code.');
  if (!user.qrId)                  return errorResponse(res, 404, 'No QR ID found.');

  const { generatePatientQR } = require('../services/qr.service');
  await generatePatientQR(user.qrId);

  const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
  return successResponse(res, 200, 'QR code image regenerated.', {
    qrId: user.qrId,
    qrImageUrl: `${serverUrl}/qr/${user.qrId}.png`,
  });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/emergency/logs  (admin only)
// ═══════════════════════════════════════════════════════════
const getEmergencyLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, patientId, role } = req.query;
  const filter = {};
  if (patientId) filter.patient = patientId;
  if (role)      filter.accessorRole = role;

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await EmergencyLog.countDocuments(filter);
  const logs  = await EmergencyLog.find(filter)
    .populate('patient',    'firstName lastName email qrId')
    .populate('accessedBy', 'firstName lastName email role')
    .sort({ accessedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return successResponse(res, 200, 'Emergency access logs fetched.', {
    logs,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  });
});

module.exports = { getEmergencyData, getMyQRInfo, regenerateQRImage, getEmergencyLogs };
