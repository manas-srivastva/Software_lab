const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const {
  getLocalDateString,
  getWeekdayName,
  isValidDateString,
  isBookableDate,
} = require('../utils/appointmentDate');
const publicDoctorFields =
  'name specialization department availableDays availableSlots averageConsultationMinutes qualifications experienceYears roomNumber medicalRegistrationNumber clinicHospitalName clinicAddress verificationStatus';

// @desc    Get all active, approved doctors with search and filtering
// @route   GET /api/doctors
// @access  Public
const getDoctors = async (req, res, next) => {
  try {
    const { search, specialization, department } = req.query;
    // Strict requirement: Only APPROVED and active doctors appear in patient search
    const query = { isActive: true, verificationStatus: 'APPROVED' };

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { specialization: searchRegex },
        { department: searchRegex },
        { medicalRegistrationNumber: searchRegex },
      ];
    }

    if (specialization && specialization !== 'All') {
      query.specialization = new RegExp(`^${specialization.trim()}$`, 'i');
    }

    if (department && department !== 'All') {
      query.department = new RegExp(`^${department.trim()}$`, 'i');
    }

    const doctors = await Doctor.find(query)
      .select(publicDoctorFields)
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single approved doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
const getDoctorById = async (req, res, next) => {
  try {
    // Only approved and active doctors are visible to public
    const doctor = await Doctor.findOne({
      _id: req.params.id,
      isActive: true,
      verificationStatus: 'APPROVED',
    }).select(publicDoctorFields);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found or currently not accepting appointments',
      });
    }

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available slots for an approved doctor on a specific date
// @route   GET /api/doctors/:id/slots
// @access  Public
const getDoctorSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a date query parameter (YYYY-MM-DD)',
      });
    }

    if (!isValidDateString(date) || date < getLocalDateString()) {
      return res.status(400).json({
        success: false,
        message: 'Date must be a valid current or future date in YYYY-MM-DD format',
      });
    }

    const doctor = await Doctor.findOne({
      _id: req.params.id,
      isActive: true,
      verificationStatus: 'APPROVED',
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found or currently not accepting appointments',
      });
    }

    // A doctor must configure availability before slots can be booked
    if (!doctor.availableDays?.length || !doctor.availableSlots?.length) {
      return res.status(200).json({
        success: true,
        doctorId: doctor._id,
        doctorName: doctor.name,
        date,
        doctorAvailable: false,
        slots: [],
      });
    }

    // Find active appointments for this doctor on the given date
    const bookedAppointments = await Appointment.find({
      doctorId: doctor._id,
      date,
      status: { $ne: 'cancelled' },
    }).select('time');

    const bookedTimes = new Set(bookedAppointments.map((appt) => appt.time));

    // Map all doctor slots with their availability status
    const doctorAvailable = isBookableDate(date, doctor.availableDays);
    const slots = doctor.availableSlots.map((slot) => ({
      time: slot,
      isAvailable: doctorAvailable && !bookedTimes.has(slot),
    }));

    res.status(200).json({
      success: true,
      doctorId: doctor._id,
      doctorName: doctor.name,
      date,
      doctorAvailable,
      slots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently logged-in doctor profile
// @route   GET /api/doctors/me
// @access  Private (Doctor)
const getDoctorProfile = async (req, res, next) => {
  try {
    let doctor = null;
    if (req.user.doctorId) {
      doctor = await Doctor.findById(req.user.doctorId);
    }
    if (!doctor) {
      doctor = await Doctor.findOne({ userId: req.user._id });
    }

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not associated with this account',
      });
    }

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update doctor self profile (credentials, clinic details, verification documents)
// @route   PUT /api/doctors/me
// @access  Private (Doctor)
const updateDoctorProfile = async (req, res, next) => {
  try {
    let doctor = null;
    if (req.user.doctorId) {
      doctor = await Doctor.findById(req.user.doctorId);
    }
    if (!doctor) {
      doctor = await Doctor.findOne({ userId: req.user._id });
    }

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found',
      });
    }

    const {
      name,
      phone,
      specialization,
      qualifications,
      experienceYears,
      department,
      clinicHospitalName,
      clinicAddress,
      roomNumber,
      verificationDocuments,
    } = req.body;

    if (name && typeof name === 'string' && name.trim()) doctor.name = name.trim();
    if (specialization && typeof specialization === 'string') doctor.specialization = specialization.trim();
    if (qualifications && typeof qualifications === 'string') doctor.qualifications = qualifications.trim();
    if (experienceYears !== undefined && !isNaN(experienceYears)) doctor.experienceYears = Number(experienceYears);
    if (department && typeof department === 'string') doctor.department = department.trim();
    if (clinicHospitalName && typeof clinicHospitalName === 'string')
      doctor.clinicHospitalName = clinicHospitalName.trim();
    if (clinicAddress && typeof clinicAddress === 'string') doctor.clinicAddress = clinicAddress.trim();
    if (roomNumber && typeof roomNumber === 'string') doctor.roomNumber = roomNumber.trim();

    if (Array.isArray(verificationDocuments)) {
      doctor.verificationDocuments = verificationDocuments.filter(
        (doc) => doc && doc.documentUrl && typeof doc.documentUrl === 'string'
      );
    }

    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully',
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resubmit doctor application after changes were requested
// @route   POST /api/doctors/me/resubmit
// @access  Private (Doctor)
const resubmitApplication = async (req, res, next) => {
  try {
    let doctor = null;
    if (req.user.doctorId) {
      doctor = await Doctor.findById(req.user.doctorId);
    }
    if (!doctor) {
      doctor = await Doctor.findOne({ userId: req.user._id });
    }

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found',
      });
    }

    if (doctor.verificationStatus !== 'NEEDS_CHANGES' && doctor.verificationStatus !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `Only applications with status 'NEEDS_CHANGES' or 'DRAFT' can be resubmitted. Current status: ${doctor.verificationStatus}`,
      });
    }

    const { resubmissionNotes, verificationDocuments } = req.body;

    if (Array.isArray(verificationDocuments) && verificationDocuments.length > 0) {
      doctor.verificationDocuments = verificationDocuments.filter(
        (doc) => doc && doc.documentUrl && typeof doc.documentUrl === 'string'
      );
    }

    const previousStatus = doctor.verificationStatus;
    doctor.verificationStatus = 'PENDING';
    doctor.statusReason = resubmissionNotes || 'Updated application resubmitted by doctor';

    doctor.statusHistory.push({
      fromStatus: previousStatus,
      toStatus: 'PENDING',
      changedByName: req.user.name || doctor.name,
      reason: resubmissionNotes || 'Doctor updated requested changes and resubmitted application',
      timestamp: new Date(),
    });

    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Application successfully resubmitted. It is now pending administrative review.',
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update doctor availability and consultation settings
// @route   PUT /api/doctors/me/availability
// @access  Private (Doctor)
const updateDoctorAvailability = async (req, res, next) => {
  try {
    let doctor = null;
    if (req.user.doctorId) {
      doctor = await Doctor.findById(req.user.doctorId);
    }
    if (!doctor) {
      doctor = await Doctor.findOne({ userId: req.user._id });
    }

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found',
      });
    }

    // Strict rule: Doctor must be approved and active to configure availability
    if (doctor.verificationStatus !== 'APPROVED' || !doctor.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Only approved, active doctors can configure consultation availability',
      });
    }

    const { availableDays, availableSlots, averageConsultationMinutes, roomNumber } = req.body;

    if (
      (availableDays !== undefined &&
        (!Array.isArray(availableDays) ||
          availableDays.some((day) => typeof day !== 'string'))) ||
      (availableSlots !== undefined &&
        (!Array.isArray(availableSlots) ||
          availableSlots.some((slot) => typeof slot !== 'string')))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Available days and slots must be arrays of strings',
      });
    }

    const nextAvailableDays = availableDays ?? doctor.availableDays;
    const nextAvailableSlots = availableSlots ?? doctor.availableSlots;
    if (
      new Set(nextAvailableDays).size !== nextAvailableDays.length ||
      new Set(nextAvailableSlots).size !== nextAvailableSlots.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Available days and slots cannot contain duplicates',
      });
    }

    const availabilityChanged =
      (availableDays !== undefined &&
        (availableDays.length !== doctor.availableDays.length ||
          availableDays.some((day, index) => day !== doctor.availableDays[index]))) ||
      (availableSlots !== undefined &&
        (availableSlots.length !== doctor.availableSlots.length ||
          availableSlots.some((slot, index) => slot !== doctor.availableSlots[index])));

    if (availabilityChanged) {
      const scheduledAppointments = await Appointment.find({
        doctorId: doctor._id,
        date: { $gte: getLocalDateString() },
        status: { $in: ['pending', 'confirmed', 'checked-in', 'in-consultation'] },
      }).select('date time');
      const conflictingAppointment = scheduledAppointments.find(
        (appointment) =>
          !nextAvailableDays.includes(getWeekdayName(appointment.date)) ||
          !nextAvailableSlots.includes(appointment.time)
      );
      if (conflictingAppointment) {
        return res.status(409).json({
          success: false,
          message: 'Availability cannot remove a day or slot with a scheduled appointment',
        });
      }
    }

    if (roomNumber !== undefined && typeof roomNumber !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Room number must be a string',
      });
    }
    if (
      averageConsultationMinutes !== undefined &&
      (!Number.isInteger(averageConsultationMinutes) ||
        averageConsultationMinutes < 5 ||
        averageConsultationMinutes > 60)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Average consultation duration must be a whole number between 5 and 60 minutes',
      });
    }

    if (availableDays !== undefined) doctor.availableDays = availableDays;
    if (availableSlots !== undefined) doctor.availableSlots = availableSlots;
    if (averageConsultationMinutes !== undefined)
      doctor.averageConsultationMinutes = averageConsultationMinutes;
    if (roomNumber !== undefined) doctor.roomNumber = roomNumber;

    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Doctor availability and settings updated successfully',
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  getDoctorSlots,
  getDoctorProfile,
  updateDoctorProfile,
  resubmitApplication,
  updateDoctorAvailability,
};
