const User = require('../models/User');
const Doctor = require('../models/Doctor');
const DoctorAffiliation = require('../models/DoctorAffiliation');
const Organisation = require('../models/Organisation');
const generateToken = require('../utils/generateToken');

const registerOrganisation = async (req, res, next) => {
  let user;
  let organisation;
  try {
    const { name, email, phone, password, type, orgName, address, city } = req.body;
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      typeof phone !== 'string' ||
      typeof password !== 'string' ||
      password.length < 6 ||
      typeof orgName !== 'string' ||
      !orgName.trim() ||
      !['hospital', 'clinic'].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide contact details, a password of at least 6 characters, organisation name, and type (hospital or clinic)',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password,
      role: 'orgAdmin',
    });
    organisation = await Organisation.create({
      type,
      name: orgName.trim(),
      address: typeof address === 'string' ? address.trim() : '',
      city: typeof city === 'string' ? city.trim() : '',
      phone: phone.trim(),
      orgAdmin: user._id,
      isActive: false,
      approvalStatus: 'pending',
    });
    user.orgId = organisation._id;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Organisation submitted for platform approval',
      token: generateToken(user._id, user.role),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        roles: user.roles,
        orgId: user.orgId,
      },
      organisation,
    });
  } catch (error) {
    if (organisation) await Organisation.deleteOne({ _id: organisation._id });
    if (user) await User.deleteOne({ _id: user._id });
    next(error);
  }
};

const listPendingOrganisations = async (req, res, next) => {
  try {
    const organisations = await Organisation.find({ approvalStatus: 'pending' })
      .populate('orgAdmin', 'name email phone')
      .sort({ createdAt: 1 });
    res.status(200).json({ success: true, count: organisations.length, organisations });
  } catch (error) {
    next(error);
  }
};

const reviewOrganisation = async (req, res, next) => {
  try {
    const { decision } = req.params;
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be approve or reject' });
    }
    const organisation = await Organisation.findById(req.params.id);
    if (!organisation) {
      return res.status(404).json({ success: false, message: 'Organisation not found' });
    }
    if (organisation.approvalStatus !== 'pending') {
      return res.status(409).json({ success: false, message: 'Organisation has already been reviewed' });
    }

    organisation.approvalStatus = decision === 'approve' ? 'approved' : 'rejected';
    organisation.isActive = decision === 'approve';
    organisation.approvedBy = decision === 'approve' ? req.user._id : null;
    organisation.approvedAt = decision === 'approve' ? new Date() : null;
    await organisation.save();

    res.status(200).json({ success: true, organisation });
  } catch (error) {
    next(error);
  }
};

const getMyOrganisation = async (req, res, next) => {
  try {
    const organisation = req.user.orgId
      ? await Organisation.findById(req.user.orgId)
      : await Organisation.findOne({ orgAdmin: req.user._id });
    if (!organisation) {
      return res.status(404).json({ success: false, message: 'Organisation not found for this account' });
    }
    res.status(200).json({ success: true, organisation });
  } catch (error) {
    next(error);
  }
};

const getOrganisationDoctors = async (req, res, next) => {
  try {
    const orgId = req.user.orgId;
    const affiliations = await DoctorAffiliation.find({ orgId })
      .populate('doctorId', 'name email specialization department verificationStatus isActive')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: affiliations.length, affiliations });
  } catch (error) {
    next(error);
  }
};

const addDoctorAffiliation = async (req, res, next) => {
  try {
    const { doctorId, availableDays, availableSlots, consultationFee, roomNumber } = req.body;
    if (!doctorId || !/^[a-f\d]{24}$/i.test(doctorId)) {
      return res.status(400).json({ success: false, message: 'Provide a valid doctor ID' });
    }
    if (
      (availableDays !== undefined &&
        (!Array.isArray(availableDays) || availableDays.some((day) => typeof day !== 'string'))) ||
      (availableSlots !== undefined &&
        (!Array.isArray(availableSlots) || availableSlots.some((slot) => typeof slot !== 'string'))) ||
      (consultationFee !== undefined &&
        (!Number.isFinite(Number(consultationFee)) || Number(consultationFee) < 0)) ||
      (roomNumber !== undefined && typeof roomNumber !== 'string')
    ) {
      return res.status(400).json({ success: false, message: 'Invalid affiliation availability, fee, or room details' });
    }

    const [doctor, organisation] = await Promise.all([
      Doctor.findById(doctorId),
      Organisation.findOne({ _id: req.user.orgId, isActive: true, approvalStatus: 'approved' }),
    ]);
    if (!organisation) {
      return res.status(403).json({ success: false, message: 'Your organisation is not approved and active' });
    }
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const affiliation = await DoctorAffiliation.create({
      doctorId,
      orgId: organisation._id,
      availableDays: availableDays || doctor.availableDays,
      availableSlots: availableSlots || doctor.availableSlots,
      consultationFee: consultationFee === undefined ? 0 : Number(consultationFee),
      roomNumber: roomNumber || doctor.roomNumber,
    });
    res.status(201).json({ success: true, affiliation });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Doctor is already affiliated with this organisation' });
    }
    next(error);
  }
};

const updateDoctorAffiliation = async (req, res, next) => {
  try {
    const { availableDays, availableSlots, consultationFee, roomNumber } = req.body;
    if (
      (availableDays !== undefined &&
        (!Array.isArray(availableDays) || availableDays.some((day) => typeof day !== 'string'))) ||
      (availableSlots !== undefined &&
        (!Array.isArray(availableSlots) || availableSlots.some((slot) => typeof slot !== 'string'))) ||
      (consultationFee !== undefined &&
        (!Number.isFinite(Number(consultationFee)) || Number(consultationFee) < 0)) ||
      (roomNumber !== undefined && typeof roomNumber !== 'string')
    ) {
      return res.status(400).json({ success: false, message: 'Invalid affiliation availability, fee, or room details' });
    }
    const affiliation = await DoctorAffiliation.findOne({
      _id: req.params.affiliationId,
      orgId: req.user.orgId,
    });
    if (!affiliation) {
      return res.status(404).json({ success: false, message: 'Doctor affiliation not found in your organisation' });
    }

    if (availableDays !== undefined) affiliation.availableDays = availableDays;
    if (availableSlots !== undefined) affiliation.availableSlots = availableSlots;
    if (consultationFee !== undefined) affiliation.consultationFee = Number(consultationFee);
    if (roomNumber !== undefined) affiliation.roomNumber = roomNumber.trim();
    await affiliation.save();
    res.status(200).json({ success: true, affiliation });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerOrganisation,
  listPendingOrganisations,
  reviewOrganisation,
  getMyOrganisation,
  getOrganisationDoctors,
  addDoctorAffiliation,
  updateDoctorAffiliation,
};
