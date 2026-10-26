const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Queue = require('../models/Queue');
const { resolveDoctorAffiliation } = require('../services/organisationService');
const { isBookableDate } = require('../utils/appointmentDate');

// @desc    Book a new medical appointment
// @route   POST /api/appointments
// @access  Private (Patient)
const createAppointment = async (req, res, next) => {
  try {
    const { doctorId, orgId, date, time, reason } = req.body;

    // Validation
    if (
      typeof doctorId !== 'string' ||
      !doctorId ||
      typeof date !== 'string' ||
      typeof time !== 'string' ||
      typeof reason !== 'string' ||
      !time.trim() ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide doctorId, date (YYYY-MM-DD), time slot, and reason for visit',
      });
    }

    // Verify date format
    if (!/^[a-f\d]{24}$/i.test(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid doctor ID',
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Date must be in YYYY-MM-DD format',
      });
    }

    // Check doctor exists, is active, and is approved
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.isActive || doctor.verificationStatus !== 'APPROVED') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found or currently not accepting appointments',
      });
    }

    const resolved = await resolveDoctorAffiliation(doctor, orgId);
    if (resolved.error) {
      return res.status(resolved.status).json({ success: false, message: resolved.error });
    }
    const { affiliation } = resolved;
    const selectedOrgId = affiliation.orgId._id || affiliation.orgId;

    // A doctor must configure availability before slots can be booked
    if (!affiliation.availableDays?.length || !affiliation.availableSlots?.length) {
      return res.status(400).json({
        success: false,
        message: 'Doctor has not configured consultation availability yet',
      });
    }

    if (!isBookableDate(date, affiliation.availableDays)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid future date when this doctor is available',
      });
    }

    // Verify requested time is in doctor's available slots
    if (!affiliation.availableSlots.includes(time)) {
      return res.status(400).json({
        success: false,
        message: `Requested time slot '${time}' is not offered by Dr. ${doctor.name}`,
      });
    }

    // Pre-check for conflicting active booking
    const existingConflict = await Appointment.findOne({
      doctorId,
      date,
      time,
      status: { $ne: 'cancelled' },
    });

    if (existingConflict) {
      return res.status(409).json({
        success: false,
        message: 'This appointment slot has already been booked by another patient. Please choose a different time slot.',
      });
    }

    // Create appointment (Security: always use authenticated req.user._id, never trust patientId in body)
    const appointment = await Appointment.create({
      patientId: req.user._id,
      doctorId,
      orgId: selectedOrgId,
      date,
      time,
      reason: reason.trim(),
      status: 'confirmed',
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('doctorId', 'name specialization department roomNumber averageConsultationMinutes')
      .populate('orgId', 'name city address')
      .populate('patientId', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: populatedAppointment,
    });
  } catch (error) {
    // If concurrent race condition hits unique index in DB
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This appointment slot has just been booked by another patient. Please choose a different time slot.',
      });
    }
    next(error);
  }
};

// @desc    Get all appointments for the logged-in patient
// @route   GET /api/appointments/my
// @access  Private (Patient)
const getMyAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ patientId: req.user._id })
      .populate('doctorId', 'name specialization department roomNumber averageConsultationMinutes')
      .populate('orgId', 'name city address')
      .sort({ date: -1, time: -1 });

    // Also fetch associated queue tokens for these appointments if any
    const appointmentIds = appointments.map((a) => a._id);
    const queues = await Queue.find({ appointmentId: { $in: appointmentIds } });
    const queueMap = {};
    queues.forEach((q) => {
      queueMap[q.appointmentId.toString()] = q;
    });

    const appointmentsWithQueue = appointments.map((appt) => {
      const apptObj = appt.toObject();
      apptObj.queueEntry = queueMap[appt._id.toString()] || null;
      return apptObj;
    });

    res.status(200).json({
      success: true,
      count: appointmentsWithQueue.length,
      appointments: appointmentsWithQueue,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single appointment by ID
// @route   GET /api/appointments/:id
// @access  Private (Patient or Staff)
const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId', 'name specialization department roomNumber averageConsultationMinutes')
      .populate('orgId', 'name city address')
      .populate('patientId', 'name email phone');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Verify ownership or staff permissions
    const isOwner = appointment.patientId._id.toString() === req.user._id.toString();
    const isStaff = ['receptionist', 'admin', 'superadmin'].includes(req.user.role);
    const isOrgAdmin = req.user.role === 'orgAdmin' || req.user.roles?.includes('orgAdmin');
    const doctor = req.user.role === 'doctor'
      ? await Doctor.findOne({ userId: req.user._id }).select('_id')
      : null;
    const isAssignedDoctor = doctor && doctor._id.equals(appointment.doctorId._id);

    const isInOrg = isOrgAdmin && appointment.orgId?.toString() === req.user.orgId?.toString();
    if (!isOwner && !isStaff && !isAssignedDoctor && !isInOrg) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view this appointment',
      });
    }

    const queueEntry = await Queue.findOne({ appointmentId: appointment._id });
    const apptObj = appointment.toObject();
    apptObj.queueEntry = queueEntry || null;

    res.status(200).json({
      success: true,
      appointment: apptObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel an appointment
// @route   PATCH /api/appointments/:id/cancel
// @access  Private (Patient or Staff)
const cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Verify ownership or staff role
    const isOwner = appointment.patientId.toString() === req.user._id.toString();
    const isStaff = ['receptionist', 'admin', 'superadmin'].includes(req.user.role);
    const isOrgAdmin = req.user.role === 'orgAdmin' || req.user.roles?.includes('orgAdmin');

    const isInOrg = isOrgAdmin && appointment.orgId?.toString() === req.user.orgId?.toString();
    if (!isOwner && !isStaff && !isInOrg) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot cancel another patient’s appointment',
      });
    }

    // Check if appointment is already completed or cancelled
    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This appointment is already cancelled',
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed appointments cannot be cancelled',
      });
    }

    if (appointment.status === 'in-consultation') {
      return res.status(400).json({
        success: false,
        message: 'An appointment cannot be cancelled while the consultation is in progress',
      });
    }

    const activeQueueEntry = await Queue.findOne({
      appointmentId: appointment._id,
      status: 'in-consultation',
    });
    if (activeQueueEntry) {
      return res.status(400).json({
        success: false,
        message: 'An appointment cannot be cancelled while the consultation is in progress',
      });
    }

    if (!['pending', 'confirmed', 'checked-in'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Appointments with status '${appointment.status}' cannot be cancelled`,
      });
    }

    const cancelledAppointment = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        status: { $in: ['pending', 'confirmed', 'checked-in'] },
      },
      { status: 'cancelled' },
      { new: true }
    );
    if (!cancelledAppointment) {
      return res.status(409).json({
        success: false,
        message: 'Appointment status changed; refresh and try again',
      });
    }

    // If there is an active queue entry, cancel it too
    await Queue.findOneAndUpdate(
      { appointmentId: appointment._id, status: 'waiting' },
      { status: 'cancelled' }
    );

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('doctorId', 'name specialization department roomNumber averageConsultationMinutes')
      .populate('orgId', 'name city address')
      .populate('patientId', 'name email phone');

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: updatedAppointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all appointments across hospital (Staff Only: Receptionist, Admin)
// @route   GET /api/appointments/all
// @access  Private (Staff)
const getAllAppointments = async (req, res, next) => {
  try {
    const { date, doctorId, status } = req.query;
    const query = {};

    if (req.user.role === 'orgAdmin' || req.user.roles?.includes('orgAdmin')) {
      query.orgId = req.user.orgId;
    } else if (req.query.orgId) {
      query.orgId = req.query.orgId;
    }
    if (date) query.date = date;
    if (doctorId) query.doctorId = doctorId;
    if (status) query.status = status;

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'name specialization department roomNumber averageConsultationMinutes')
      .populate('orgId', 'name city address')
      .populate('patientId', 'name email phone')
      .sort({ date: -1, time: 1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get appointments for the logged-in doctor
// @route   GET /api/appointments/doctor/me
// @access  Private (Doctor)
const getDoctorAppointments = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id }).select('_id');
    const doctorId = doctor?._id;

    if (!doctorId) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not associated with this account',
      });
    }

    const { date, status } = req.query;
    const query = { doctorId };
    if (req.user.role === 'orgAdmin' || req.user.roles?.includes('orgAdmin')) {
      query.orgId = req.user.orgId;
    }
    if (date) query.date = date;
    if (status) query.status = status;

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email phone')
      .sort({ date: 1, time: 1 });

    // Also populate associated queue status
    const apptIds = appointments.map((a) => a._id);
    const queues = await Queue.find({ appointmentId: { $in: apptIds } });
    const queueMap = {};
    queues.forEach((q) => {
      queueMap[q.appointmentId.toString()] = q;
    });

    const appointmentsWithQueue = appointments.map((a) => {
      const aObj = a.toObject();
      aObj.queueEntry = queueMap[a._id.toString()] || null;
      return aObj;
    });

    res.status(200).json({
      success: true,
      count: appointmentsWithQueue.length,
      appointments: appointmentsWithQueue,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  getAllAppointments,
  getDoctorAppointments,
};
