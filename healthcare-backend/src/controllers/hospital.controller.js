const User     = require('../models/User.model');
const Doctor   = require('../models/Doctor.model');
const Hospital = require('../models/Hospital.model');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, VERIFICATION_STATUS } = require('../utils/constants');

// ── GET /api/hospital/doctors?status=approved|pending|all
const getAffiliatedDoctors = asyncHandler(async (req, res) => {
  const { status = 'approved' } = req.query;
  const filter = { currentHospital: req.user._id };
  if (status !== 'all') filter.affiliationStatus = status;

  const profiles = await Doctor.find(filter)
    .populate('user', 'firstName lastName email phone profilePicture verificationStatus isActive');

  return successResponse(res, 200, 'Affiliated doctors fetched.', { doctors: profiles });
});

// ── POST /api/hospital/doctors/:doctorUserId/invite
//    Hospital sends an invitation to a doctor
const inviteDoctor = asyncHandler(async (req, res) => {
  const { doctorUserId } = req.params;

  // Validate doctor exists and is approved
  const doctorUser = await User.findOne({
    _id: doctorUserId, role: ROLES.DOCTOR,
    verificationStatus: VERIFICATION_STATUS.APPROVED, isActive: true,
  });
  if (!doctorUser) return errorResponse(res, 404, 'Doctor not found or not approved.');

  const profile = await Doctor.findOne({ user: doctorUserId });
  if (!profile) return errorResponse(res, 404, 'Doctor profile not found.');

  // Already affiliated with THIS hospital
  if (profile.currentHospital?.toString() === req.user._id.toString()
      && profile.affiliationStatus === 'approved') {
    return errorResponse(res, 409, 'Doctor is already affiliated with your hospital.');
  }

  // Already has a pending invite from this hospital
  const alreadyInvited = profile.pendingInvites?.some(
    i => i.hospital?.toString() === req.user._id.toString()
  );
  if (alreadyInvited) return errorResponse(res, 409, 'Invitation already sent to this doctor.');

  // Fetch hospital name for snapshot
  const hospitalProfile = await Hospital.findOne({ user: req.user._id });
  const hospitalName = hospitalProfile?.hospitalName || req.user.firstName;

  profile.pendingInvites = profile.pendingInvites || [];
  profile.pendingInvites.push({
    hospital:  req.user._id,
    name:      hospitalName,
    invitedAt: new Date(),
  });
  await profile.save();

  return successResponse(res, 200,
    `Invitation sent to Dr. ${doctorUser.firstName} ${doctorUser.lastName}.`,
    { doctorId: doctorUserId, hospitalName }
  );
});

// ── PATCH /api/hospital/doctors/:doctorUserId/approve
//    Hospital approves a doctor-initiated request
const approveDoctor = asyncHandler(async (req, res) => {
  const profile = await Doctor.findOne({
    user: req.params.doctorUserId,
    currentHospital: req.user._id,
    affiliationStatus: 'pending',
  });
  if (!profile) return errorResponse(res, 404, 'Pending request not found for this doctor.');

  profile.affiliationStatus = 'approved';
  const last = profile.hospitalHistory[profile.hospitalHistory.length - 1];
  if (last && last.hospital?.toString() === req.user._id.toString() && !last.leftAt) {
    last.joinedAt = new Date();
  }
  await profile.save();
  const populated = await Doctor.findById(profile._id).populate('user', 'firstName lastName email');
  return successResponse(res, 200, 'Doctor approved and affiliated.', { doctor: populated });
});

// ── PATCH /api/hospital/doctors/:doctorUserId/remove
const removeDoctor = asyncHandler(async (req, res) => {
  const profile = await Doctor.findOne({
    user: req.params.doctorUserId,
    currentHospital: req.user._id,
    affiliationStatus: { $in: ['pending', 'approved'] },
  });
  if (!profile) return errorResponse(res, 404, 'Doctor not found under this hospital.');

  const last = profile.hospitalHistory[profile.hospitalHistory.length - 1];
  if (last && !last.leftAt) last.leftAt = new Date();
  profile.currentHospital   = null;
  profile.affiliationStatus = 'none';
  await profile.save();

  return successResponse(res, 200, 'Doctor removed from hospital.');
});

// ── GET /api/hospital/doctors/search?q=&specialization=
const searchDoctors = asyncHandler(async (req, res) => {
  const { q = '', specialization = '' } = req.query;
  const userFilter = { role: ROLES.DOCTOR, verificationStatus: VERIFICATION_STATUS.APPROVED, isActive: true };
  if (q) {
    userFilter.$or = [
      { firstName: new RegExp(q, 'i') },
      { lastName:  new RegExp(q, 'i') },
      { email:     new RegExp(q, 'i') },
    ];
  }

  const users = await User.find(userFilter).select('-password').limit(30);
  const ids   = users.map(u => u._id);
  const profFilter = { user: { $in: ids } };
  if (specialization) profFilter.specialization = new RegExp(specialization, 'i');

  const profiles = await Doctor.find(profFilter)
    .populate('currentHospital', 'firstName lastName');
  const profileMap = {};
  profiles.forEach(p => { profileMap[p.user.toString()] = p; });

  const doctors = users
    .map(u => ({ user: u, profile: profileMap[u._id.toString()] || null }))
    .filter(d => !specialization || d.profile);

  return successResponse(res, 200, 'Doctors found.', { doctors });
});

module.exports = { getAffiliatedDoctors, inviteDoctor, approveDoctor, removeDoctor, searchDoctors };
