// ═══════════════════════════════════════════════════════════
//  controllers/auth.controller.js
// ═══════════════════════════════════════════════════════════

const User = require('../models/User.model');
const { generateToken } = require('../services/token.service');
const { generatePatientQR } = require('../services/qr.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, ROLES_REQUIRING_VERIFICATION } = require('../utils/constants');
const { v4: uuidv4 } = require('uuid');

// ── Helper: build safe user payload (no password) ──────────
const buildUserPayload = (user) => ({
  id:                 user._id,
  firstName:          user.firstName,
  lastName:           user.lastName,
  fullName:           user.fullName,
  email:              user.email,
  role:               user.role,
  verificationStatus: user.verificationStatus,
  profilePicture:     user.profilePicture,
  isActive:           user.isActive,
});

// ───────────────────────────────────────────────────────────
//  POST /api/auth/register
// ───────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const {
    firstName, lastName, email, password,
    phone, role, dateOfBirth, gender,
  } = req.body;

  // ── 1. Validate required fields ──────────────────────────
  if (!firstName || !lastName || !email || !password || !role) {
    return errorResponse(res, 400, 'firstName, lastName, email, password, and role are required.');
  }

  // ── 2. Validate role is a real role (not admin — admins are seeded) ──
  const allowedRoles = [ROLES.PATIENT, ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.LAB];
  if (!allowedRoles.includes(role)) {
    return errorResponse(res, 400, `Invalid role. Allowed: ${allowedRoles.join(', ')}`);
  }

  // ── 3. Check email is not already taken ──────────────────
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return errorResponse(res, 409, 'An account with this email already exists.');
  }

  // ── 4. Build user document ───────────────────────────────
  const userData = {
    firstName: firstName.trim(),
    lastName:  lastName.trim(),
    email:     email.toLowerCase().trim(),
    password,
    role,
    phone:       phone       || undefined,
    dateOfBirth: dateOfBirth || undefined,
    gender:      gender      || 'prefer_not_to_say',
  };

  // ── 5. For patients: generate immutable qrId ─────────────
  //       Store it on the user so it travels with the account
  if (role === ROLES.PATIENT) {
    userData.qrId = uuidv4();
  }

  const user = await User.create(userData);

  // ── 6. For patients: generate QR code PNG immediately ─────
  if (role === ROLES.PATIENT && user.qrId) {
    try {
      await generatePatientQR(user.qrId);
    } catch (qrErr) {
      // QR failure should NOT block registration — log and continue
      console.error('QR generation failed for patient:', user._id, qrErr.message);
    }
  }

  // ── 7. Generate JWT ───────────────────────────────────────
  const token = generateToken({ userId: user._id, role: user.role });

  // ── 8. Update lastLogin ───────────────────────────────────
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // ── 9. Compose message based on role ──────────────────────
  const message = ROLES_REQUIRING_VERIFICATION.includes(role)
    ? 'Registration successful. Your account is pending admin verification. You will be notified once approved.'
    : 'Registration successful. Welcome to HealthCare!';

  return successResponse(res, 201, message, {
    token,
    user: buildUserPayload(user),
  });
});

// ───────────────────────────────────────────────────────────
//  POST /api/auth/login
// ───────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // ── 1. Validate inputs ───────────────────────────────────
  if (!email || !password) {
    return errorResponse(res, 400, 'Email and password are required.');
  }

  // ── 2. Find user — explicitly select password (select: false on model) ──
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user) {
    // Generic message — never reveal whether email exists
    return errorResponse(res, 401, 'Invalid email or password.');
  }

  // ── 3. Check account is active ───────────────────────────
  if (!user.isActive) {
    return errorResponse(res, 403, 'Your account has been deactivated. Please contact support.');
  }

  // ── 4. Verify password ───────────────────────────────────
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return errorResponse(res, 401, 'Invalid email or password.');
  }

  // ── 5. Generate JWT ───────────────────────────────────────
  const token = generateToken({ userId: user._id, role: user.role });

  // ── 6. Update lastLogin ───────────────────────────────────
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  return successResponse(res, 200, 'Login successful.', {
    token,
    user: buildUserPayload(user),
  });
});

// ───────────────────────────────────────────────────────────
//  GET /api/auth/me — Get current logged-in user
// ───────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  // req.user is already attached by authenticate middleware
  return successResponse(res, 200, 'User profile fetched.', {
    user: buildUserPayload(req.user),
  });
});

// ───────────────────────────────────────────────────────────
//  PUT /api/auth/change-password
// ───────────────────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return errorResponse(res, 400, 'currentPassword and newPassword are required.');
  }

  if (newPassword.length < 8) {
    return errorResponse(res, 400, 'New password must be at least 8 characters.');
  }

  if (currentPassword === newPassword) {
    return errorResponse(res, 400, 'New password must be different from current password.');
  }

  // Fetch user with password
  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return errorResponse(res, 401, 'Current password is incorrect.');
  }

  user.password = newPassword; // pre-save hook will hash it
  await user.save();

  return successResponse(res, 200, 'Password changed successfully.');
});

// ───────────────────────────────────────────────────────────
//  PUT /api/auth/profile — Update basic profile fields
// ───────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  // Fields the user is allowed to update themselves
  const allowed = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'address'];
  const updates = {};

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Handle profile picture if file was uploaded
  if (req.file) {
    updates.profilePicture = req.file.path.replace(/\\/g, '/');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  return successResponse(res, 200, 'Profile updated successfully.', {
    user: buildUserPayload(user),
  });
});

module.exports = { register, login, getMe, changePassword, updateProfile };
