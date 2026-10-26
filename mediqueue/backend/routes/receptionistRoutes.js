const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorizeRoles('receptionist', 'admin'));

router.post('/walk-in', (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Walk-in appointment creation is disabled. Only patients can book; receptionists can check in existing appointments.',
  });
});

module.exports = router;
