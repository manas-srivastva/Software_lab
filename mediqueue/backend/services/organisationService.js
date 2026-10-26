const DoctorAffiliation = require('../models/DoctorAffiliation');
const Organisation = require('../models/Organisation');
const User = require('../models/User');

const resolveDoctorAffiliation = async (doctor, requestedOrgId) => {
  const affiliations = await DoctorAffiliation.find({ doctorId: doctor._id }).populate('orgId');
  const activeAffiliations = affiliations.filter(
    (affiliation) =>
      affiliation.orgId?.isActive && affiliation.orgId.approvalStatus === 'approved'
  );

  if (requestedOrgId) {
    if (!/^[a-f\d]{24}$/i.test(requestedOrgId)) {
      return { error: 'Please provide a valid organisation ID', status: 400 };
    }
    const affiliation = activeAffiliations.find(
      (item) => item.orgId._id.toString() === requestedOrgId
    );
    return affiliation
      ? { affiliation }
      : { error: 'Doctor is not affiliated with an active organisation matching this selection', status: 404 };
  }

  if (activeAffiliations.length === 1) {
    return { affiliation: activeAffiliations[0] };
  }
  if (activeAffiliations.length > 1) {
    return { error: 'Please select an organisation for this doctor', status: 400 };
  }
  if (affiliations.length) {
    return { error: 'This doctor has no approved, active organisation affiliation', status: 403 };
  }

  const orgAdmin = await User.findOne({ role: { $in: ['superadmin', 'admin'] } });
  if (!orgAdmin) {
    return {
      error: 'No organisation administrator is available to migrate this legacy doctor profile',
      status: 503,
    };
  }

  const organisation = await Organisation.create({
    type: 'clinic',
    name: doctor.clinicHospitalName || `${doctor.name} Practice`,
    address: doctor.clinicAddress || '',
    orgAdmin: orgAdmin._id,
    isActive: true,
    approvalStatus: 'approved',
    approvedBy: orgAdmin._id,
    approvedAt: new Date(),
  });

  try {
    const affiliation = await DoctorAffiliation.create({
      doctorId: doctor._id,
      orgId: organisation._id,
      availableDays: doctor.availableDays,
      availableSlots: doctor.availableSlots,
      roomNumber: doctor.roomNumber,
    });
    return { affiliation };
  } catch (error) {
    await Organisation.deleteOne({ _id: organisation._id });
    if (error.code === 11000) {
      const existingAffiliation = await DoctorAffiliation.findOne({ doctorId: doctor._id }).populate('orgId');
      if (
        existingAffiliation?.orgId?.isActive &&
        existingAffiliation.orgId.approvalStatus === 'approved'
      ) {
        return { affiliation: existingAffiliation };
      }
    }
    throw error;
  }
};

module.exports = { resolveDoctorAffiliation };
