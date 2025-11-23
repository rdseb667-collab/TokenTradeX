const jwt = require('jsonwebtoken');
const { User } = require('../models');
const twoFactorService = require('../services/twoFactorService');
const auditService = require('../services/auditService');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // HARDENED: Fail hard if JWT_SECRET is missing in production
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('CRITICAL: JWT_SECRET not configured');
      }
      console.warn('WARNING: Using fallback JWT secret in development');
    }

    const decoded = jwt.verify(token, secret || 'dev_secret');
    req.user = await User.findByPk(decoded.id);
    
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

/**
 * Middleware to enforce 2FA for privileged operations
 */
const require2FA = async (req, res, next) => {
  try {
    // Check if user has 2FA enabled
    if (!req.user.twoFactorEnabled) {
      await auditService.log2FACheck(req.user.id, 'REQUIRED', false, req);
      return res.status(403).json({
        success: false,
        message: '2FA must be enabled for this operation',
        requireSetup2FA: true
      });
    }

    // Get 2FA token from header
    const twoFactorToken = req.headers['x-2fa-token'];
    if (!twoFactorToken) {
      await auditService.log2FACheck(req.user.id, 'VERIFICATION', false, req);
      return res.status(403).json({
        success: false,
        message: '2FA token required in X-2FA-Token header'
      });
    }

    // Verify 2FA token
    const isValid = await twoFactorService.verifyToken(req.user.id, twoFactorToken);
    if (!isValid) {
      await auditService.log2FACheck(req.user.id, 'VERIFICATION_FAILED', false, req);
      return res.status(403).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }

    await auditService.log2FACheck(req.user.id, 'VERIFICATION', true, req);
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '2FA verification error'
    });
  }
};

/**
 * Middleware to restrict access to super admin only
 */
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    auditService.logAction({
      userId: req.user.id,
      action: 'UNAUTHORIZED_SUPER_ADMIN_ACCESS',
      status: 'blocked',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      errorMessage: `User ${req.user.email} (${req.user.role}) attempted super admin action`
    });
    return res.status(403).json({
      success: false,
      message: 'Only super administrator can perform this action'
    });
  }
  next();
};

/**
 * Middleware to restrict access to admin or super_admin
 */
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access required'
    });
  }
  next();
};

module.exports = { protect, authorize, require2FA, requireSuperAdmin, adminOnly };
