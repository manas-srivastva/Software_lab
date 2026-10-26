const express = require('express');
const router = express.Router();
const { register, registerDoctor, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/doctor/register', registerDoctor);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
