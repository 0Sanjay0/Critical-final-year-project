const mongoose = require('mongoose');
const { APPOINTMENT_STATUS, APPOINTMENT_MODE } = require('../utils/constants');

const AppointmentSchema = new mongoose.Schema(
  {
    // ── Parties ──────────────────────────────────────────
    patient:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ── Schedule (set by hospital) ───────────────────────
    appointmentDate: { type: Date,   default: null },
    appointmentTime: { type: String, default: null },  // "10:30"
    duration:        { type: Number, default: 30 },    // minutes

    // ── Mode ─────────────────────────────────────────────
    mode: {
      type:    String,
      enum:    Object.values(APPOINTMENT_MODE),
      default: APPOINTMENT_MODE.OFFLINE,
    },
    // For online appointments — meeting link set by hospital
    meetingLink: { type: String, default: null },

    // ── Patient request info ─────────────────────────────
    reasonForVisit:  { type: String, trim: true, maxlength: 500 },
    symptoms:        { type: String, trim: true, maxlength: 1000 },
    preferredDate:   { type: String, default: null }, // patient's preference (free text)
    preferredTime:   { type: String, default: null }, // patient's preference

    // ── Shared records (patient selects at booking) ──────
    sharedRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' }],

    // ── Status lifecycle ─────────────────────────────────
    status: {
      type:    String,
      enum:    Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.PENDING_HOSPITAL,
    },

    // ── Cancellation ─────────────────────────────────────
    cancelledBy:      { type: String, enum: ['patient','doctor','hospital'], default: null },
    cancellationNote: { type: String, trim: true, default: null },

    // ── Reschedule request (by doctor) ───────────────────
    rescheduleRequest: {
      requestedDate: { type: Date,   default: null },
      requestedTime: { type: String, default: null },
      note:          { type: String, default: null },
      requestedAt:   { type: Date,   default: null },
    },

    // ── Doctor notes & prescription (after appointment) ──
    doctorNotes:  { type: String, trim: true, maxlength: 2000 },
    // Prescription can be text OR a file path (hand-written image)
    prescription: {
      text:        { type: String, trim: true, default: null },
      filePath:    { type: String, default: null },
      fileUrl:     { type: String, default: null },
      issuedAt:    { type: Date,   default: null },
    },
    followUpDate: { type: Date, default: null },

    // ── Timestamps for status changes ────────────────────
    scheduledAt:   { type: Date, default: null }, // when hospital scheduled
    confirmedAt:   { type: Date, default: null }, // when doctor confirmed
    completedAt:   { type: Date, default: null }, // when doctor completed
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

AppointmentSchema.virtual('isPast').get(function () {
  return this.appointmentDate && new Date(this.appointmentDate) < new Date();
});

AppointmentSchema.index({ patient: 1, status: 1 });
AppointmentSchema.index({ doctor:  1, status: 1 });
AppointmentSchema.index({ hospital: 1, status: 1 });
AppointmentSchema.index({ appointmentDate: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);
