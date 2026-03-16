const mongoose = require('mongoose');

const EmergencyLogSchema = new mongoose.Schema({
  // The patient whose QR was scanned
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  qrId: { type: String, required: true },

  // Who scanned (null = public/unauthenticated)
  accessedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  accessorRole:  { type: String, default: 'public' }, // 'public','doctor','hospital','patient'
  accessorName:  { type: String, default: 'Anonymous' },
  accessLevel:   { type: String, default: 'public_emergency' }, // 'full','emergency_essential','public_emergency'

  // Context
  ipAddress:  { type: String, default: null },
  userAgent:  { type: String, default: null },
  accessedAt: { type: Date, default: Date.now },
}, { timestamps: false });

EmergencyLogSchema.index({ patient: 1, accessedAt: -1 });
EmergencyLogSchema.index({ accessedAt: -1 });

module.exports = mongoose.model('EmergencyLog', EmergencyLogSchema);
