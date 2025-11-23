const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { protect } = require('../middleware/auth');
const { User, AuditLog } = require('../models');

/**
 * POST /api/2fa/setup
 * Generate 2FA secret and QR code
 */
router.post('/setup', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `TokenTradeX (${user.email})`,
      issuer: 'TokenTradeX'
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Save secret temporarily (will be confirmed on verification)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Audit log
    await AuditLog.create({
      userId: user.id,
      action: '2FA_SETUP_INITIATED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { email: user.email }
    });

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode,
        manualEntry: secret.otpauth_url
      }
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup 2FA'
    });
  }
});

/**
 * POST /api/2fa/verify
 * Verify 2FA token and enable 2FA
 */
router.post('/verify', protect, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA setup not initiated'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps before/after
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    // Audit log
    await AuditLog.create({
      userId: user.id,
      action: '2FA_ENABLED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { email: user.email }
    });

    res.json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify 2FA'
    });
  }
});

/**
 * POST /api/2fa/disable
 * Disable 2FA (requires current token)
 */
router.post('/disable', protect, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled'
      });
    }

    // Verify current token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    // Audit log
    await AuditLog.create({
      userId: user.id,
      action: '2FA_DISABLED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { email: user.email }
    });

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA'
    });
  }
});

/**
 * GET /api/2fa/status
 * Check 2FA status
 */
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    res.json({
      success: true,
      data: {
        enabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get 2FA status'
    });
  }
});

module.exports = router;
