// ═══════════════════════════════════════════════════════════
//  models/Lab.model.js
// ═══════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const { VERIFICATION_DOC_TYPES } = require('../utils/constants');

const verificationDocSchema = new mongoose.Schema({
  docType:    { type: String, enum: Object.values(VERIFICATION_DOC_TYPES), required: true },
  filePath:   { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const LabSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true,
    },

    // ── Lab info ───────────────────────────────────────────
    labName: {
      type:     String,
      required: [true, 'Lab name is required'],
      trim:     true,
    },
    registrationNumber: {
      type:     String,
      required: [true, 'Registration number is required'],
      unique:   true,
      trim:     true,
    },
    labType: {
      type: String,
      enum: ['diagnostic', 'pathology', 'radiology', 'microbiology', 'other'],
      default: 'diagnostic',
    },
    testsOffered:   [{ type: String, trim: true }],
    operatingHours: { type: String, trim: true }, // e.g. "Mon-Sat 7am-9pm"
    homeCollection: { type: Boolean, default: false },
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

LabSchema.index({ user: 1 });
LabSchema.index({ registrationNumber: 1 });

module.exports = mongoose.model('Lab', LabSchema);
