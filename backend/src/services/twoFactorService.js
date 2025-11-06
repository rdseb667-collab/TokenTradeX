const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User } = require('../models');
const logger = require('./logger');

/**
 * Two-Factor Authentication Service
 * Handles Google Authenticator integration
 */
class TwoFactorService {
  /**
   * Generate 2FA secret for user
   */
  async generateSecret(userId, email) {
    try {
      const secret = speakeasy.generateSecret({
        name: `TokenTradeX (${email})`,
        issuer: 'TokenTradeX'
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      logger.info('2FA secret generated', { userId });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        otpauth_url: secret.otpauth_url
      };
    } catch (error) {
      logger.error('Failed to generate 2FA secret', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Enable 2FA for user
   */
  async enable2FA(userId, secret, token) {
    try {
      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time windows for clock skew
      });

      if (!verified) {
        throw new Error('Invalid 2FA token');
      }

      // Update user record
      await User.update(
        {
          twoFactorEnabled: true,
          twoFactorSecret: secret
        },
        { where: { id: userId } }
      );

      logger.logSecurity({ action: '2FA_ENABLED', userId });

      return true;
    } catch (error) {
      logger.error('Failed to enable 2FA', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId, token) {
    try {
      const user = await User.findByPk(userId);

      if (!user || !user.twoFactorEnabled) {
        throw new Error('2FA not enabled');
      }

      // Verify token before disabling
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        throw new Error('Invalid 2FA token');
      }

      // Disable 2FA
      await User.update(
        {
          twoFactorEnabled: false,
          twoFactorSecret: null
        },
        { where: { id: userId } }
      );

      logger.logSecurity({ action: '2FA_DISABLED', userId });

      return true;
    } catch (error) {
      logger.error('Failed to disable 2FA', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Verify 2FA token
   */
  async verifyToken(userId, token) {
    try {
      const user = await User.findByPk(userId);

      if (!user || !user.twoFactorEnabled) {
        return false;
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        logger.logSecurity({ 
          action: '2FA_VERIFICATION_FAILED', 
          userId,
          ip: 'unknown' // Would be passed from request
        });
      }

      return verified;
    } catch (error) {
      logger.error('Failed to verify 2FA token', { userId, error: error.message });
      return false;
    }
  }

  /**
   * Generate backup codes for 2FA
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}

module.exports = new TwoFactorService();
