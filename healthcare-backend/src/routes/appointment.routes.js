const express = require('express');
const router  = express.Router();
const {
  bookAppointment, scheduleAppointment, confirmAppointment,
  rescheduleRequest, applyReschedule, startAppointment,
  completeAppointment, cancelAppointment,
  getAppointments, getAppointmentById,
  getAppointmentPatientRecords,
  getApprovedHospitals, getApprovedDoctors,
} = require('../controllers/appointment.controller');

const { authenticate }  = require('../middleware/auth.middleware');
const { authorizeRoles, requireVerified } = require('../middleware/role.middleware');
const { ROLES }         = require('../utils/constants');
const { profileUpload } = require('../config/multer');

router.use(authenticate);

// ── Browse (patients)
router.get('/hospitals/list', authorizeRoles(ROLES.PATIENT, ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.ADMIN), getApprovedHospitals);
router.get('/doctors/list',   authorizeRoles(ROLES.PATIENT, ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.ADMIN), getApprovedDoctors);

// ── Patient books
router.post('/', authorizeRoles(ROLES.PATIENT), bookAppointment);

// ── Hospital schedules
router.patch('/:appointmentId/schedule',         authorizeRoles(ROLES.HOSPITAL), requireVerified, scheduleAppointment);
router.patch('/:appointmentId/apply-reschedule', authorizeRoles(ROLES.HOSPITAL), requireVerified, applyReschedule);

// ── Doctor actions
router.patch('/:appointmentId/confirm',    authorizeRoles(ROLES.DOCTOR), requireVerified, confirmAppointment);
router.patch('/:appointmentId/reschedule-request', authorizeRoles(ROLES.DOCTOR), requireVerified, rescheduleRequest);
router.patch('/:appointmentId/start',      authorizeRoles(ROLES.DOCTOR), requireVerified, startAppointment);
router.patch(
  '/:appointmentId/complete',
  authorizeRoles(ROLES.DOCTOR), requireVerified,
  profileUpload.single('prescriptionFile'),
  completeAppointment
);

// ── Cancel (any party)
router.patch('/:appointmentId/cancel', authorizeRoles(ROLES.PATIENT, ROLES.DOCTOR, ROLES.HOSPITAL), cancelAppointment);

// ── Read
router.get('/',                                   authorizeRoles(ROLES.PATIENT, ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.ADMIN), getAppointments);
router.get('/:appointmentId',                     authorizeRoles(ROLES.PATIENT, ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.ADMIN), getAppointmentById);
router.get('/:appointmentId/patient-records',     authorizeRoles(ROLES.DOCTOR), requireVerified, getAppointmentPatientRecords);

module.exports = router;
