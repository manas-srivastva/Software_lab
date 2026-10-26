const express = require('express');
const {
  registerOrganisation,
  listPendingOrganisations,
  reviewOrganisation,
  getMyOrganisation,
  getOrganisationDoctors,
  addDoctorAffiliation,
  updateDoctorAffiliation,
} = require('../controllers/organisationController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { requireOrganisationContext } = require('../middleware/requireOrganisationContext');

const router = express.Router();

router.post('/register', registerOrganisation);
router.get('/superadmin/pending', protect, authorizeRoles('superadmin'), listPendingOrganisations);
router.patch(
  '/superadmin/:id/:decision',
  protect,
  authorizeRoles('superadmin'),
  reviewOrganisation
);
router.get('/me', protect, authorizeRoles('orgAdmin'), requireOrganisationContext, getMyOrganisation);
router.get('/me/doctors', protect, authorizeRoles('orgAdmin'), requireOrganisationContext, getOrganisationDoctors);
router.post('/me/doctors', protect, authorizeRoles('orgAdmin'), requireOrganisationContext, addDoctorAffiliation);
router.patch(
  '/me/doctors/:affiliationId',
  protect,
  authorizeRoles('orgAdmin'),
  requireOrganisationContext,
  updateDoctorAffiliation
);

module.exports = router;
