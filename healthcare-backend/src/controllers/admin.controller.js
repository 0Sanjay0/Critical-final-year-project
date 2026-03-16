// ═══════════════════════════════════════════════════════════
//  controllers/admin.controller.js
//  Admin: review verification submissions, approve/reject,
//  and manage all users.
// ═══════════════════════════════════════════════════════════

const User     = require('../models/User.model');
const Doctor   = require('../models/Doctor.model');
const Hospital = require('../models/Hospital.model');
const Lab      = require('../models/Lab.model');
const MedicalRecord  = require('../models/MedicalRecord.model');
const Appointment    = require('../models/Appointment.model');
const EmergencyLog   = require('../models/EmergencyLog.model');

const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { VERIFICATION_STATUS, ROLES } = require('../utils/constants');

// ═══════════════════════════════════════════════════════════
//  GET /api/admin/pending
//  All accounts awaiting verification
// ═══════════════════════════════════════════════════════════
const getPendingVerifications = asyncHandler(async (req, res) => {
  const pendingUsers = await User.find({
    verificationStatus: VERIFICATION_STATUS.PENDING,
    role: { $in: [ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.LAB] },
  }).select('-password').sort({ createdAt: -1 });

  // Attach their profile docs for each user
  const results = await Promise.all(
    pendingUsers.map(async (user) => {
      let profile = null;
      if (user.role === ROLES.DOCTOR)        profile = await Doctor.findOne({ user: user._id });
      else if (user.role === ROLES.HOSPITAL)  profile = await Hospital.findOne({ user: user._id });
      else if (user.role === ROLES.LAB)       profile = await Lab.findOne({ user: user._id });

      return { user, profile };
    })
  );

  return successResponse(res, 200, `${results.length} pending verification(s).`, { results });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/admin/users
//  All users with optional role filter & pagination
// ═══════════════════════════════════════════════════════════
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (role)   filter.role               = role;
  if (status) filter.verificationStatus = status;

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return successResponse(res, 200, 'Users fetched.', {
    users,
    pagination: {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/admin/users/:userId
//  Single user with their professional profile
// ═══════════════════════════════════════════════════════════
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).select('-password');

  if (!user) return errorResponse(res, 404, 'User not found.');

  let profile = null;
  if (user.role === ROLES.DOCTOR)        profile = await Doctor.findOne({ user: user._id });
  else if (user.role === ROLES.HOSPITAL)  profile = await Hospital.findOne({ user: user._id });
  else if (user.role === ROLES.LAB)       profile = await Lab.findOne({ user: user._id });

  return successResponse(res, 200, 'User fetched.', { user, profile });
});

// ═══════════════════════════════════════════════════════════
//  PATCH /api/admin/verify/:userId
//  Approve or reject an account
// ═══════════════════════════════════════════════════════════
const verifyAccount = asyncHandler(async (req, res) => {
  const { status, rejectionReason, adminNote } = req.body;
  const { userId } = req.params;

  // Validate incoming status
  const allowed = [VERIFICATION_STATUS.APPROVED, VERIFICATION_STATUS.REJECTED];
  if (!allowed.includes(status)) {
    return errorResponse(res, 400, `status must be one of: ${allowed.join(', ')}`);
  }

  // Rejection requires a reason
  if (status === VERIFICATION_STATUS.REJECTED && !rejectionReason) {
    return errorResponse(res, 400, 'rejectionReason is required when rejecting an account.');
  }

  const user = await User.findById(userId);
  if (!user) return errorResponse(res, 404, 'User not found.');

  if (![ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.LAB].includes(user.role)) {
    return errorResponse(res, 400, 'Only doctor, hospital, or lab accounts require verification.');
  }

  // Update user verification status
  user.verificationStatus = status;
  user.rejectionReason    = status === VERIFICATION_STATUS.REJECTED ? rejectionReason : null;
  await user.save({ validateBeforeSave: false });

  // Store admin note on professional profile
  if (adminNote) {
    const ModelMap = { doctor: Doctor, hospital: Hospital, lab: Lab };
    const Model    = ModelMap[user.role];
    if (Model) await Model.findOneAndUpdate({ user: userId }, { adminNote });
  }

  const message = status === VERIFICATION_STATUS.APPROVED
    ? `Account approved successfully.`
    : `Account rejected. Reason: ${rejectionReason}`;

  return successResponse(res, 200, message, {
    userId,
    status,
    rejectionReason: user.rejectionReason,
  });
});

// ═══════════════════════════════════════════════════════════
//  PATCH /api/admin/users/:userId/toggle-active
//  Activate or deactivate any user account
// ═══════════════════════════════════════════════════════════
const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return errorResponse(res, 404, 'User not found.');

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    return errorResponse(res, 400, 'You cannot deactivate your own account.');
  }

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  return successResponse(res, 200,
    `Account ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
    { userId: user._id, isActive: user.isActive }
  );
});

// ═══════════════════════════════════════════════════════════
//  GET /api/admin/stats
//  System overview numbers
// ═══════════════════════════════════════════════════════════
const getSystemStats = asyncHandler(async (req, res) => {
  const [
    totalPatients,
    totalDoctors,
    totalHospitals,
    totalLabs,
    pendingDoctors,
    pendingHospitals,
    pendingLabs,
    approvedDoctors,
    approvedHospitals,
    approvedLabs,
  ] = await Promise.all([
    User.countDocuments({ role: ROLES.PATIENT }),
    User.countDocuments({ role: ROLES.DOCTOR }),
    User.countDocuments({ role: ROLES.HOSPITAL }),
    User.countDocuments({ role: ROLES.LAB }),
    User.countDocuments({ role: ROLES.DOCTOR,   verificationStatus: VERIFICATION_STATUS.PENDING }),
    User.countDocuments({ role: ROLES.HOSPITAL, verificationStatus: VERIFICATION_STATUS.PENDING }),
    User.countDocuments({ role: ROLES.LAB,      verificationStatus: VERIFICATION_STATUS.PENDING }),
    User.countDocuments({ role: ROLES.DOCTOR,   verificationStatus: VERIFICATION_STATUS.APPROVED }),
    User.countDocuments({ role: ROLES.HOSPITAL, verificationStatus: VERIFICATION_STATUS.APPROVED }),
    User.countDocuments({ role: ROLES.LAB,      verificationStatus: VERIFICATION_STATUS.APPROVED }),
  ]);

  return successResponse(res, 200, 'System stats fetched.', {
    users:    { totalPatients, totalDoctors, totalHospitals, totalLabs },
    pending:  { doctors: pendingDoctors, hospitals: pendingHospitals, labs: pendingLabs,
                total: pendingDoctors + pendingHospitals + pendingLabs },
    approved: { doctors: approvedDoctors, hospitals: approvedHospitals, labs: approvedLabs },
  });
});


// ═══════════════════════════════════════════════════════════
//  DELETE /api/admin/users/:userId
//  Permanently remove a user and all their associated data
// ═══════════════════════════════════════════════════════════
const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { confirm } = req.body; // require explicit confirmation

  if (confirm !== 'DELETE') {
    return errorResponse(res, 400, 'Send { confirm: "DELETE" } in body to confirm deletion.');
  }

  const user = await User.findById(userId);
  if (!user) return errorResponse(res, 404, 'User not found.');

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user._id.toString()) {
    return errorResponse(res, 400, 'You cannot delete your own account.');
  }
  if (user.role === 'admin') {
    return errorResponse(res, 400, 'Admin accounts cannot be deleted this way.');
  }

  const role = user.role;

  // Delete profile documents
  if (role === ROLES.DOCTOR)   await Doctor.deleteOne({ user: userId });
  if (role === ROLES.HOSPITAL) await Hospital.deleteOne({ user: userId });
  if (role === ROLES.LAB)      await Lab.deleteOne({ user: userId });

  // Delete patient's medical records
  if (role === ROLES.PATIENT) {
    await MedicalRecord.deleteMany({ patient: userId });
    await EmergencyLog.deleteMany({ patient: userId });
  }

  // Cancel/clean up appointments
  await Appointment.deleteMany({
    $or: [{ patient: userId }, { doctor: userId }, { hospital: userId }],
  });

  // If doctor being deleted — remove from hospital affiliation
  if (role === ROLES.DOCTOR) {
    await Doctor.updateMany(
      { currentHospital: userId },
      { $set: { currentHospital: null, affiliationStatus: 'none' } }
    );
  }

  // Delete the user
  await User.deleteOne({ _id: userId });

  return successResponse(res, 200,
    `User ${user.firstName} ${user.lastName} (${role}) and all associated data permanently deleted.`,
    { deletedUserId: userId, role }
  );
});

module.exports = {
  getPendingVerifications,
  getAllUsers,
  getUserById,
  verifyAccount,
  toggleUserActive,
  getSystemStats,
  deleteUser,
};
