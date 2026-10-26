const Queue = require('../models/Queue');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const DoctorAffiliation = require('../models/DoctorAffiliation');
const Organisation = require('../models/Organisation');
const { getLocalDateString } = require('../utils/appointmentDate');

// Helper to get today's date formatted as YYYY-MM-DD in local time
// @desc    Check-in an appointment and generate a queue token
// @route   POST /api/queue/check-in/:appointmentId
// @access  Private (Patient or Staff)
const checkInAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId')
      .populate('patientId', 'name email phone');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Verify ownership or staff permissions
    const isOwner = appointment.patientId._id.toString() === req.user._id.toString();
    const isStaff = req.user.role === 'receptionist' ||
      req.user.role === 'orgAdmin' ||
      req.user.roles?.includes('orgAdmin');
    const isOrgAdmin = req.user.role === 'orgAdmin' || req.user.roles?.includes('orgAdmin');
    if (isOrgAdmin && appointment.orgId?.toString() !== req.user.orgId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Appointment is outside your organisation',
      });
    }

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot check in for another patient’s appointment',
      });
    }

    // Check appointment eligibility
    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot check in for a cancelled appointment',
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This appointment has already been completed',
      });
    }

    if (appointment.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed appointments can be checked in',
      });
    }

    if (appointment.date !== getLocalDateString()) {
      return res.status(400).json({
        success: false,
        message: 'Appointments can only be checked in on their scheduled date',
      });
    }

    // Check for existing queue entry (prevent duplicates)
    const existingQueue = await Queue.findOne({ appointmentId: appointment._id });
    if (existingQueue) {
      return res.status(400).json({
        success: false,
        message: `Queue token #${existingQueue.tokenNumber} has already been issued for this appointment`,
        queue: existingQueue,
      });
    }

    const lastQueueEntry = await Queue.findOne({
      doctorId: appointment.doctorId._id,
      date: appointment.date,
    }).sort({ tokenNumber: -1 });

    const nextTokenNumber = lastQueueEntry ? lastQueueEntry.tokenNumber + 1 : 1;
    const checkedInAppointment = await Appointment.findOneAndUpdate(
      { _id: appointment._id, status: 'confirmed' },
      { status: 'checked-in' },
      { new: true }
    );
    if (!checkedInAppointment) {
      return res.status(409).json({
        success: false,
        message: 'Appointment status changed; refresh and try checking in again',
      });
    }

    // Create queue entry
    let newQueueEntry;
    try {
      newQueueEntry = await Queue.create({
        appointmentId: appointment._id,
        patientId: appointment.patientId._id,
        doctorId: appointment.doctorId._id,
        orgId: appointment.orgId,
        date: appointment.date,
        tokenNumber: nextTokenNumber,
        status: 'waiting',
      });
    } catch (error) {
      await Appointment.updateOne(
        { _id: appointment._id, status: 'checked-in' },
        { status: 'confirmed' }
      );
      throw error;
    }

    const latestAppointment = await Appointment.findById(appointment._id).select('status');
    if (latestAppointment?.status !== 'checked-in') {
      await Queue.updateOne({ _id: newQueueEntry._id, status: 'waiting' }, { status: 'cancelled' });
      return res.status(409).json({
        success: false,
        message: 'Appointment changed while checking in; the queue token was cancelled',
      });
    }

    const populatedQueue = await Queue.findById(newQueueEntry._id)
      .populate('doctorId', 'name specialization department roomNumber averageConsultationMinutes')
      .populate('patientId', 'name email phone')
      .populate('orgId', 'name city')
      .populate('appointmentId');

    res.status(201).json({
      success: true,
      message: `Checked in successfully! You have been assigned Token #${nextTokenNumber}`,
      queue: populatedQueue,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A queue token conflict occurred; refresh the queue and retry check-in',
      });
    }
    next(error);
  }
};

// @desc    Get current queue status for the logged-in patient
// @route   GET /api/queue/my-status
// @access  Private (Patient)
const getMyQueueStatus = async (req, res, next) => {
  try {
    // Find the latest active or relevant queue entry for this patient
    // Prioritize 'waiting' or 'in-consultation', otherwise latest created
    let userQueue = await Queue.findOne({
      patientId: req.user._id,
      status: { $in: ['waiting', 'in-consultation'] },
    })
      .sort({ createdAt: -1 })
      .populate('doctorId', 'name specialization department roomNumber averageConsultationMinutes')
      .populate('appointmentId');

    // If no waiting/in-consultation, check for recent completed/cancelled entry today
    if (!userQueue) {
      userQueue = await Queue.findOne({
        patientId: req.user._id,
      })
        .sort({ createdAt: -1 })
        .populate('doctorId', 'name specialization department roomNumber averageConsultationMinutes')
        .populate('appointmentId');
    }

    if (!userQueue) {
      return res.status(200).json({
        success: true,
        hasActiveQueue: false,
        message: 'No active queue token found. Please check in to your appointment when ready.',
      });
    }

    const doctorId = userQueue.doctorId._id;
    const date = userQueue.date;
    const avgConsultMinutes =
      userQueue.doctorId.averageConsultationMinutes ||
      Number(process.env.AVG_CONSULTATION_MINUTES) ||
      15;

    // 1. Current token being served for this doctor and date
    // Look for doctor's in-consultation patient
    const inConsultationEntry = await Queue.findOne({
      doctorId,
      orgId: userQueue.orgId,
      date,
      status: 'in-consultation',
    });

    let currentTokenBeingServed = null;
    if (inConsultationEntry) {
      currentTokenBeingServed = inConsultationEntry.tokenNumber;
    } else {
      // If none currently in-consultation, look for highest completed token
      const lastCompleted = await Queue.findOne({
        doctorId,
        orgId: userQueue.orgId,
        date,
        status: 'completed',
      }).sort({ tokenNumber: -1 });

      if (lastCompleted) {
        currentTokenBeingServed = lastCompleted.tokenNumber;
      } else {
        currentTokenBeingServed = 0; // Queue has not started serving yet
      }
    }

    // 2. Count patients ahead (only waiting tokens strictly before patient's token)
    let patientsAhead = 0;
    if (userQueue.status === 'waiting') {
      patientsAhead = await Queue.countDocuments({
        doctorId,
        orgId: userQueue.orgId,
        date,
        status: 'waiting',
        tokenNumber: { $lt: userQueue.tokenNumber },
      });
    } else if (userQueue.status === 'in-consultation') {
      patientsAhead = 0;
    }

    // 3. Estimated waiting time
    // If user is currently in consultation, estimated wait is 0 mins.
    // If waiting, wait time = (patientsAhead * avgConsultMinutes)
    const activeConsultationAhead =
      userQueue.status === 'waiting' &&
      inConsultationEntry &&
      inConsultationEntry.tokenNumber < userQueue.tokenNumber
        ? 1
        : 0;
    const estimatedWaitMinutes =
      userQueue.status === 'waiting'
        ? (patientsAhead + activeConsultationAhead) * avgConsultMinutes
        : 0;

    res.status(200).json({
      success: true,
      hasActiveQueue: true,
      queue: userQueue,
      currentTokenBeingServed,
      patientsAhead,
      estimatedWaitMinutes,
      averageConsultationMinutes: avgConsultMinutes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get queue list for a specific doctor & date (Live queue board / receptionist view)
// @route   GET /api/queue/doctor/:doctorId
// @access  Public or Protected
const getDoctorQueue = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const date = req.query.date || getLocalDateString();
    let orgId = typeof req.query.orgId === 'string' ? req.query.orgId : null;
    const isOrgAdmin = req.user?.role === 'orgAdmin' || req.user?.roles?.includes('orgAdmin');
    if (isOrgAdmin) orgId = req.user.orgId?.toString() || null;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    if (orgId && !(await DoctorAffiliation.exists({ doctorId, orgId }))) {
      return res.status(403).json({
        success: false,
        message: 'Doctor is not affiliated with this organisation',
      });
    }
    if (orgId && !isOrgAdmin) {
      const activeOrganisation = await Organisation.exists({
        _id: orgId,
        isActive: true,
        approvalStatus: 'approved',
      });
      if (!activeOrganisation) {
        return res.status(404).json({ success: false, message: 'Organisation not found or not active' });
      }
    }
    if (!orgId) {
      const affiliation = await DoctorAffiliation.findOne({ doctorId })
        .populate({ path: 'orgId', match: { isActive: true, approvalStatus: 'approved' } })
        .sort({ createdAt: 1 });
      orgId = affiliation?.orgId?._id?.toString() || null;
    }

    const queueEntries = await Queue.find({ doctorId, date, orgId })
      .populate('patientId', 'name phone')
      .populate('appointmentId', 'time reason')
      .sort({ tokenNumber: 1 });

    // Calculate queue metrics
    const waitingList = queueEntries.filter((q) => q.status === 'waiting');
    const inConsultation = queueEntries.find((q) => q.status === 'in-consultation');
    const completedList = queueEntries.filter((q) => q.status === 'completed');

    // Role-based privacy filtering: Staff sees full clinical details; Public/other patients see privacy-masked tokens
    const isStaff = req.user &&
      (['receptionist', 'admin', 'superadmin', 'orgAdmin'].includes(req.user.role) ||
        req.user.roles?.includes('orgAdmin'));
    const isAssignedDoctor =
      req.user?.role === 'doctor' &&
      (await Doctor.exists({ _id: doctorId, userId: req.user._id }));
    const requestingUserId = req.user?._id?.toString();

    const sanitizedEntries = queueEntries.map((entry) => {
      const isSelf = requestingUserId && entry.patientId?._id?.toString() === requestingUserId;
      if (
        (isStaff && (!isOrgAdmin || entry.orgId?.toString() === req.user.orgId?.toString())) ||
        isAssignedDoctor ||
        isSelf
      ) {
        return entry;
      }

      // Anonymize for other patients / public waiting room board
      const entryObj = entry.toObject();
      const rawName = entryObj.patientId?.name || 'Patient';
      const parts = rawName.trim().split(' ');
      const maskedName = parts.length > 1
        ? `${parts[0]} ${parts[parts.length - 1][0]}.`
        : parts[0];

      return {
        ...entryObj,
        patientId: {
          _id: entryObj.patientId?._id,
          name: maskedName,
        },
        appointmentId: {
          _id: entryObj.appointmentId?._id,
          time: entryObj.appointmentId?.time,
        },
      };
    });

    res.status(200).json({
      success: true,
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization,
        department: doctor.department,
        roomNumber: doctor.roomNumber,
        averageConsultationMinutes: doctor.averageConsultationMinutes,
      },
      date,
      summary: {
        totalTokens: queueEntries.length,
        waitingCount: waitingList.length,
        completedCount: completedList.length,
        currentServingToken: inConsultation ? inConsultation.tokenNumber : null,
      },
      queueEntries: sanitizedEntries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Advance the queue using the receptionist/doctor status transitions
// @route   PATCH /api/queue/:id/advance
// @access  Private (Staff: Receptionist, Admin)
const advanceQueue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetStatus } = req.body;

    const queueEntry = await Queue.findById(id).populate('doctorId');
    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found',
      });
    }

    const doctorId = queueEntry.doctorId._id;
    const date = queueEntry.date;
    const isOrgAdmin = req.user.role === 'orgAdmin' || req.user.roles?.includes('orgAdmin');
    if (isOrgAdmin && queueEntry.orgId?.toString() !== req.user.orgId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Queue entry is outside your organisation',
      });
    }

    const requestedStatus =
      targetStatus ||
      (queueEntry.status === 'waiting'
        ? 'in-consultation'
        : queueEntry.status === 'in-consultation'
          ? 'completed'
          : null);
    const validNextStatus = {
      waiting: 'in-consultation',
      'in-consultation': 'completed',
    }[queueEntry.status];

    if (!requestedStatus || requestedStatus !== validNextStatus) {
      return res.status(400).json({
        success: false,
        message: `Invalid queue transition from '${queueEntry.status}' to '${requestedStatus || 'unknown'}'`,
      });
    }

    if (!isOrgAdmin && req.user.role === 'receptionist' && requestedStatus !== 'in-consultation') {
      return res.status(403).json({
        success: false,
        message: 'Receptionists can call waiting patients; doctors complete consultations',
      });
    }

    if (!isOrgAdmin && req.user.role === 'doctor' && requestedStatus !== 'completed') {
      return res.status(403).json({
        success: false,
        message: 'Doctors can complete consultations; receptionists call waiting patients',
      });
    }

    if (req.user.role === 'doctor') {
      const assignedDoctor = await Doctor.findOne({ userId: req.user._id });
      if (!assignedDoctor || !assignedDoctor._id.equals(doctorId)) {
        return res.status(403).json({
          success: false,
          message: 'Doctors can only update consultations assigned to their profile',
        });
      }
    }

    if (requestedStatus === 'in-consultation') {
      const activeConsultation = await Queue.findOne({
        doctorId,
        orgId: queueEntry.orgId,
        date,
        status: 'in-consultation',
      });
      if (activeConsultation) {
        return res.status(409).json({
          success: false,
          message: `Token #${activeConsultation.tokenNumber} is still in consultation`,
        });
      }

      const nextWaitingEntry = await Queue.findOne({
        doctorId,
        orgId: queueEntry.orgId,
        date,
        status: 'waiting',
      }).sort({ tokenNumber: 1 });
      if (nextWaitingEntry && !nextWaitingEntry._id.equals(queueEntry._id)) {
        return res.status(409).json({
          success: false,
          message: `Call the next waiting token, #${nextWaitingEntry.tokenNumber}`,
        });
      }

      const appointmentTransition = await Appointment.findOneAndUpdate(
        { _id: queueEntry.appointmentId, orgId: queueEntry.orgId, status: 'checked-in' },
        { status: 'in-consultation' }
      );
      if (!appointmentTransition) {
        return res.status(409).json({
          success: false,
          message: 'Appointment is no longer checked in and cannot start consultation',
        });
      }

      queueEntry.status = 'in-consultation';
      queueEntry.calledAt = new Date();
    } else {
      const appointmentTransition = await Appointment.findOneAndUpdate(
        { _id: queueEntry.appointmentId, orgId: queueEntry.orgId, status: 'in-consultation' },
        { status: 'completed' }
      );
      if (!appointmentTransition) {
        return res.status(409).json({
          success: false,
          message: 'Appointment is not in consultation and cannot be completed',
        });
      }

      queueEntry.status = 'completed';
      queueEntry.completedAt = new Date();
    }

    try {
      await queueEntry.save();
    } catch (error) {
      const rollbackStatus =
        requestedStatus === 'in-consultation' ? 'checked-in' : 'in-consultation';
      const nextStatus =
        requestedStatus === 'in-consultation' ? 'in-consultation' : 'completed';
      await Appointment.updateOne(
        { _id: queueEntry.appointmentId, status: nextStatus },
        { status: rollbackStatus }
      );
      throw error;
    }

    // If queue item is marked completed, update the associated appointment status to 'completed'
    const updatedEntry = await Queue.findById(queueEntry._id)
      .populate('patientId', 'name phone')
      .populate('appointmentId');

    res.status(200).json({
      success: true,
      message: `Token #${updatedEntry.tokenNumber} status updated to '${updatedEntry.status}'`,
      queue: updatedEntry,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkInAppointment,
  getMyQueueStatus,
  getDoctorQueue,
  advanceQueue,
};
