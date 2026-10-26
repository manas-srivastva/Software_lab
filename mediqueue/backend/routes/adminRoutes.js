const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorizeRoles('admin'));

// System reports & analytics
router.get('/reports', getSystemReports);

// Doctor management & verification workflow
router.get('/doctors', getAdminDoctors);
router.post('/doctors', createDoctor);
router.put('/doctors/:id', updateDoctor);
router.patch('/doctors/:id/toggle', toggleDoctorStatus);
router.patch('/doctors/:id/approve', approveDoctor);
router.patch('/doctors/:id/request-changes', requestChangesDoctor);
router.patch('/doctors/:id/reject', rejectDoctor);
router.patch('/doctors/:id/suspend', suspendDoctor);
router.get('/doctors/:id/audit-trail', getDoctorAuditTrail);

// Patient management
router.get('/patients', getAdminPatients);

// Department management
router.get('/departments', getAdminDepartments);

module.exports = router;
