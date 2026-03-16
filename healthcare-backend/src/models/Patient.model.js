// ═══════════════════════════════════════════════════════════
//  models/Patient.model.js — Patient medical profile
// ═══════════════════════════════════════════════════════════

const mongoose = require('mongoose');

// ── Sub-schemas ────────────────────────────────────────────

const emergencyContactSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  relationship: { type: String, required: true, trim: true },
  phone:        { type: String, required: true, trim: true },
  email:        { type: String, trim: true, lowercase: true },
}, { _id: true });

const medicationSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  dosage:    { type: String, trim: true },   // e.g. "500mg"
  frequency: { type: String, trim: true },   // e.g. "Twice daily"
  startDate: { type: Date },
  endDate:   { type: Date },
  notes:     { type: String, trim: true },
}, { _id: true });

const allergySchema = new mongoose.Schema({
  allergen:  { type: String, required: true, trim: true },
  reaction:  { type: String, trim: true },   // e.g. "Rash", "Anaphylaxis"
  severity:  {
    type: String,
    enum: ['mild', 'moderate', 'severe'],
    default: 'mild',
  },
}, { _id: true });

const chronicDiseaseSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  diagnosedDate: { type: Date },
  notes:         { type: String, trim: true },
}, { _id: true });

// ── Main Patient Schema ────────────────────────────────────

const PatientSchema = new mongoose.Schema(
  {
    // ── Link to base User ────────────────────────────────
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true,
    },

    // ── Core medical info ────────────────────────────────
    bloodGroup: {
      type: String,
      enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-', 'unknown'],
      default: 'unknown',
    },
    height: { type: Number }, // cm
    weight: { type: Number }, // kg

    // ── Structured medical data ──────────────────────────
    allergies:       [allergySchema],
    chronicDiseases: [chronicDiseaseSchema],
    medications:     [medicationSchema],
    emergencyContacts: [emergencyContactSchema],

    // ── Organ donor ──────────────────────────────────────
    isOrganDonor: { type: Boolean, default: false },
    organDonorDetails: { type: String, trim: true },

    // ── Insurance ────────────────────────────────────────
    insuranceProvider: { type: String, trim: true },
    insurancePolicyNo: { type: String, trim: true },

    // ── Additional notes ─────────────────────────────────
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: BMI ───────────────────────────────────────────
PatientSchema.virtual('bmi').get(function () {
  if (!this.height || !this.weight) return null;
  const heightM = this.height / 100;
  return parseFloat((this.weight / (heightM * heightM)).toFixed(1));
});

PatientSchema.index({ user: 1 });

module.exports = mongoose.model('Patient', PatientSchema);
