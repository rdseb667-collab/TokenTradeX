const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, requireSuperAdmin, require2FA } = require('../middleware/auth');
const { validateRequest, registerSchema, loginSchema } = require('../middleware/validation');
const { authLimiter, profileLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting to auth endpoints
router.post('/register', authLimiter, validateRequest(registerSchema), authController.register);
router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);

// SECURED: Super admin only + 2FA required for creating admin accounts
router.post('/create-admin', protect, requireSuperAdmin, require2FA, authController.createAdmin);

router.get('/me', protect, authController.getMe);
router.put('/profile', protect, profileLimiter, authController.updateProfile);
router.put('/password', protect, authController.changePassword);

module.exports = router;
