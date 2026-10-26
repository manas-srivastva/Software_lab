const mongoose = require('mongoose');

const doctorAffiliationSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor ID is required'],
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: [true, 'Organisation ID is required'],
    },
    availableDays: {
      type: [String],
      default: [],
    },
    availableSlots: {
      type: [String],
      default: [],
    },
    consultationFee: {
      type: Number,
      min: [0, 'Consultation fee cannot be negative'],
      default: 0,
    },
    roomNumber: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

doctorAffiliationSchema.index({ doctorId: 1, orgId: 1 }, { unique: true });
doctorAffiliationSchema.index({ orgId: 1, doctorId: 1 });

module.exports = mongoose.model('DoctorAffiliation', doctorAffiliationSchema);
