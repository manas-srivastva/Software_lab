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

const router = express.Router();

router.post('/register', registerOrganisation);
router.get('/superadmin/pending', protect, authorizeRoles('superadmin'), listPendingOrganisations);
router.patch(
  '/superadmin/:id/:decision',
  protect,
  authorizeRoles('superadmin'),
  reviewOrganisation
);
router.get('/me', protect, authorizeRoles('orgAdmin'), getMyOrganisation);
router.get('/me/doctors', protect, authorizeRoles('orgAdmin'), getOrganisationDoctors);
router.post('/me/doctors', protect, authorizeRoles('orgAdmin'), addDoctorAffiliation);
router.patch(
  '/me/doctors/:affiliationId',
  protect,
  authorizeRoles('orgAdmin'),
  updateDoctorAffiliation
);

module.exports = router;
