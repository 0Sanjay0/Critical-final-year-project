// ═══════════════════════════════════════════════════════════
//  controllers/patient.controller.js
// ═══════════════════════════════════════════════════════════

const Patient       = require('../models/Patient.model');
const MedicalRecord = require('../models/MedicalRecord.model');
const User          = require('../models/User.model');

const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler  = require('../utils/asyncHandler');
const { MEDICAL_RECORD_TYPES } = require('../utils/constants');

// ── Helper: get or create patient profile ──────────────────
const getOrCreateProfile = async (userId) => {
  let profile = await Patient.findOne({ user: userId });
  if (!profile) {
    profile = await Patient.create({ user: userId });
  }
  return profile;
};

// ═══════════════════════════════════════════════════════════
//  GET /api/patient/profile
//  Get own full medical profile
// ═══════════════════════════════════════════════════════════
const getProfile = asyncHandler(async (req, res) => {
  const profile = await Patient.findOne({ user: req.user._id })
    .populate('user', '-password');

  if (!profile) {
    // Return empty profile structure rather than 404
    return successResponse(res, 200, 'Profile not yet set up.', { profile: null });
  }

  return successResponse(res, 200, 'Patient profile fetched.', { profile });
});

// ═══════════════════════════════════════════════════════════
//  PUT /api/patient/profile
//  Update core medical info (blood group, height, weight etc.)
// ═══════════════════════════════════════════════════════════
const updateProfile = asyncHandler(async (req, res) => {
  const allowed = [
    'bloodGroup', 'height', 'weight',
    'isOrganDonor', 'organDonorDetails',
    'insuranceProvider', 'insurancePolicyNo', 'notes',
  ];

  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const profile = await Patient.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  ).populate('user', '-password');

  return successResponse(res, 200, 'Medical profile updated.', { profile });
});

// ═══════════════════════════════════════════════════════════
//  ALLERGIES
// ═══════════════════════════════════════════════════════════

// POST /api/patient/allergies
const addAllergy = asyncHandler(async (req, res) => {
  const { allergen, reaction, severity } = req.body;
  if (!allergen) return errorResponse(res, 400, 'allergen is required.');

  const profile = await getOrCreateProfile(req.user._id);
  profile.allergies.push({ allergen, reaction, severity });
  await profile.save();

  return successResponse(res, 201, 'Allergy added.', {
    allergies: profile.allergies,
  });
});

// DELETE /api/patient/allergies/:allergyId
const removeAllergy = asyncHandler(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);
  const before  = profile.allergies.length;
  profile.allergies = profile.allergies.filter(
    (a) => a._id.toString() !== req.params.allergyId
  );

  if (profile.allergies.length === before) {
    return errorResponse(res, 404, 'Allergy not found.');
  }

  await profile.save();
  return successResponse(res, 200, 'Allergy removed.', { allergies: profile.allergies });
});

// ═══════════════════════════════════════════════════════════
//  CHRONIC DISEASES
// ═══════════════════════════════════════════════════════════

// POST /api/patient/diseases
const addDisease = asyncHandler(async (req, res) => {
  const { name, diagnosedDate, notes } = req.body;
  if (!name) return errorResponse(res, 400, 'Disease name is required.');

  const profile = await getOrCreateProfile(req.user._id);
  profile.chronicDiseases.push({ name, diagnosedDate, notes });
  await profile.save();

  return successResponse(res, 201, 'Chronic disease added.', {
    chronicDiseases: profile.chronicDiseases,
  });
});

// DELETE /api/patient/diseases/:diseaseId
const removeDisease = asyncHandler(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);
  const before  = profile.chronicDiseases.length;
  profile.chronicDiseases = profile.chronicDiseases.filter(
    (d) => d._id.toString() !== req.params.diseaseId
  );

  if (profile.chronicDiseases.length === before) {
    return errorResponse(res, 404, 'Disease record not found.');
  }

  await profile.save();
  return successResponse(res, 200, 'Disease removed.', {
    chronicDiseases: profile.chronicDiseases,
  });
});

// ═══════════════════════════════════════════════════════════
//  MEDICATIONS
// ═══════════════════════════════════════════════════════════

// POST /api/patient/medications
const addMedication = asyncHandler(async (req, res) => {
  const { name, dosage, frequency, startDate, endDate, notes } = req.body;
  if (!name) return errorResponse(res, 400, 'Medication name is required.');

  const profile = await getOrCreateProfile(req.user._id);
  profile.medications.push({ name, dosage, frequency, startDate, endDate, notes });
  await profile.save();

  return successResponse(res, 201, 'Medication added.', {
    medications: profile.medications,
  });
});

// PUT /api/patient/medications/:medicationId
const updateMedication = asyncHandler(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);
  const med     = profile.medications.id(req.params.medicationId);

  if (!med) return errorResponse(res, 404, 'Medication not found.');

  const fields = ['name', 'dosage', 'frequency', 'startDate', 'endDate', 'notes'];
  fields.forEach((f) => { if (req.body[f] !== undefined) med[f] = req.body[f]; });

  await profile.save();
  return successResponse(res, 200, 'Medication updated.', { medications: profile.medications });
});

// DELETE /api/patient/medications/:medicationId
const removeMedication = asyncHandler(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);
  const before  = profile.medications.length;
  profile.medications = profile.medications.filter(
    (m) => m._id.toString() !== req.params.medicationId
  );

  if (profile.medications.length === before) {
    return errorResponse(res, 404, 'Medication not found.');
  }

  await profile.save();
  return successResponse(res, 200, 'Medication removed.', { medications: profile.medications });
});

// ═══════════════════════════════════════════════════════════
//  EMERGENCY CONTACTS
// ═══════════════════════════════════════════════════════════

// POST /api/patient/emergency-contacts
const addEmergencyContact = asyncHandler(async (req, res) => {
  const { name, relationship, phone, email } = req.body;
  if (!name || !relationship || !phone) {
    return errorResponse(res, 400, 'name, relationship, and phone are required.');
  }

  const profile = await getOrCreateProfile(req.user._id);

  if (profile.emergencyContacts.length >= 5) {
    return errorResponse(res, 400, 'Maximum 5 emergency contacts allowed.');
  }

  profile.emergencyContacts.push({ name, relationship, phone, email });
  await profile.save();

  return successResponse(res, 201, 'Emergency contact added.', {
    emergencyContacts: profile.emergencyContacts,
  });
});

// PUT /api/patient/emergency-contacts/:contactId
const updateEmergencyContact = asyncHandler(async (req, res) => {
  const profile  = await getOrCreateProfile(req.user._id);
  const contact  = profile.emergencyContacts.id(req.params.contactId);

  if (!contact) return errorResponse(res, 404, 'Emergency contact not found.');

  const fields = ['name', 'relationship', 'phone', 'email'];
  fields.forEach((f) => { if (req.body[f] !== undefined) contact[f] = req.body[f]; });

  await profile.save();
  return successResponse(res, 200, 'Emergency contact updated.', {
    emergencyContacts: profile.emergencyContacts,
  });
});

// DELETE /api/patient/emergency-contacts/:contactId
const removeEmergencyContact = asyncHandler(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);
  const before  = profile.emergencyContacts.length;
  profile.emergencyContacts = profile.emergencyContacts.filter(
    (c) => c._id.toString() !== req.params.contactId
  );

  if (profile.emergencyContacts.length === before) {
    return errorResponse(res, 404, 'Emergency contact not found.');
  }

  await profile.save();
  return successResponse(res, 200, 'Emergency contact removed.', {
    emergencyContacts: profile.emergencyContacts,
  });
});

// ═══════════════════════════════════════════════════════════
//  MEDICAL RECORDS (File Uploads)
// ═══════════════════════════════════════════════════════════

// POST /api/patient/records/upload
const uploadRecord = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, 400, 'No file uploaded. Please attach a file.');
  }

  const { title, description, recordType, issuedBy, recordDate } = req.body;

  if (!title) return errorResponse(res, 400, 'title is required.');

  const validTypes = Object.values(MEDICAL_RECORD_TYPES);
  if (!recordType || !validTypes.includes(recordType)) {
    return errorResponse(res, 400, `recordType must be one of: ${validTypes.join(', ')}`);
  }

  const record = await MedicalRecord.create({
    patient:      req.user._id,
    recordType,
    title,
    description:  description  || undefined,
    filePath:     req.file.path.replace(/\\/g, '/'),
    fileSize:     req.file.size,
    mimeType:     req.file.mimetype,
    originalName: req.file.originalname,
    issuedBy:     issuedBy     || undefined,
    recordDate:   recordDate   || undefined,
  });

  return successResponse(res, 201, 'Medical record uploaded successfully.', { record });
});

// GET /api/patient/records
// Optional query: ?type=prescription|lab_report|document
const getRecords = asyncHandler(async (req, res) => {
  const filter = { patient: req.user._id, isActive: true };
  if (req.query.type) filter.recordType = req.query.type;

  const records = await MedicalRecord.find(filter).sort({ recordDate: -1 });

  return successResponse(res, 200, 'Medical records fetched.', {
    count: records.length,
    records,
  });
});

// GET /api/patient/records/:recordId
const getRecordById = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findOne({
    _id:     req.params.recordId,
    patient: req.user._id,
    isActive: true,
  });

  if (!record) return errorResponse(res, 404, 'Record not found.');

  return successResponse(res, 200, 'Record fetched.', { record });
});

// DELETE /api/patient/records/:recordId  (soft delete)
const deleteRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findOne({
    _id:     req.params.recordId,
    patient: req.user._id,
  });

  if (!record) return errorResponse(res, 404, 'Record not found.');

  record.isActive = false;
  await record.save();

  return successResponse(res, 200, 'Record deleted.');
});

// ═══════════════════════════════════════════════════════════
//  GET /api/patient/summary
//  Complete medical summary (used internally by emergency/QR)
// ═══════════════════════════════════════════════════════════
const getMedicalSummary = asyncHandler(async (req, res) => {
  const [profile, records] = await Promise.all([
    Patient.findOne({ user: req.user._id }).populate('user', '-password'),
    MedicalRecord.find({ patient: req.user._id, isActive: true }).sort({ recordDate: -1 }),
  ]);

  const prescriptions = records.filter((r) => r.recordType === MEDICAL_RECORD_TYPES.PRESCRIPTION);
  const labReports    = records.filter((r) => r.recordType === MEDICAL_RECORD_TYPES.LAB_REPORT);
  const documents     = records.filter((r) => r.recordType === MEDICAL_RECORD_TYPES.DOCUMENT);

  return successResponse(res, 200, 'Medical summary fetched.', {
    profile,
    records: { prescriptions, labReports, documents },
  });
});

module.exports = {
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
};
