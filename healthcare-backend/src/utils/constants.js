const ROLES = Object.freeze({
  PATIENT:  'patient',
  DOCTOR:   'doctor',
  HOSPITAL: 'hospital',
  LAB:      'lab',
  ADMIN:    'admin',
});

const VERIFICATION_STATUS = Object.freeze({
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

// New full appointment lifecycle:
// pending_hospital → scheduled → pending_doctor → confirmed → in_progress → completed
// Any stage → cancelled
const APPOINTMENT_STATUS = Object.freeze({
  PENDING_HOSPITAL: 'pending_hospital', // Patient submitted, hospital not yet scheduled
  SCHEDULED:        'scheduled',        // Hospital set date/time, awaiting doctor ack
  CONFIRMED:        'confirmed',        // Doctor acknowledged
  IN_PROGRESS:      'in_progress',      // Appointment happening now
  COMPLETED:        'completed',        // Done, prescription may be added
  CANCELLED:        'cancelled',
  RESCHEDULED:      'rescheduled',      // Doctor requested reschedule
});

const APPOINTMENT_MODE = Object.freeze({
  OFFLINE: 'offline',
  ONLINE:  'online',
});

const MEDICAL_RECORD_TYPES = Object.freeze({
  PRESCRIPTION: 'prescription',
  LAB_REPORT:   'lab_report',
  DOCUMENT:     'document',
});

const BLOOD_GROUPS = Object.freeze([
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
]);

const ROLES_REQUIRING_VERIFICATION = Object.freeze([
  ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.LAB,
]);

const VERIFICATION_DOC_TYPES = Object.freeze({
  REGISTRATION:  'registrationDoc',
  LICENSE:       'licenseDoc',
  AUTHORIZATION: 'authorizationDoc',
});

module.exports = {
  ROLES,
  VERIFICATION_STATUS,
  APPOINTMENT_STATUS,
  APPOINTMENT_MODE,
  MEDICAL_RECORD_TYPES,
  BLOOD_GROUPS,
  ROLES_REQUIRING_VERIFICATION,
  VERIFICATION_DOC_TYPES,
};
