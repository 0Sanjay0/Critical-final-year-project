const mongoose = require('mongoose');
const { VERIFICATION_DOC_TYPES } = require('../utils/constants');

const verificationDocSchema = new mongoose.Schema({
  docType:    { type: String, enum: Object.values(VERIFICATION_DOC_TYPES), required: true },
  filePath:   { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const hospitalHistorySchema = new mongoose.Schema({
  hospital:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:      { type: String }, // snapshot of hospital name
  joinedAt:  { type: Date, default: Date.now },
  leftAt:    { type: Date, default: null },
}, { _id: false });

const DoctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // ── Professional info ─────────────────────────────────
    specialization:    { type: String, required: true, trim: true },
    qualifications:    [{ type: String, trim: true }],
    experience:        { type: Number, min: 0 },
    licenseNumber:     { type: String, required: true, unique: true, trim: true },
    consultationFee:   { type: Number, min: 0 },
    availableDays:     [{ type: String, enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] }],
    availableTimeStart:{ type: String },
    availableTimeEnd:  { type: String },
    bio:               { type: String, maxlength: 500 },

    // ── Hospital affiliation ──────────────────────────────
    // Current hospital (ref to User with role=hospital)
    currentHospital: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    // Status: pending = requested, approved = working there, none = not affiliated
    affiliationStatus: {
      type:    String,
      enum:    ['none', 'pending', 'approved'],
      default: 'none',
    },
    // Invitations sent BY hospitals TO this doctor
    pendingInvites: [{
      hospital:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name:       { type: String },
      invitedAt:  { type: Date, default: Date.now },
    }],

    // History of past affiliations
    hospitalHistory: [hospitalHistorySchema],

    // ── Verification documents ────────────────────────────
    verificationDocs: [verificationDocSchema],
    adminNote:        { type: String, default: null },
  },
  { timestamps: true }
);

DoctorSchema.index({ user: 1 });
DoctorSchema.index({ licenseNumber: 1 });
DoctorSchema.index({ specialization: 1 });
DoctorSchema.index({ currentHospital: 1 });

module.exports = mongoose.model('Doctor', DoctorSchema);
