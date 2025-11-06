const jwt = require('jsonwebtoken');
const { User } = require('../models');
const referralService = require('../services/referralService');
const auditService = require('../services/auditService');

class AuthController {
  // Register new user (CANNOT create admin accounts)
  async register(req, res, next) {
    try {
      const { email, username, password, firstName, lastName, referralCode, role } = req.body;

      // BLOCK admin account creation through public registration
      if (role === 'admin' || role === 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Privileged accounts can only be created by the super administrator'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Generate unique referral code for new user
      const newReferralCode = referralService.generateReferralCode(email);

      // Create user (always as regular 'user' role)
      const user = await User.create({
        email,
        username,
        password,
        firstName,
        lastName,
        role: 'user', // Force regular user role
        referralCode: newReferralCode,
        referredBy: referralCode || null
      });

      // Reward new user and referrer if applicable
      const rewardResult = await referralService.rewardNewUser(user.id, referralCode);

      // Generate token - HARDENED: No fallback in production
      const secret = process.env.JWT_SECRET;
      if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET not configured');
      }
      const expiresIn = process.env.JWT_EXPIRE || '7d';
      const token = jwt.sign(
        { id: user.id, role: user.role },
        secret || 'dev_secret',
        { expiresIn }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          token,
          welcome: rewardResult
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Login user
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is inactive'
        });
      }

      // Update last login
      await user.update({ lastLogin: new Date() });

      // Generate token - HARDENED: No fallback in production
      const secret = process.env.JWT_SECRET;
      if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET not configured');
      }
      const expiresIn = process.env.JWT_EXPIRE || '7d';
      const token = jwt.sign(
        { id: user.id, role: user.role },
        secret || 'dev_secret',
        { expiresIn }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user,
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current user
  async getMe(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id);
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // Update profile
  async updateProfile(req, res, next) {
    try {
      const { firstName, lastName, username } = req.body;
      
      await req.user.update({
        firstName,
        lastName,
        username
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: req.user
      });
    } catch (error) {
      next(error);
    }
  }

  // Change password
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      const isMatch = await req.user.comparePassword(currentPassword);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      await req.user.update({ password: newPassword });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Create admin account (SUPER ADMIN ONLY)
  // REQUIRES: super_admin role + 2FA verification
  async createAdmin(req, res, next) {
    try {
      // SECURITY: Check if requester is super admin (role-based, not email)
      if (req.user.role !== 'super_admin') {
        await auditService.logFailedAdminCreation(
          req.user.id,
          `Unauthorized attempt by ${req.user.email} (role: ${req.user.role})`,
          req
        );
        return res.status(403).json({
          success: false,
          message: 'Only the super administrator can create admin accounts'
        });
      }

      const { email, username, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        await auditService.logFailedAdminCreation(
          req.user.id,
          `User ${email} already exists`,
          req
        );
        return res.status(400).json({
          success: false,
          message: 'User already exists'
        });
      }

      // Create admin user
      const admin = await User.create({
        email,
        username,
        password,
        firstName,
        lastName,
        role: 'admin',
        kycStatus: 'approved',
        isActive: true
      });

      // AUDIT: Log admin creation
      await auditService.logAdminCreation(req.user, email, req);

      res.status(201).json({
        success: true,
        message: 'Admin account created successfully',
        data: admin
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
