// ═══════════════════════════════════════════════════════════
//  models/User.model.js — Base user for all roles
// ═══════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, VERIFICATION_STATUS, ROLES_REQUIRING_VERIFICATION } = require('../utils/constants');

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: [true, 'Role is required'],
    },

    // ── Patient-only: permanent QR identifier ─────────────
    // Generated once at registration, NEVER changed.
    // sparse: true means the unique index ignores null values,
    // so non-patients (who have qrId: null) don't conflict.
    qrId: {
      type:    String,
      default: null,
    },

    // ── Profile ────────────────────────────────────────────
    profilePicture: { type: String, default: null },
    dateOfBirth:    { type: Date,   default: null },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    address: {
      street:  { type: String, trim: true },
      city:    { type: String, trim: true },
      state:   { type: String, trim: true },
      country: { type: String, trim: true },
      zipCode: { type: String, trim: true },
    },

    // ── Verification ───────────────────────────────────────
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: function () {
        return ROLES_REQUIRING_VERIFICATION.includes(this.role)
          ? VERIFICATION_STATUS.PENDING
          : VERIFICATION_STATUS.APPROVED;
      },
    },
    rejectionReason: { type: String, default: null },

    // ── Account state ──────────────────────────────────────
    isActive:  { type: Boolean, default: true },
    lastLogin: { type: Date,    default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ───────────────────────────────────────────────
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
});

// ── Pre-save: hash password ────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ── Instance methods ───────────────────────────────────────
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.isVerified = function () {
  return this.verificationStatus === VERIFICATION_STATUS.APPROVED;
};

// ── Indexes ───────────────────────────────────────────────
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, verificationStatus: 1 });
UserSchema.index({ qrId: 1 }, { unique: true, sparse: true });

// ── Guard: ensure non-patients NEVER have a qrId ─────────
// This prevents duplicate-null index errors even if something
// accidentally sets qrId on a doctor/hospital/lab account.
UserSchema.pre('save', function (next) {
  if (this.role !== 'patient') {
    this.qrId = undefined; // removes the field entirely (sparse index ignores missing fields)
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
