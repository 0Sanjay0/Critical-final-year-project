const Appointment   = require('../models/Appointment.model');
const User          = require('../models/User.model');
const Patient       = require('../models/Patient.model');
const MedicalRecord = require('../models/MedicalRecord.model');
const Doctor        = require('../models/Doctor.model');
const Hospital      = require('../models/Hospital.model');

const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler  = require('../utils/asyncHandler');
const { ROLES, APPOINTMENT_STATUS, APPOINTMENT_MODE, VERIFICATION_STATUS } = require('../utils/constants');

const POPULATE = [
  { path: 'patient',       select: 'firstName lastName email phone profilePicture' },
  { path: 'doctor',        select: 'firstName lastName email phone profilePicture' },
  { path: 'hospital',      select: 'firstName lastName email' },
  { path: 'sharedRecords', select: 'title recordType filePath fileUrl fileSize mimeType recordDate issuedBy description' },
];

// ══════════════════════════════════════════════════════════════
//  PATIENT: POST /api/appointments
//  Patient requests appointment at a hospital, optionally
//  specifying preferred doctor, date, mode, symptoms, records.
// ══════════════════════════════════════════════════════════════
const bookAppointment = asyncHandler(async (req, res) => {
  const {
    hospitalId, doctorId,
    reasonForVisit, symptoms,
    preferredDate, preferredTime,
    mode, sharedRecordIds,
  } = req.body;

  if (!hospitalId) return errorResponse(res, 400, 'hospitalId is required.');

  // Validate hospital
  const hospital = await User.findOne({
    _id: hospitalId, role: ROLES.HOSPITAL,
    verificationStatus: VERIFICATION_STATUS.APPROVED, isActive: true,
  });
  if (!hospital) return errorResponse(res, 404, 'Hospital not found or not approved.');

  // Validate doctor if provided
  if (doctorId) {
    const doc = await User.findOne({
      _id: doctorId, role: ROLES.DOCTOR,
      verificationStatus: VERIFICATION_STATUS.APPROVED, isActive: true,
    });
    if (!doc) return errorResponse(res, 404, 'Doctor not found or not approved.');
  }

  // Validate shared records belong to patient
  let validatedRecordIds = [];
  if (sharedRecordIds?.length > 0) {
    const records = await MedicalRecord.find({
      _id: { $in: sharedRecordIds }, patient: req.user._id, isActive: true,
    });
    validatedRecordIds = records.map(r => r._id);
  }

  const appointment = await Appointment.create({
    patient:        req.user._id,
    hospital:       hospitalId,
    doctor:         doctorId || null,
    mode:           mode || APPOINTMENT_MODE.OFFLINE,
    reasonForVisit, symptoms,
    preferredDate, preferredTime,
    sharedRecords:  validatedRecordIds,
    status:         APPOINTMENT_STATUS.PENDING_HOSPITAL,
  });

  const populated = await Appointment.findById(appointment._id).populate(POPULATE);
  return successResponse(res, 201, 'Appointment request submitted. Waiting for hospital to schedule.', { appointment: populated });
});

// ══════════════════════════════════════════════════════════════
//  HOSPITAL: PATCH /api/appointments/:id/schedule
//  Hospital assigns doctor, sets date/time/mode/meetingLink
// ══════════════════════════════════════════════════════════════
const scheduleAppointment = asyncHandler(async (req, res) => {
  const { doctorId, appointmentDate, appointmentTime, duration, mode, meetingLink } = req.body;

  if (!doctorId || !appointmentDate || !appointmentTime)
    return errorResponse(res, 400, 'doctorId, appointmentDate, and appointmentTime are required.');

  const appt = await Appointment.findOne({
    _id: req.params.appointmentId,
    hospital: req.user._id,
    status: APPOINTMENT_STATUS.PENDING_HOSPITAL,
  });
  if (!appt) return errorResponse(res, 404, 'Pending appointment not found for your hospital.');

  // Validate doctor
  const doctor = await User.findOne({
    _id: doctorId, role: ROLES.DOCTOR,
    verificationStatus: VERIFICATION_STATUS.APPROVED, isActive: true,
  });
  if (!doctor) return errorResponse(res, 404, 'Doctor not found or not approved.');

  // Check doctor conflict
  const conflict = await Appointment.findOne({
    _id: { $ne: appt._id },
    doctor: doctorId,
    appointmentDate: new Date(appointmentDate),
    appointmentTime,
    status: { $in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.IN_PROGRESS] },
  });
  if (conflict) return errorResponse(res, 409, 'This doctor already has an appointment at that time.');

  appt.doctor          = doctorId;
  appt.appointmentDate = new Date(appointmentDate);
  appt.appointmentTime = appointmentTime;
  appt.duration        = duration || 30;
  appt.mode            = mode || APPOINTMENT_MODE.OFFLINE;
  appt.meetingLink     = (mode === APPOINTMENT_MODE.ONLINE && meetingLink) ? meetingLink : null;
  appt.status          = APPOINTMENT_STATUS.SCHEDULED;
  appt.scheduledAt     = new Date();
  await appt.save();

  const populated = await Appointment.findById(appt._id).populate(POPULATE);
  return successResponse(res, 200, 'Appointment scheduled. Doctor notified.', { appointment: populated });
});

// ══════════════════════════════════════════════════════════════
//  DOCTOR: PATCH /api/appointments/:id/confirm
//  Doctor acknowledges/confirms the scheduled appointment
// ══════════════════════════════════════════════════════════════
const confirmAppointment = asyncHandler(async (req, res) => {
  const appt = await Appointment.findOne({
    _id: req.params.appointmentId,
    doctor: req.user._id,
    status: APPOINTMENT_STATUS.SCHEDULED,
  });
  if (!appt) return errorResponse(res, 404, 'Scheduled appointment not found.');

  appt.status      = APPOINTMENT_STATUS.CONFIRMED;
  appt.confirmedAt = new Date();
  await appt.save();

  const populated = await Appointment.findById(appt._id).populate(POPULATE);
  return successResponse(res, 200, 'Appointment confirmed.', { appointment: populated });
});

// ══════════════════════════════════════════════════════════════
//  DOCTOR: PATCH /api/appointments/:id/reschedule-request
//  Doctor requests a different time (hospital decides)
// ══════════════════════════════════════════════════════════════
const rescheduleRequest = asyncHandler(async (req, res) => {
  const { requestedDate, requestedTime, note } = req.body;
  if (!requestedDate || !requestedTime)
    return errorResponse(res, 400, 'requestedDate and requestedTime are required.');

  const appt = await Appointment.findOne({
    _id: req.params.appointmentId,
    doctor: req.user._id,
    status: { $in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED] },
  });
  if (!appt) return errorResponse(res, 404, 'Appointment not found.');

  appt.status = APPOINTMENT_STATUS.RESCHEDULED;
  appt.rescheduleRequest = {
    requestedDate: new Date(requestedDate),
    requestedTime, note, requestedAt: new Date(),
  };
  await appt.save();

  const populated = await Appointment.findById(appt._id).populate(POPULATE);
  return successResponse(res, 200, 'Reschedule request sent to hospital.', { appointment: populated });
});

// ══════════════════════════════════════════════════════════════
//  HOSPITAL: PATCH /api/appointments/:id/apply-reschedule
//  Hospital applies the doctor's requested reschedule
// ══════════════════════════════════════════════════════════════
const applyReschedule = asyncHandler(async (req, res) => {
  const appt = await Appointment.findOne({
    _id: req.params.appointmentId,
    hospital: req.user._id,
    status: APPOINTMENT_STATUS.RESCHEDULED,
  });
  if (!appt) return errorResponse(res, 404, 'Reschedule request not found.');

  appt.appointmentDate = appt.rescheduleRequest.requestedDate;
  appt.appointmentTime = appt.rescheduleRequest.requestedTime;
  appt.status          = APPOINTMENT_STATUS.CONFIRMED;
  appt.confirmedAt     = new Date();
  await appt.save();

  const populated = await Appointment.findById(appt._id).populate(POPULATE);
  return successResponse(res, 200, 'Reschedule applied.', { appointment: populated });
});

// ══════════════════════════════════════════════════════════════
//  DOCTOR: PATCH /api/appointments/:id/start
//  Doctor marks appointment as in-progress
// ══════════════════════════════════════════════════════════════
const startAppointment = asyncHandler(async (req, res) => {
  const appt = await Appointment.findOne({
    _id: req.params.appointmentId,
    doctor: req.user._id,
    status: APPOINTMENT_STATUS.CONFIRMED,
  });
  if (!appt) return errorResponse(res, 404, 'Confirmed appointment not found.');

  appt.status = APPOINTMENT_STATUS.IN_PROGRESS;
  await appt.save();

  const populated = await Appointment.findById(appt._id).populate(POPULATE);
  return successResponse(res, 200, 'Appointment started.', { appointment: populated });
});

// ══════════════════════════════════════════════════════════════
//  DOCTOR: PATCH /api/appointments/:id/complete
//  Doctor completes appointment and adds notes. Prescription
//  can be text OR a file upload (handled by multer).
// ══════════════════════════════════════════════════════════════
const completeAppointment = asyncHandler(async (req, res) => {
  const { doctorNotes, prescriptionText, followUpDate } = req.body;

  const appt = await Appointment.findOne({
    _id: req.params.appointmentId,
    doctor: req.user._id,
    status: { $in: [APPOINTMENT_STATUS.IN_PROGRESS, APPOINTMENT_STATUS.CONFIRMED] },
  });
  if (!appt) return errorResponse(res, 404, 'Active appointment not found.');

  appt.status      = APPOINTMENT_STATUS.COMPLETED;
  appt.completedAt = new Date();
  appt.doctorNotes = doctorNotes || undefined;
  appt.followUpDate = followUpDate ? new Date(followUpDate) : undefined;

  // Prescription: text or file
  if (prescriptionText || req.file) {
    appt.prescription = {
      text:     prescriptionText || null,
      filePath: req.file ? req.file.path.replace(/\\/g, '/') : null,
      fileUrl:  req.file ? `${process.env.SERVER_URL}/${req.file.path.replace(/\\/g, '/').replace(/^\/+/, '')}` : null,
      issuedAt: new Date(),
    };

    // Also save as a MedicalRecord so patient can see it in their records
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
    await MedicalRecord.create({
      patient:     appt.patient,
      recordType:  'prescription',
      title:       `Prescription from appointment`,
      description: prescriptionText || null,
      filePath:    req.file ? req.file.path.replace(/\\/g, '/') : null,
      fileSize:    req.file ? req.file.size : null,
      mimeType:    req.file ? req.file.mimetype : 'text/plain',
      originalName: req.file ? req.file.originalname : null,
      issuedBy:    `Dr. ${req.user.firstName} ${req.user.lastName}`,
      recordDate:  new Date(),
      sharedWith:  [req.user._id],
    });
  }

  await appt.save();
  const populated = await Appointment.findById(appt._id).populate(POPULATE);
  return successResponse(res, 200, 'Appointment completed and prescription saved.', { appointment: populated });
});

// ══════════════════════════════════════════════════════════════
//  ANY PARTY: PATCH /api/appointments/:id/cancel
// ══════════════════════════════════════════════════════════════
const cancelAppointment = asyncHandler(async (req, res) => {
  const { cancellationNote } = req.body;
  const { role, _id: userId } = req.user;

  const filter = {
    _id: req.params.appointmentId,
    status: { $in: [APPOINTMENT_STATUS.PENDING_HOSPITAL, APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.RESCHEDULED] },
  };
  if (role === ROLES.PATIENT)  filter.patient  = userId;
  if (role === ROLES.DOCTOR)   filter.doctor   = userId;
  if (role === ROLES.HOSPITAL) filter.hospital = userId;

  const appt = await Appointment.findOne(filter);
  if (!appt) return errorResponse(res, 404, 'Cancellable appointment not found.');

  appt.status           = APPOINTMENT_STATUS.CANCELLED;
  appt.cancelledBy      = role;
  appt.cancellationNote = cancellationNote || undefined;
  await appt.save();

  const populated = await Appointment.findById(appt._id).populate(POPULATE);
  return successResponse(res, 200, 'Appointment cancelled.', { appointment: populated });
});

// ══════════════════════════════════════════════════════════════
//  GET /api/appointments — role-filtered list
// ══════════════════════════════════════════════════════════════
const getAppointments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const { role, _id: userId } = req.user;

  const filter = {};
  if (role === ROLES.PATIENT)  filter.patient  = userId;
  if (role === ROLES.DOCTOR)   filter.doctor   = userId;
  if (role === ROLES.HOSPITAL) filter.hospital = userId;
  if (status) filter.status = status;

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Appointment.countDocuments(filter);
  const appointments = await Appointment.find(filter)
    .populate(POPULATE)
    .sort({ createdAt: -1 })
    .skip(skip).limit(parseInt(limit));

  return successResponse(res, 200, 'Appointments fetched.', {
    appointments,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  });
});

// ══════════════════════════════════════════════════════════════
//  GET /api/appointments/:id — single with access check
// ══════════════════════════════════════════════════════════════
const getAppointmentById = asyncHandler(async (req, res) => {
  const appt = await Appointment.findById(req.params.appointmentId).populate(POPULATE);
  if (!appt) return errorResponse(res, 404, 'Appointment not found.');

  const uid = req.user._id.toString();
  const isParty = [appt.patient?._id, appt.doctor?._id, appt.hospital?._id]
    .filter(Boolean).map(x => x.toString()).includes(uid);
  if (!isParty && req.user.role !== ROLES.ADMIN)
    return errorResponse(res, 403, 'Access denied.');

  return successResponse(res, 200, 'Appointment fetched.', { appointment: appt });
});

// ══════════════════════════════════════════════════════════════
//  DOCTOR: GET /api/appointments/:id/patient-records
// ══════════════════════════════════════════════════════════════
const getAppointmentPatientRecords = asyncHandler(async (req, res) => {
  const appt = await Appointment.findOne({
    _id: req.params.appointmentId, doctor: req.user._id,
  }).populate({ path: 'sharedRecords', select: 'title recordType filePath fileUrl fileSize mimeType recordDate issuedBy description' })
    .populate('patient', 'firstName lastName email phone dateOfBirth');

  if (!appt) return errorResponse(res, 404, 'Appointment not found.');

  const patientProfile = await Patient.findOne({ user: appt.patient._id });
  return successResponse(res, 200, 'Patient records fetched.', {
    appointment: {
      id: appt._id, appointmentDate: appt.appointmentDate,
      appointmentTime: appt.appointmentTime, status: appt.status,
      reasonForVisit: appt.reasonForVisit, symptoms: appt.symptoms,
      mode: appt.mode, meetingLink: appt.meetingLink,
    },
    patient: {
      ...appt.patient.toObject(),
      bloodGroup:       patientProfile?.bloodGroup       || 'unknown',
      allergies:        patientProfile?.allergies        || [],
      chronicDiseases:  patientProfile?.chronicDiseases  || [],
      medications:      patientProfile?.medications      || [],
      emergencyContacts: patientProfile?.emergencyContacts || [],
    },
    sharedRecords: appt.sharedRecords,
  });
});

// ══════════════════════════════════════════════════════════════
//  GET /api/appointments/hospitals/list — patient browses hospitals
// ══════════════════════════════════════════════════════════════
const getApprovedHospitals = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const filter = { role: ROLES.HOSPITAL, verificationStatus: VERIFICATION_STATUS.APPROVED, isActive: true };
  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await User.countDocuments(filter);
  const hospitalUsers = await User.find(filter).select('-password').skip(skip).limit(parseInt(limit));
  const ids = hospitalUsers.map(u => u._id);
  const profiles = await Hospital.find({ user: { $in: ids } });
  const profileMap = {};
  profiles.forEach(p => { profileMap[p.user.toString()] = p; });

  let hospitals = hospitalUsers.map(u => ({ user: u, profile: profileMap[u._id.toString()] || null }));
  if (search) {
    const s = search.toLowerCase();
    hospitals = hospitals.filter(h =>
      h.profile?.hospitalName?.toLowerCase().includes(s) ||
      h.profile?.specialties?.some(sp => sp.toLowerCase().includes(s)) ||
      h.profile?.address?.city?.toLowerCase().includes(s)
    );
  }

  return successResponse(res, 200, 'Hospitals fetched.', {
    hospitals,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  });
});

// ══════════════════════════════════════════════════════════════
//  GET /api/appointments/doctors/list — patient browses doctors
//  (optionally filtered by hospitalId)
// ══════════════════════════════════════════════════════════════
const getApprovedDoctors = asyncHandler(async (req, res) => {
  const { specialization, hospitalId } = req.query;

  // Build doctor profile filter — no affiliationStatus filter so all approved doctors show
  const profFilter = {};
  if (specialization) profFilter.specialization   = new RegExp(specialization, 'i');
  if (hospitalId)     profFilter.currentHospital  = hospitalId;

  const profiles = await Doctor.find(profFilter)
    .populate('user', '-password')
    .populate('currentHospital', 'firstName lastName');

  // Only include doctors whose user account is verified & active
  const doctors = profiles
    .filter(p => p.user?.verificationStatus === 'approved' && p.user?.isActive)
    .map(p => ({ user: p.user, profile: p }));

  return successResponse(res, 200, 'Doctors fetched.', {
    doctors,
    pagination: { total: doctors.length, page: 1, limit: doctors.length, totalPages: 1 },
  });
});

module.exports = {
  bookAppointment,
  scheduleAppointment,
  confirmAppointment,
  rescheduleRequest,
  applyReschedule,
  startAppointment,
  completeAppointment,
  cancelAppointment,
  getAppointments,
  getAppointmentById,
  getAppointmentPatientRecords,
  getApprovedHospitals,
  getApprovedDoctors,
};
