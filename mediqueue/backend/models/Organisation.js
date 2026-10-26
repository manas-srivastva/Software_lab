const mongoose = require('mongoose');

const organisationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['hospital', 'clinic', 'independent_practice'],
      required: [true, 'Organisation type is required'],
    },
    name: {
      type: String,
      required: [true, 'Organisation name is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    orgAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organisation administrator is required'],
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    subscriptionPlan: {
      type: String,
      trim: true,
      default: 'free',
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

module.exports = mongoose.model('Organisation', organisationSchema);
