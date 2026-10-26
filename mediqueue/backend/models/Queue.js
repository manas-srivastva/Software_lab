const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: [true, 'Appointment ID is required'],
      unique: true, // Prevents duplicate queue entry for the same appointment
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor ID is required'],
    },
    date: {
      type: String,
      required: [true, 'Queue date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'],
    },
    tokenNumber: {
      type: Number,
      required: [true, 'Token number is required'],
    },
    status: {
      type: String,
      enum: ['waiting', 'in-consultation', 'completed', 'cancelled'],
      default: 'waiting',
    },
    calledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// Ensure unique sequential token per doctor and date
queueSchema.index({ doctorId: 1, date: 1, tokenNumber: 1 }, { unique: true });

// Optimize queue status queries
queueSchema.index({ doctorId: 1, date: 1, status: 1 });
queueSchema.index({ patientId: 1, date: 1, status: 1 });

module.exports = mongoose.model('Queue', queueSchema);
