const User          = require('../models/User.model');
const Doctor        = require('../models/Doctor.model');
const Hospital      = require('../models/Hospital.model');
const Appointment   = require('../models/Appointment.model');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler  = require('../utils/asyncHandler');
const { ROLES, VERIFICATION_STATUS } = require('../utils/constants');

// ── GET /api/doctor/affiliation-status
//    Doctor gets their own full affiliation state including pending invites
const getAffiliationStatus = asyncHandler(async (req, res) => {
  const profile = await Doctor.findOne({ user: req.user._id })
    .populate('currentHospital', 'firstName lastName email')
    .populate('pendingInvites.hospital', 'firstName lastName email');

  if (!profile) return errorResponse(res, 404, 'Doctor profile not found.');

  // Enrich with hospital profile data
  let currentHospitalProfile = null;
  if (profile.currentHospital) {
    currentHospitalProfile = await Hospital.findOne({ user: profile.currentHospital._id });
  }

  const inviteDetails = await Promise.all(
    (profile.pendingInvites || []).map(async inv => {
      const hp = await Hospital.findOne({ user: inv.hospital?._id || inv.hospital });
      return {
        hospital:     inv.hospital,
        hospitalName: hp?.hospitalName || inv.name || 'Hospital',
        hospitalType: hp?.hospitalType,
        city:         hp?.address?.city,
        invitedAt:    inv.invitedAt,
      };
    })
  );

  return successResponse(res, 200, 'Affiliation status fetched.', {
    affiliationStatus:      profile.affiliationStatus,
    currentHospital:        profile.currentHospital,
    currentHospitalProfile,
    hospitalHistory:        profile.hospitalHistory,
    pendingInvites:         inviteDetails,
  });
});

// ── POST /api/doctor/request-affiliation
//    Doctor requests to join a hospital (doctor-initiated)
const requestAffiliation = asyncHandler(async (req, res) => {
  const { hospitalUserId } = req.body;
  if (!hospitalUserId) return errorResponse(res, 400, 'hospitalUserId is required.');

  const hospital = await User.findOne({
    _id: hospitalUserId, role: ROLES.HOSPITAL,
    verificationStatus: VERIFICATION_STATUS.APPROVED, isActive: true,
  });
  if (!hospital) return errorResponse(res, 404, 'Hospital not found or not approved.');

  const profile = await Doctor.findOne({ user: req.user._id });
  if (!profile) return errorResponse(res, 404, 'Complete your doctor profile first.');

  if (profile.currentHospital?.toString() === hospitalUserId && profile.affiliationStatus === 'approved')
    return errorResponse(res, 409, 'You are already affiliated with this hospital.');

  // If switching hospitals, close out old history
  if (profile.currentHospital && profile.affiliationStatus === 'approved') {
    const last = profile.hospitalHistory[profile.hospitalHistory.length - 1];
    if (last && !last.leftAt) last.leftAt = new Date();
  }

  const hospitalProfile = await Hospital.findOne({ user: hospitalUserId });
  const hospitalName = hospitalProfile?.hospitalName || hospital.firstName;

  profile.currentHospital   = hospitalUserId;
  profile.affiliationStatus = 'pending';
  // Remove any existing invite from this hospital (no longer needed)
  profile.pendingInvites = (profile.pendingInvites || []).filter(
    i => i.hospital?.toString() !== hospitalUserId
  );
  profile.hospitalHistory.push({ hospital: hospitalUserId, name: hospitalName });
  await profile.save();

  return successResponse(res, 200,
    `Request sent to ${hospitalName}. Awaiting their approval.`, { profile }
  );
});

// ── POST /api/doctor/accept-invite
//    Doctor accepts a hospital's invitation
const acceptInvite = asyncHandler(async (req, res) => {
  const { hospitalUserId } = req.body;
  if (!hospitalUserId) return errorResponse(res, 400, 'hospitalUserId is required.');

  const profile = await Doctor.findOne({ user: req.user._id });
  if (!profile) return errorResponse(res, 404, 'Doctor profile not found.');

  const inviteIndex = (profile.pendingInvites || []).findIndex(
    i => i.hospital?.toString() === hospitalUserId
  );
  if (inviteIndex === -1) return errorResponse(res, 404, 'Invite not found from this hospital.');

  // Close out previous hospital if any
  if (profile.currentHospital && profile.affiliationStatus === 'approved') {
    const last = profile.hospitalHistory[profile.hospitalHistory.length - 1];
    if (last && !last.leftAt) last.leftAt = new Date();
  }

  const invite = profile.pendingInvites[inviteIndex];
  const hospitalName = invite.name || 'Hospital';

  // Accept: set current hospital as approved immediately (hospital already invited = consent)
  profile.currentHospital   = hospitalUserId;
  profile.affiliationStatus = 'approved';
  profile.pendingInvites.splice(inviteIndex, 1); // remove this invite
  profile.hospitalHistory.push({
    hospital:  hospitalUserId,
    name:      hospitalName,
    joinedAt:  new Date(),
  });
  await profile.save();

  const populated = await Doctor.findById(profile._id)
    .populate('currentHospital', 'firstName lastName email')
    .populate('pendingInvites.hospital', 'firstName lastName');

  return successResponse(res, 200,
    `You are now affiliated with ${hospitalName}!`, { profile: populated }
  );
});

// ── POST /api/doctor/decline-invite
//    Doctor declines a hospital's invitation
const declineInvite = asyncHandler(async (req, res) => {
  const { hospitalUserId } = req.body;
  if (!hospitalUserId) return errorResponse(res, 400, 'hospitalUserId is required.');

  const profile = await Doctor.findOne({ user: req.user._id });
  if (!profile) return errorResponse(res, 404, 'Doctor profile not found.');

  const before = profile.pendingInvites?.length || 0;
  profile.pendingInvites = (profile.pendingInvites || []).filter(
    i => i.hospital?.toString() !== hospitalUserId
  );
  if (profile.pendingInvites.length === before)
    return errorResponse(res, 404, 'Invite not found.');

  await profile.save();
  return successResponse(res, 200, 'Invitation declined.');
});

// ── DELETE /api/doctor/leave-hospital
const leaveHospital = asyncHandler(async (req, res) => {
  const profile = await Doctor.findOne({ user: req.user._id });
  if (!profile || !profile.currentHospital)
    return errorResponse(res, 400, 'You are not currently affiliated with any hospital.');

  const last = profile.hospitalHistory[profile.hospitalHistory.length - 1];
  if (last && !last.leftAt) last.leftAt = new Date();
  profile.currentHospital   = null;
  profile.affiliationStatus = 'none';
  await profile.save();

  return successResponse(res, 200, 'You have left the hospital.', { profile });
});

// ── GET /api/doctor/my-patients
const getMyPatients = asyncHandler(async (req, res) => {
  const patientIds = await Appointment.find({
    doctor: req.user._id, status: 'completed',
  }).distinct('patient');
  const patients = await User.find({ _id: { $in: patientIds } })
    .select('firstName lastName email profilePicture');
  return successResponse(res, 200, 'Patients fetched.', { patients });
});

module.exports = {
  getAffiliationStatus, requestAffiliation,
  acceptInvite, declineInvite,
  leaveHospital, getMyPatients,
};
