const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide doctor name'],
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'Please provide doctor specialization'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Please provide doctor department'],
      trim: true,
    },
    medicalRegistrationNumber: {
      type: String,
      required: [true, 'Please provide medical registration number'],
      trim: true,
      index: true,
    },
    clinicHospitalName: {
      type: String,
      trim: true,
      default: 'MediQueue Health Center',
    },
    clinicAddress: {
      type: String,
      trim: true,
      default: '',
    },
    verificationStatus: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING',
      index: true,
    },
    verificationDocuments: [
      {
        documentType: {
          type: String,
          enum: ['medical_license', 'id_proof', 'degree_certificate', 'other'],
          required: true,
        },
        documentUrl: {
          type: String,
          required: true,
        },
        documentName: {
          type: String,
          default: '',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    statusReason: {
      type: String,
      default: '',
    },
    statusHistory: [
      {
        fromStatus: {
          type: String,
        },
        toStatus: {
          type: String,
          required: true,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        changedByName: {
          type: String,
          default: 'System',
        },
        reason: {
          type: String,
          default: '',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    availableDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    availableSlots: {
      type: [String],
      default: [
        '09:00 AM',
        '09:30 AM',
        '10:00 AM',
        '10:30 AM',
        '11:00 AM',
        '11:30 AM',
        '02:00 PM',
        '02:30 PM',
        '03:00 PM',
        '03:30 PM',
        '04:00 PM',
        '04:30 PM',
      ],
    },
    averageConsultationMinutes: {
      type: Number,
      default: 15,
      min: [5, 'Consultation time must be at least 5 minutes'],
      max: [60, 'Consultation time cannot exceed 60 minutes'],
    },
    qualifications: {
      type: String,
      default: 'MBBS, MD',
    },
    experienceYears: {
      type: Number,
      default: 8,
    },
    roomNumber: {
      type: String,
      default: 'Room 101',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

module.exports = mongoose.model('Doctor', doctorSchema);
