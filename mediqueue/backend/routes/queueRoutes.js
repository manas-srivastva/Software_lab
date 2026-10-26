const express = require('express');
const router = express.Router();
const {
  checkInAppointment,
  getMyQueueStatus,
  getDoctorQueue,
  advanceQueue,
} = require('../controllers/queueController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { requireOrganisationContext } = require('../middleware/requireOrganisationContext');

// Privacy-aware live doctor queue display board: masks sensitive info for public/patients, full for staff
router.get('/doctor/:doctorId', optionalAuth, getDoctorQueue);

// Protected routes for patients / checked-in users
router.post(
  '/check-in/:appointmentId',
  protect,
  authorizeRoles('patient', 'receptionist', 'orgAdmin'),
  requireOrganisationContext,
  checkInAppointment
);
router.get('/my-status', protect, authorizeRoles('patient'), getMyQueueStatus);

// Receptionists call the next patient; assigned doctors complete consultations.
router.patch(
  '/:id/advance',
  protect,
  authorizeRoles('doctor', 'receptionist', 'orgAdmin'),
  requireOrganisationContext,
  advanceQueue
);

module.exports = router;
