const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  getAllAppointments,
  getDoctorAppointments,
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { requireOrganisationContext } = require('../middleware/requireOrganisationContext');

router.use(protect); // All appointment routes require authentication

// Only patients can book personal appointments (Staff manages clinic appointments and queues)
router.post('/', authorizeRoles('patient'), createAppointment);
router.get('/my', authorizeRoles('patient'), getMyAppointments);
// Doctor Only: View own appointments
router.get('/doctor/me', authorizeRoles('doctor'), getDoctorAppointments);
// Staff Only: Receptionist and Admin can view all clinic bookings
router.get(
  '/all',
  authorizeRoles('receptionist', 'admin', 'superadmin', 'orgAdmin'),
  requireOrganisationContext,
  getAllAppointments
);
router.get('/:id', requireOrganisationContext, getAppointmentById);
// Only patients can cancel their own personal appointments
router.patch(
  '/:id/cancel',
  authorizeRoles('patient'),
  requireOrganisationContext,
  cancelAppointment
);

module.exports = router;
