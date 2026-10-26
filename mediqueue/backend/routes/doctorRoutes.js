const express = require('express');
const router = express.Router();
const {
  getDoctors,
  getDoctorById,
  getDoctorSlots,
  getDoctorProfile,
  updateDoctorProfile,
  resubmitApplication,
  updateDoctorAvailability,
} = require('../controllers/doctorController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Public endpoints
router.get('/', getDoctors);

// Doctor self-management (Must be declared before /:id)
router.get('/me', protect, authorizeRoles('doctor'), getDoctorProfile);
router.put('/me', protect, authorizeRoles('doctor'), updateDoctorProfile);
router.post('/me/resubmit', protect, authorizeRoles('doctor'), resubmitApplication);
router.put('/me/availability', protect, authorizeRoles('doctor'), updateDoctorAvailability);

router.get('/:id', getDoctorById);
router.get('/:id/slots', getDoctorSlots);

module.exports = router;
