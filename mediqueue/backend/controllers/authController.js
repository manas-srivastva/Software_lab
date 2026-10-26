const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Organisation = require('../models/Organisation');
const DoctorAffiliation = require('../models/DoctorAffiliation');
const generateToken = require('../utils/generateToken');
const { createNotification } = require('./notificationController');

// @desc    Register a new patient
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate presence
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, phone number, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Security: Enforce patient role during registration (prevent role elevation)
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password,
      role: 'patient', // Strictly enforce patient role
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        roles: user.roles,
        orgId: user.orgId || null,
        doctorId: user.doctorId || null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        roles: user.roles,
        orgId: user.orgId || null,
        doctorId: user.doctorId || null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register and submit a doctor application (Public onboarding)
// @route   POST /api/auth/doctor/register
// @access  Public
const registerDoctor = async (req, res, next) => {
  let doctor;
  let user;
  let organisation;
  try {
    const {
      name,
      email,
      phone,
      password,
      specialization,
      qualifications,
      experienceYears,
      medicalRegistrationNumber,
      department,
      clinicHospitalName,
      clinicAddress,
      roomNumber,
      availableDays,
      availableSlots,
      averageConsultationMinutes,
      verificationDocuments,
      city,
      consultationFee,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      !email ||
      typeof email !== 'string' ||
      !phone ||
      typeof phone !== 'string' ||
      !password ||
      typeof password !== 'string' ||
      !specialization ||
      typeof specialization !== 'string' ||
      !qualifications ||
      typeof qualifications !== 'string' ||
      !medicalRegistrationNumber ||
      typeof medicalRegistrationNumber !== 'string' ||
      !department ||
      typeof department !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide name, email, phone, password (min 6 chars), specialization, qualifications, medical registration number, and department',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }
    if (
      consultationFee !== undefined &&
      (!Number.isFinite(Number(consultationFee)) || Number(consultationFee) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Consultation fee must be a non-negative number',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanRegNumber = medicalRegistrationNumber.trim();

    // Check email uniqueness across User and Doctor
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    const existingDoctorWithReg = await Doctor.findOne({
      medicalRegistrationNumber: cleanRegNumber,
    });
    if (existingDoctorWithReg) {
      return res.status(400).json({
        success: false,
        message: 'A doctor application or profile with this medical registration number already exists',
      });
    }

    // Validate documents
    const documents = Array.isArray(verificationDocuments)
      ? verificationDocuments.filter(
          (doc) => doc && typeof doc.documentUrl === 'string' && doc.documentUrl.trim()
        )
      : [];

    if (documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one verification document (e.g., medical license copy)',
      });
    }

    // Default consultation days and slots if not supplied
    const defaultDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const defaultSlots = [
      '09:00 AM',
      '09:30 AM',
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '02:00 PM',
      '02:30 PM',
      '03:00 PM',
    ];

    const days = Array.isArray(availableDays) && availableDays.length > 0 ? availableDays : defaultDays;
    const slots = Array.isArray(availableSlots) && availableSlots.length > 0 ? availableSlots : defaultSlots;

    // Security: Enforce doctor role, PENDING status, and isActive = false
    doctor = await Doctor.create({
      name: name.trim(),
      email: normalizedEmail,
      specialization: specialization.trim(),
      department: department.trim(),
      medicalRegistrationNumber: cleanRegNumber,
      qualifications: qualifications.trim(),
      experienceYears: Number(experienceYears) || 0,
      clinicHospitalName: (clinicHospitalName && clinicHospitalName.trim()) || 'MediQueue Health Center',
      clinicAddress: (clinicAddress && clinicAddress.trim()) || '',
      roomNumber: (roomNumber && roomNumber.trim()) || 'Consultation Room',
      availableDays: days,
      availableSlots: slots,
      averageConsultationMinutes: Number(averageConsultationMinutes) || 15,
      verificationStatus: 'PENDING', // strictly enforced
      isActive: false, // strictly inactive until admin approves
      verificationDocuments: documents.map((doc) => ({
        documentType: doc.documentType || 'medical_license',
        documentUrl: doc.documentUrl.trim(),
        documentName: doc.documentName || 'License_Verification_Doc',
        uploadedAt: new Date(),
      })),
      statusHistory: [
        {
          fromStatus: 'NONE',
          toStatus: 'PENDING',
          changedByName: name.trim(),
          reason: 'Doctor submitted professional registration application for administrative review',
          timestamp: new Date(),
        },
      ],
    });

    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password,
      role: 'doctor', // strictly enforced
      roles: ['orgAdmin'],
      doctorId: doctor._id,
    });

    doctor.userId = user._id;
    await doctor.save();

    organisation = await Organisation.create({
      type: 'independent_practice',
      name: clinicHospitalName?.trim() || `${name.trim()} Practice`,
      address: clinicAddress?.trim() || '',
      city: typeof city === 'string' ? city.trim() : '',
      phone: phone.trim(),
      orgAdmin: user._id,
      isActive: false,
      approvalStatus: 'pending',
    });
    user.orgId = organisation._id;
    await user.save();
    await DoctorAffiliation.create({
      doctorId: doctor._id,
      orgId: organisation._id,
      availableDays: days,
      availableSlots: slots,
      consultationFee: consultationFee === undefined ? 0 : Number(consultationFee),
      roomNumber: doctor.roomNumber,
    });

    // Send in-app notification
    await createNotification({
      recipientId: user._id,
      title: 'Doctor Application Submitted',
      message:
        'Your professional doctor registration application has been received and is currently under administrative review. You will be notified once verified.',
      type: 'STATUS_CHANGE',
      metadata: { doctorId: doctor._id, verificationStatus: 'PENDING' },
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Doctor application submitted successfully. Your profile is currently pending verification.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        roles: user.roles,
        orgId: user.orgId,
        doctorId: doctor._id,
        createdAt: user.createdAt,
      },
      doctor,
    });
  } catch (error) {
    if (organisation) await Organisation.deleteOne({ _id: organisation._id });
    if (user) await User.deleteOne({ _id: user._id });
    if (doctor) await Doctor.deleteOne({ _id: doctor._id });
    next(error);
  }
};

module.exports = {
  register,
  registerDoctor,
  login,
  getMe,
};
