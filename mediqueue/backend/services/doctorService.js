const Doctor = require('../models/Doctor');
const DoctorAffiliation = require('../models/DoctorAffiliation');
const Organisation = require('../models/Organisation');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeFilter = (value) => (typeof value === 'string' ? value.trim() : '');

const listDoctors = async ({ search, specialization, department, city, location }) => {
  const searchTerm = normalizeFilter(search);
  const specializationFilter = normalizeFilter(specialization);
  const departmentFilter = normalizeFilter(department);
  const cityFilter = normalizeFilter(city);
  const locationFilter = cityFilter || normalizeFilter(location);
  const locationRegex = locationFilter ? new RegExp(escapeRegex(locationFilter), 'i') : null;

  const organisationQuery = { isActive: true, approvalStatus: 'approved' };
  if (cityFilter) {
    organisationQuery.city = locationRegex;
  } else if (locationRegex) {
    organisationQuery.$or = [{ city: locationRegex }, { address: locationRegex }];
  }

  const organisations = await Organisation.find(organisationQuery)
    .select('name type address city')
    .lean();
  const organisationIds = organisations.map((organisation) => organisation._id);
  const allActiveOrganisationIds = await Organisation.distinct('_id', {
    isActive: true,
    approvalStatus: 'approved',
  });

  const [affiliations, allAffiliatedDoctorIds, activeAffiliatedDoctorIds] = await Promise.all([
    organisationIds.length
      ? DoctorAffiliation.find({ orgId: { $in: organisationIds } })
          .select('doctorId orgId availableDays availableSlots consultationFee roomNumber')
          .lean()
      : [],
    DoctorAffiliation.distinct('doctorId'),
    allActiveOrganisationIds.length
      ? DoctorAffiliation.distinct('doctorId', { orgId: { $in: allActiveOrganisationIds } })
      : [],
  ]);

  const affiliationsByDoctor = new Map();
  affiliations.forEach((affiliation) => {
    const doctorId = affiliation.doctorId.toString();
    const doctorAffiliations = affiliationsByDoctor.get(doctorId) || [];
    doctorAffiliations.push(affiliation);
    affiliationsByDoctor.set(doctorId, doctorAffiliations);
  });

  const organisationsById = new Map(
    organisations.map((organisation) => [organisation._id.toString(), organisation])
  );
  const activeAffiliatedDoctorIdSet = new Set(
    activeAffiliatedDoctorIds.map((doctorId) => doctorId.toString())
  );
  const inactiveOnlyDoctorIds = allAffiliatedDoctorIds.filter(
    (doctorId) => !activeAffiliatedDoctorIdSet.has(doctorId.toString())
  );
  const matchingOrganisationDoctorIds = searchTerm
    ? affiliations
        .filter((affiliation) => {
          const organisation = organisationsById.get(affiliation.orgId.toString());
          const searchRegex = new RegExp(escapeRegex(searchTerm), 'i');
          return [organisation.name, organisation.address, organisation.city, organisation.type].some(
            (value) => searchRegex.test(value || '')
          );
        })
        .map((affiliation) => affiliation.doctorId)
    : [];

  const doctorQuery = {
    isActive: true,
    verificationStatus: 'APPROVED',
  };
  if (specializationFilter && specializationFilter !== 'All') {
    doctorQuery.specialization = new RegExp(`^${escapeRegex(specializationFilter)}$`, 'i');
  }
  if (departmentFilter && departmentFilter !== 'All') {
    doctorQuery.department = new RegExp(`^${escapeRegex(departmentFilter)}$`, 'i');
  }

  const conditions = [];
  if (inactiveOnlyDoctorIds.length) {
    conditions.push({ _id: { $nin: inactiveOnlyDoctorIds } });
  }
  if (searchTerm) {
    const searchRegex = new RegExp(escapeRegex(searchTerm), 'i');
    const searchConditions = [
      { name: searchRegex },
      { specialization: searchRegex },
      { department: searchRegex },
      { medicalRegistrationNumber: searchRegex },
    ];
    if (matchingOrganisationDoctorIds.length) {
      searchConditions.push({ _id: { $in: matchingOrganisationDoctorIds } });
    }
    conditions.push({ $or: searchConditions });
  }

  if (locationRegex) {
    const locationDoctorIds = Array.from(affiliationsByDoctor.keys());
    const locationConditions = [
      { clinicAddress: locationRegex, _id: { $nin: allAffiliatedDoctorIds } },
    ];
    if (locationDoctorIds.length) {
      locationConditions.push({ _id: { $in: locationDoctorIds } });
    }
    conditions.push({ $or: locationConditions });
  }
  if (conditions.length) {
    doctorQuery.$and = conditions;
  }

  const doctors = await Doctor.find(doctorQuery)
    .select(
      'name specialization department availableDays availableSlots averageConsultationMinutes qualifications experienceYears roomNumber medicalRegistrationNumber clinicHospitalName clinicAddress verificationStatus'
    )
    .sort({ name: 1 })
    .lean();

  return doctors.map((doctor) => {
    const doctorAffiliations = affiliationsByDoctor.get(doctor._id.toString()) || [];
    return {
      ...doctor,
      organisations: doctorAffiliations.map((affiliation) => {
        const organisation = organisationsById.get(affiliation.orgId.toString());
        return {
          _id: organisation._id,
          name: organisation.name,
          type: organisation.type,
          address: organisation.address,
          city: organisation.city,
          availableDays: affiliation.availableDays,
          availableSlots: affiliation.availableSlots,
          consultationFee: affiliation.consultationFee,
          roomNumber: affiliation.roomNumber,
        };
      }),
    };
  });
};

module.exports = { listDoctors };
