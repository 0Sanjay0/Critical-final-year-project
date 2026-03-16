// ═══════════════════════════════════════════════════════════
//  models/MedicalRecord.model.js
// ═══════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const { MEDICAL_RECORD_TYPES } = require('../utils/constants');

const MedicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    recordType: {
      type:     String,
      enum:     Object.values(MEDICAL_RECORD_TYPES),
      required: true,
    },
    title: {
      type:      String,
      required:  [true, 'Record title is required'],
      trim:      true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type:      String,
      trim:      true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    // ── File info — ALL optional (text-only records have no file) ──
    filePath:     { type: String, default: null },
    fileSize:     { type: Number, default: null },
    mimeType:     { type: String, default: null },
    originalName: { type: String, default: null },

    issuedBy:   { type: String, trim: true },
    recordDate: { type: Date,   default: Date.now },

    sharedWith: [{
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    }],

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: public URL (null if no file) ─────────────────
MedicalRecordSchema.virtual('fileUrl').get(function () {
  if (!this.filePath) return null;
  const base = process.env.SERVER_URL || 'http://localhost:5000';
  return `${base}/${this.filePath.replace(/\\/g, '/')}`;
});

// ── Virtual: is this a text-only record ───────────────────
MedicalRecordSchema.virtual('isTextOnly').get(function () {
  return !this.filePath;
});

MedicalRecordSchema.index({ patient: 1, recordType: 1 });
MedicalRecordSchema.index({ patient: 1, isActive:   1 });

module.exports = mongoose.model('MedicalRecord', MedicalRecordSchema);
