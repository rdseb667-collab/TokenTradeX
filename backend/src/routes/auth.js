const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, requireSuperAdmin, require2FA } = require('../middleware/auth');
const { validateRequest, registerSchema, loginSchema } = require('../middleware/validation');

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);

// SECURED: Super admin only + 2FA required for creating admin accounts
router.post('/create-admin', protect, requireSuperAdmin, require2FA, authController.createAdmin);

router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.put('/password', protect, authController.changePassword);

module.exports = router;
