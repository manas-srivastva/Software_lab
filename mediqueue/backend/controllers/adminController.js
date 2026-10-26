const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Queue = require('../models/Queue');
const { createNotification } = require('./notificationController');

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @desc    Get system-wide analytics & reports
// @route   GET /api/admin/reports
// @access  Private (Admin)
const getSystemReports = async (req, res, next) => {
  try {
    const today = getTodayDateString();

    const [
      totalPatients,
      totalDoctors,
      activeDoctors,
      totalAppointments,
      todayAppointments,
      todayCompleted,
      todayCancelled,
      activeQueueCount,
      allDoctors,
    ] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      Doctor.countDocuments({}),
      Doctor.countDocuments({ isActive: true }),
      Appointment.countDocuments({}),
      Appointment.countDocuments({ date: today }),
      Appointment.countDocuments({ date: today, status: 'completed' }),
      Appointment.countDocuments({ date: today, status: 'cancelled' }),
      Queue.countDocuments({ date: today, status: { $in: ['waiting', 'in-consultation'] } }),
      Doctor.find({}).select('name department specialization isActive'),
    ]);

    // Department breakdown
    const departmentMap = {};
    allDoctors.forEach((d) => {
      if (!departmentMap[d.department]) {
        departmentMap[d.department] = { count: 0, active: 0 };
      }
      departmentMap[d.department].count += 1;
      if (d.isActive) departmentMap[d.department].active += 1;
    });

    const departments = Object.keys(departmentMap).map((name) => ({
      name,
      doctorCount: departmentMap[name].count,
      activeCount: departmentMap[name].active,
    }));

    res.status(200).json({
      success: true,
      reportDate: today,
      stats: {
        totalPatients,
        totalDoctors,
        activeDoctors,
        totalAppointments,
        todayAppointments,
        todayCompleted,
        todayCancelled,
        activeQueueCount,
      },
      departments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all doctors with filtering by status and search (Admin view)
// @route   GET /api/admin/doctors
// @access  Private (Admin)
const getAdminDoctors = async (req, res, next) => {
  try {
    const { status, verificationStatus, search } = req.query;
    const query = {};

    const targetStatus = status || verificationStatus;
    if (targetStatus && targetStatus !== 'ALL') {
      query.verificationStatus = targetStatus;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { specialization: searchRegex },
        { department: searchRegex },
        { medicalRegistrationNumber: searchRegex },
        { email: searchRegex },
      ];
    }

    const doctors = await Doctor.find(query)
      .populate('userId', 'name email phone createdAt')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin creates or invites a doctor directly (Workflow 1)
// @route   POST /api/admin/doctors
// @access  Private (Admin)
const createDoctor = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      specialization,
      department,
      medicalRegistrationNumber,
      availableDays,
      availableSlots,
      averageConsultationMinutes,
      qualifications,
      experienceYears,
      roomNumber,
      clinicHospitalName,
      clinicAddress,
      isActive,
      verificationStatus,
      password,
    } = req.body;

    if (!name || !specialization || !department) {
      return res.status(400).json({
        success: false,
        message: 'Please provide doctor name, specialization, and department',
      });
    }

    const regNumber =
      medicalRegistrationNumber && medicalRegistrationNumber.trim()
        ? medicalRegistrationNumber.trim()
        : `MED-REG-${Date.now().toString().slice(-6)}`;

    // Check if doctor registration number already exists
    const existingReg = await Doctor.findOne({ medicalRegistrationNumber: regNumber });
    if (existingReg) {
      return res.status(400).json({
        success: false,
        message: 'A doctor with this medical registration number already exists',
      });
    }

    const initialStatus = verificationStatus || 'APPROVED';
    const isDoctorActive = isActive !== undefined ? isActive : initialStatus === 'APPROVED';

    const doctor = await Doctor.create({
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      specialization: specialization.trim(),
      department: department.trim(),
      medicalRegistrationNumber: regNumber,
      availableDays: availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableSlots: availableSlots || [
        '09:00 AM',
        '09:30 AM',
        '10:00 AM',
        '10:30 AM',
        '11:00 AM',
        '02:00 PM',
        '02:30 PM',
        '03:00 PM',
      ],
      averageConsultationMinutes: averageConsultationMinutes || 15,
      qualifications: qualifications || 'MBBS, MD',
      experienceYears: experienceYears !== undefined ? Number(experienceYears) : 5,
      roomNumber: roomNumber || 'OPD Room 101',
      clinicHospitalName: clinicHospitalName || 'MediQueue Health Center',
      clinicAddress: clinicAddress || '100 Medical Center Blvd',
      verificationStatus: initialStatus,
      isActive: isDoctorActive,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      statusHistory: [
        {
          fromStatus: 'NONE',
          toStatus: initialStatus,
          changedBy: req.user._id,
          changedByName: req.user.name,
          reason: 'Doctor created directly by administrator',
          timestamp: new Date(),
        },
      ],
    });

    // If email provided, create or link doctor User account so they can log in
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      let user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        user = await User.create({
          name: name.trim(),
          email: normalizedEmail,
          phone: phone || '+1 555-0100',
          password: password || 'doctor123456',
          role: 'doctor',
          doctorId: doctor._id,
        });
      } else {
        user.role = 'doctor';
        user.doctorId = doctor._id;
        await user.save();
      }
      doctor.userId = user._id;
      await doctor.save();
    }

    res.status(201).json({
      success: true,
      message: 'Doctor profile created successfully',
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update doctor details
// @route   PUT /api/admin/doctors/:id
// @access  Private (Admin)
const updateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Doctor updated successfully',
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle doctor active status
// @route   PATCH /api/admin/doctors/:id/toggle
// @access  Private (Admin)
const toggleDoctorStatus = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    doctor.isActive = !doctor.isActive;
    doctor.statusHistory.push({
      fromStatus: doctor.verificationStatus,
      toStatus: doctor.verificationStatus,
      changedBy: req.user._id,
      changedByName: req.user.name,
      reason: `Doctor active status toggled to ${doctor.isActive ? 'Active' : 'Inactive'}`,
      timestamp: new Date(),
    });
    await doctor.save();

    res.status(200).json({
      success: true,
      message: `Doctor status updated to ${doctor.isActive ? 'Active' : 'Inactive'}`,
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin approves doctor application
// @route   PATCH /api/admin/doctors/:id/approve
// @access  Private (Admin)
const approveDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const fromStatus = doctor.verificationStatus;
    const approvalReason = req.body.reason || 'Medical credentials and registration verified by administration';

    doctor.verificationStatus = 'APPROVED';
    doctor.isActive = true;
    doctor.statusReason = '';
    doctor.reviewedBy = req.user._id;
    doctor.reviewedAt = new Date();

    doctor.statusHistory.push({
      fromStatus,
      toStatus: 'APPROVED',
      changedBy: req.user._id,
      changedByName: req.user.name,
      reason: approvalReason,
      timestamp: new Date(),
    });

    await doctor.save();

    // Notify doctor
    if (doctor.userId) {
      await createNotification({
        recipientId: doctor.userId,
        title: 'Application Approved!',
        message:
          'Congratulations! Your doctor application has been verified and approved. You are now active and can accept patient appointments.',
        type: 'APPROVED',
        metadata: { doctorId: doctor._id },
      });
    }

    res.status(200).json({
      success: true,
      message: `Dr. ${doctor.name} has been approved and activated`,
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin requests changes on doctor application
// @route   PATCH /api/admin/doctors/:id/request-changes
// @access  Private (Admin)
const requestChangesDoctor = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a clear reason describing the changes requested',
      });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const fromStatus = doctor.verificationStatus;
    const changeReason = reason.trim();

    doctor.verificationStatus = 'NEEDS_CHANGES';
    doctor.isActive = false;
    doctor.statusReason = changeReason;
    doctor.reviewedBy = req.user._id;
    doctor.reviewedAt = new Date();

    doctor.statusHistory.push({
      fromStatus,
      toStatus: 'NEEDS_CHANGES',
      changedBy: req.user._id,
      changedByName: req.user.name,
      reason: changeReason,
      timestamp: new Date(),
    });

    await doctor.save();

    // Notify doctor
    if (doctor.userId) {
      await createNotification({
        recipientId: doctor.userId,
        title: 'Application Needs Changes',
        message: `Administration requested updates on your application: "${changeReason}". Please log in, update your details, and resubmit.`,
        type: 'CHANGE_REQUESTED',
        metadata: { doctorId: doctor._id, reason: changeReason },
      });
    }

    res.status(200).json({
      success: true,
      message: `Changes requested for Dr. ${doctor.name}. Doctor notified.`,
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin rejects doctor application
// @route   PATCH /api/admin/doctors/:id/reject
// @access  Private (Admin)
const rejectDoctor = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for rejecting the application',
      });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const fromStatus = doctor.verificationStatus;
    const rejectReason = reason.trim();

    doctor.verificationStatus = 'REJECTED';
    doctor.isActive = false;
    doctor.statusReason = rejectReason;
    doctor.reviewedBy = req.user._id;
    doctor.reviewedAt = new Date();

    doctor.statusHistory.push({
      fromStatus,
      toStatus: 'REJECTED',
      changedBy: req.user._id,
      changedByName: req.user.name,
      reason: rejectReason,
      timestamp: new Date(),
    });

    await doctor.save();

    // Notify doctor
    if (doctor.userId) {
      await createNotification({
        recipientId: doctor.userId,
        title: 'Application Rejected',
        message: `Your doctor application was rejected for the following reason: "${rejectReason}".`,
        type: 'REJECTED',
        metadata: { doctorId: doctor._id, reason: rejectReason },
      });
    }

    res.status(200).json({
      success: true,
      message: `Application for Dr. ${doctor.name} rejected`,
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin suspends an active doctor
// @route   PATCH /api/admin/doctors/:id/suspend
// @access  Private (Admin)
const suspendDoctor = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for suspending the doctor',
      });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const fromStatus = doctor.verificationStatus;
    const suspendReason = reason.trim();

    doctor.verificationStatus = 'SUSPENDED';
    doctor.isActive = false;
    doctor.statusReason = suspendReason;
    doctor.reviewedBy = req.user._id;
    doctor.reviewedAt = new Date();

    doctor.statusHistory.push({
      fromStatus,
      toStatus: 'SUSPENDED',
      changedBy: req.user._id,
      changedByName: req.user.name,
      reason: suspendReason,
      timestamp: new Date(),
    });

    await doctor.save();

    // Notify doctor
    if (doctor.userId) {
      await createNotification({
        recipientId: doctor.userId,
        title: 'Account Suspended',
        message: `Your doctor account has been suspended: "${suspendReason}". Contact clinical administration for details.`,
        type: 'SUSPENDED',
        metadata: { doctorId: doctor._id, reason: suspendReason },
      });
    }

    res.status(200).json({
      success: true,
      message: `Dr. ${doctor.name} has been suspended`,
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit trail history for a doctor
// @route   GET /api/admin/doctors/:id/audit-trail
// @access  Private (Admin)
const getDoctorAuditTrail = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .select('name specialization medicalRegistrationNumber verificationStatus statusReason statusHistory reviewedBy reviewedAt')
      .populate('statusHistory.changedBy', 'name email role')
      .populate('reviewedBy', 'name email role');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.status(200).json({
      success: true,
      auditTrail: doctor.statusHistory || [],
      currentStatus: doctor.verificationStatus,
      statusReason: doctor.statusReason,
      reviewedBy: doctor.reviewedBy,
      reviewedAt: doctor.reviewedAt,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered patients
// @route   GET /api/admin/patients
// @access  Private (Admin)
const getAdminPatients = async (req, res, next) => {
  try {
    const patients = await User.find({ role: 'patient' })
      .select('-password')
      .sort({ createdAt: -1 });

    // Count appointments for each patient
    const patientIds = patients.map((p) => p._id);
    const appointmentCounts = await Appointment.aggregate([
      { $match: { patientId: { $in: patientIds } } },
      { $group: { _id: '$patientId', total: { $sum: 1 } } },
    ]);

    const countMap = {};
    appointmentCounts.forEach((c) => {
      countMap[c._id.toString()] = c.total;
    });

    const patientsWithStats = patients.map((p) => ({
      ...p.toObject(),
      totalAppointments: countMap[p._id.toString()] || 0,
    }));

    res.status(200).json({
      success: true,
      count: patientsWithStats.length,
      patients: patientsWithStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all clinical departments and their summary
// @route   GET /api/admin/departments
// @access  Private (Admin)
const getAdminDepartments = async (req, res, next) => {
  try {
    const doctors = await Doctor.find({});
    const deptMap = {};

    doctors.forEach((d) => {
      if (!deptMap[d.department]) {
        deptMap[d.department] = {
          name: d.department,
          totalDoctors: 0,
          activeDoctors: 0,
          doctorsList: [],
        };
      }
      deptMap[d.department].totalDoctors += 1;
      if (d.isActive) deptMap[d.department].activeDoctors += 1;
      deptMap[d.department].doctorsList.push({
        _id: d._id,
        name: d.name,
        specialization: d.specialization,
        roomNumber: d.roomNumber,
        isActive: d.isActive,
      });
    });

    res.status(200).json({
      success: true,
      departments: Object.values(deptMap),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSystemReports,
  getAdminDoctors,
  createDoctor,
  updateDoctor,
  toggleDoctorStatus,
  approveDoctor,
  requestChangesDoctor,
  rejectDoctor,
  suspendDoctor,
  getDoctorAuditTrail,
  getAdminPatients,
  getAdminDepartments,
};
