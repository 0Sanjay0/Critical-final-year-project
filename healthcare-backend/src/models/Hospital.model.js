// ═══════════════════════════════════════════════════════════
//  models/Hospital.model.js
// ═══════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const { VERIFICATION_DOC_TYPES } = require('../utils/constants');

const verificationDocSchema = new mongoose.Schema({
  docType:    { type: String, enum: Object.values(VERIFICATION_DOC_TYPES), required: true },
  filePath:   { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const HospitalSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true,
    },

    // ── Hospital info ──────────────────────────────────────
    hospitalName: {
      type:     String,
      required: [true, 'Hospital name is required'],
      trim:     true,
    },
    registrationNumber: {
      type:     String,
      required: [true, 'Registration number is required'],
      unique:   true,
      trim:     true,
    },
    hospitalType: {
      type: String,
      enum: ['government', 'private', 'clinic', 'specialty', 'teaching', 'other'],
      default: 'private',
    },
    specialties:  [{ type: String, trim: true }],
    totalBeds:    { type: Number, min: 0 },
    emergencyServices: { type: Boolean, default: false },
    website:      { type: String, trim: true },
    address: {
      street:  { type: String, trim: true },
      city:    { type: String, trim: true },
      state:   { type: String, trim: true },
      country: { type: String, trim: true },
      zipCode: { type: String, trim: true },
    },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },

    // ── Verification documents ─────────────────────────────
    verificationDocs: [verificationDocSchema],
    adminNote:        { type: String, default: null },
  },
  { timestamps: true }
);

HospitalSchema.index({ user: 1 });
HospitalSchema.index({ registrationNumber: 1 });

module.exports = mongoose.model('Hospital', HospitalSchema);
