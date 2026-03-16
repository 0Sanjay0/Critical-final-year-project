// ═══════════════════════════════════════════════════════════
//  controllers/verification.controller.js
// ═══════════════════════════════════════════════════════════

const Doctor   = require('../models/Doctor.model');
const Hospital = require('../models/Hospital.model');
const Lab      = require('../models/Lab.model');
const User     = require('../models/User.model');

const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { VERIFICATION_STATUS, VERIFICATION_DOC_TYPES } = require('../utils/constants');

// ── Safe JSON parse helper ─────────────────────────────────
const safeParseArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; }
  catch { return typeof val === 'string' ? val.split(',').map(s=>s.trim()).filter(Boolean) : []; }
};

// ── Helper: parse uploaded files into verificationDocs array ──
const extractVerificationDocs = (files) => {
  const docs = [];
  const map = {
    registrationDoc:  VERIFICATION_DOC_TYPES.REGISTRATION,
    licenseDoc:       VERIFICATION_DOC_TYPES.LICENSE,
    authorizationDoc: VERIFICATION_DOC_TYPES.AUTHORIZATION,
  };
  for (const [fieldName, docType] of Object.entries(map)) {
    if (files[fieldName]?.[0]) {
      docs.push({
        docType,
        filePath: files[fieldName][0].path.replace(/\\/g, '/'),
      });
    }
  }
  return docs;
};

// ═══════════════════════════════════════════════════════════
//  DOCTOR — POST /api/verification/doctor/setup
// ═══════════════════════════════════════════════════════════
const setupDoctorProfile = asyncHandler(async (req, res) => {
  const userId  = req.user._id;
  const existing = await Doctor.findOne({ user: userId });

  const {
    specialization, licenseNumber, qualifications,
    experience, consultationFee,
    availableDays, availableTimeStart, availableTimeEnd, bio,
  } = req.body;

  if (!specialization || !licenseNumber) {
    return errorResponse(res, 400, 'specialization and licenseNumber are required.');
  }

  const verificationDocs = extractVerificationDocs(req.files || {});
  const docTypes = verificationDocs.map(d => d.docType);
  const missing  = Object.values(VERIFICATION_DOC_TYPES).filter(t => !docTypes.includes(t));

  if (!existing && missing.length > 0) {
    return errorResponse(res, 400,
      `Missing required documents: ${missing.join(', ')}. Please upload all 3 documents.`
    );
  }

  // Model enum uses lowercase days — normalise whatever the client sends
  const parsedDays = safeParseArray(availableDays).map(d => d.toLowerCase());

  const profileData = {
    user:               userId,
    specialization:     specialization.trim(),
    licenseNumber:      licenseNumber.trim(),
    qualifications:     safeParseArray(qualifications),
    experience:         experience      ? Number(experience)      : undefined,

    consultationFee:    consultationFee ? Number(consultationFee) : undefined,
    availableDays:      parsedDays,
    availableTimeStart: availableTimeStart || undefined,
    availableTimeEnd:   availableTimeEnd   || undefined,
    bio:                bio               || undefined,
    verificationDocs,
  };

  let doctorProfile;
  if (existing) {
    Object.assign(existing, profileData);
    if (verificationDocs.length > 0) existing.verificationDocs = verificationDocs;
    doctorProfile = await existing.save();
  } else {
    doctorProfile = await Doctor.create(profileData);
  }

  await User.findByIdAndUpdate(userId, {
    verificationStatus: VERIFICATION_STATUS.PENDING,
    rejectionReason:    null,
  });

  return successResponse(res, 201,
    'Doctor profile submitted for verification.',
    { profile: doctorProfile }
  );
});

// ═══════════════════════════════════════════════════════════
//  HOSPITAL — POST /api/verification/hospital/setup
// ═══════════════════════════════════════════════════════════
const setupHospitalProfile = asyncHandler(async (req, res) => {
  const userId  = req.user._id;
  const existing = await Hospital.findOne({ user: userId });

  const {
    hospitalName, registrationNumber, hospitalType,
    specialties, totalBeds, emergencyServices,
    website, address, contactEmail, contactPhone,
  } = req.body;

  if (!hospitalName || !registrationNumber) {
    return errorResponse(res, 400, 'hospitalName and registrationNumber are required.');
  }

  const verificationDocs = extractVerificationDocs(req.files || {});
  const docTypes = verificationDocs.map(d => d.docType);
  const missing  = Object.values(VERIFICATION_DOC_TYPES).filter(t => !docTypes.includes(t));

  if (!existing && missing.length > 0) {
    return errorResponse(res, 400, `Missing required documents: ${missing.join(', ')}.`);
  }

  const profileData = {
    user:              userId,
    hospitalName:      hospitalName.trim(),
    registrationNumber: registrationNumber.trim(),
    hospitalType:      hospitalType      || 'private',
    specialties:       safeParseArray(specialties),
    totalBeds:         totalBeds         ? Number(totalBeds) : undefined,
    emergencyServices: emergencyServices === 'true' || emergencyServices === true,
    website:           website           || undefined,
    address:           address           ? (typeof address === 'string' ? JSON.parse(address) : address) : {},
    contactEmail:      contactEmail      || undefined,
    contactPhone:      contactPhone      || undefined,
    verificationDocs,
  };

  let hospitalProfile;
  if (existing) {
    Object.assign(existing, profileData);
    if (verificationDocs.length > 0) existing.verificationDocs = verificationDocs;
    hospitalProfile = await existing.save();
  } else {
    hospitalProfile = await Hospital.create(profileData);
  }

  await User.findByIdAndUpdate(userId, {
    verificationStatus: VERIFICATION_STATUS.PENDING,
    rejectionReason:    null,
  });

  return successResponse(res, 201, 'Hospital profile submitted for verification.', { profile: hospitalProfile });
});

// ═══════════════════════════════════════════════════════════
//  LAB — POST /api/verification/lab/setup
// ═══════════════════════════════════════════════════════════
const setupLabProfile = asyncHandler(async (req, res) => {
  const userId  = req.user._id;
  const existing = await Lab.findOne({ user: userId });

  const {
    labName, registrationNumber, labType,
    testsOffered, operatingHours, homeCollection,
    address, contactEmail, contactPhone,
  } = req.body;

  if (!labName || !registrationNumber) {
    return errorResponse(res, 400, 'labName and registrationNumber are required.');
  }

  const verificationDocs = extractVerificationDocs(req.files || {});
  const docTypes = verificationDocs.map(d => d.docType);
  const missing  = Object.values(VERIFICATION_DOC_TYPES).filter(t => !docTypes.includes(t));

  if (!existing && missing.length > 0) {
    return errorResponse(res, 400, `Missing required documents: ${missing.join(', ')}.`);
  }

  const profileData = {
    user:           userId,
    labName:        labName.trim(),
    registrationNumber: registrationNumber.trim(),
    labType:        labType        || 'diagnostic',
    testsOffered:   safeParseArray(testsOffered),
    operatingHours: operatingHours || undefined,
    homeCollection: homeCollection === 'true' || homeCollection === true,
    address:        address        ? (typeof address === 'string' ? JSON.parse(address) : address) : {},
    contactEmail:   contactEmail   || undefined,
    contactPhone:   contactPhone   || undefined,
    verificationDocs,
  };

  let labProfile;
  if (existing) {
    Object.assign(existing, profileData);
    if (verificationDocs.length > 0) existing.verificationDocs = verificationDocs;
    labProfile = await existing.save();
  } else {
    labProfile = await Lab.create(profileData);
  }

  await User.findByIdAndUpdate(userId, {
    verificationStatus: VERIFICATION_STATUS.PENDING,
    rejectionReason:    null,
  });

  return successResponse(res, 201, 'Lab profile submitted for verification.', { profile: labProfile });
});

// ═══════════════════════════════════════════════════════════
//  GET own profile — GET /api/verification/profile
//  Returns profile:null (200) if not submitted yet — NOT 404
// ═══════════════════════════════════════════════════════════
const getOwnProfile = asyncHandler(async (req, res) => {
  const { role } = req.user;
  const userId   = req.user._id;

  const ModelMap = { doctor: Doctor, hospital: Hospital, lab: Lab };
  const Model    = ModelMap[role];

  if (!Model) {
    return errorResponse(res, 400, 'This endpoint is only for doctors, hospitals, and labs.');
  }

  const profile = await Model.findOne({ user: userId }).populate('user', '-password');

  // Return 200 with profile:null when not submitted — frontend handles gracefully
  return successResponse(res, 200, profile ? 'Profile fetched.' : 'No profile yet.', { profile: profile || null });
});

module.exports = {
  setupDoctorProfile,
  setupHospitalProfile,
  setupLabProfile,
  getOwnProfile,
};
