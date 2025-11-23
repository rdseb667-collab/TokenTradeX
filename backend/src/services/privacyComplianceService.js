const { sequelize } = require('../config/database');
const { 
  User, 
  PrivacyConsent, 
  DataDeletionRequest, 
  DataAccessLog,
  Wallet,
  Order,
  Trade,
  Transaction,
  StakingPosition
} = require('../models');
const { Op } = require('sequelize');
const logger = require('./logger');
const crypto = require('crypto');

/**
 * Privacy Compliance Service
 * GDPR/CCPA implementation for TokenTradeX
 * 
 * Key Features:
 * - User consent management (Article 7)
 * - Right to access (Article 15)
 * - Right to be forgotten (Article 17)
 * - Data portability (Article 20)
 * - Audit logging (Article 30)
 */
class PrivacyComplianceService {
  constructor() {
    this.CURRENT_PRIVACY_VERSION = '1.0';
    this.CURRENT_TERMS_VERSION = '1.0';
    this.DATA_RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS || '2555'); // 7 years default
    this.DELETION_GRACE_PERIOD_DAYS = 30; // 30-day grace before permanent deletion
  }

  /**
   * Record user consent (GDPR Article 7)
   * Must be freely given, specific, informed, and unambiguous
   */
  async recordConsent(userId, consentData, ipAddress, userAgent) {
    const transaction = await sequelize.transaction();

    try {
      const {
        privacyPolicy = true,
        termsOfService = true,
        marketingEmails = false,
        dataProcessing = true,
        cookiePolicy = true,
        thirdPartySharing = false
      } = consentData;

      const consents = [];

      // Record each consent type separately
      const consentTypes = [
        { type: 'privacy_policy', given: privacyPolicy, version: this.CURRENT_PRIVACY_VERSION },
        { type: 'terms_of_service', given: termsOfService, version: this.CURRENT_TERMS_VERSION },
        { type: 'marketing_emails', given: marketingEmails, version: this.CURRENT_PRIVACY_VERSION },
        { type: 'data_processing', given: dataProcessing, version: this.CURRENT_PRIVACY_VERSION },
        { type: 'cookie_policy', given: cookiePolicy, version: this.CURRENT_PRIVACY_VERSION },
        { type: 'third_party_sharing', given: thirdPartySharing, version: this.CURRENT_PRIVACY_VERSION }
      ];

      for (const { type, given, version } of consentTypes) {
        const consent = await PrivacyConsent.create({
          userId,
          consentType: type,
          consentGiven: given,
          consentVersion: version,
          ipAddress,
          userAgent,
          consentMethod: 'explicit_accept'
        }, { transaction });

        consents.push(consent);
      }

      await transaction.commit();

      logger.info('User consent recorded', {
        userId,
        consents: consents.length,
        ipAddress
      });

      return { success: true, consents };

    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to record consent', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get user's current consents
   */
  async getUserConsents(userId) {
    try {
      const consents = await PrivacyConsent.findAll({
        where: {
          userId,
          revokedAt: null
        },
        order: [['createdAt', 'DESC']]
      });

      // Get most recent consent for each type
      const latestConsents = {};
      for (const consent of consents) {
        if (!latestConsents[consent.consentType] || 
            consent.createdAt > latestConsents[consent.consentType].createdAt) {
          latestConsents[consent.consentType] = consent;
        }
      }

      return Object.values(latestConsents);

    } catch (error) {
      logger.error('Failed to get user consents', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Revoke consent
   */
  async revokeConsent(userId, consentType) {
    try {
      const result = await PrivacyConsent.update({
        revokedAt: new Date(),
        consentGiven: false
      }, {
        where: {
          userId,
          consentType,
          revokedAt: null
        }
      });

      logger.info('Consent revoked', { userId, consentType });
      return { success: true, updated: result[0] };

    } catch (error) {
      logger.error('Failed to revoke consent', { error: error.message, userId, consentType });
      throw error;
    }
  }

  /**
   * Export user data (GDPR Article 15 - Right to Access)
   * Returns comprehensive data package
   */
  async exportUserData(userId) {
    try {
      logger.info('Exporting user data', { userId });

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password', 'twoFactorSecret'] }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Collect all user data
      const [
        wallets,
        orders,
        trades,
        transactions,
        stakingPositions,
        consents,
        deletionRequests,
        accessLogs
      ] = await Promise.all([
        Wallet.findAll({ where: { userId } }),
        Order.findAll({ where: { userId } }),
        Trade.findAll({
          where: {
            [Op.or]: [
              { buyerId: userId },
              { sellerId: userId }
            ]
          }
        }),
        Transaction.findAll({ where: { userId } }),
        StakingPosition.findAll({ where: { userId } }),
        PrivacyConsent.findAll({ where: { userId } }),
        DataDeletionRequest.findAll({ where: { userId } }),
        DataAccessLog.findAll({ where: { userId } })
      ]);

      const exportData = {
        exportDate: new Date(),
        exportVersion: '1.0',
        user: user.toJSON(),
        wallets: wallets.map(w => w.toJSON()),
        orders: orders.map(o => o.toJSON()),
        trades: trades.map(t => t.toJSON()),
        transactions: transactions.map(t => t.toJSON()),
        stakingPositions: stakingPositions.map(s => s.toJSON()),
        privacy: {
          consents: consents.map(c => c.toJSON()),
          deletionRequests: deletionRequests.map(d => d.toJSON()),
          accessLogs: accessLogs.map(a => a.toJSON())
        },
        summary: {
          totalWallets: wallets.length,
          totalOrders: orders.length,
          totalTrades: trades.length,
          totalTransactions: transactions.length,
          totalStakingPositions: stakingPositions.length,
          accountAge: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)),
          dataRetentionDays: this.DATA_RETENTION_DAYS
        }
      };

      logger.info('User data exported successfully', {
        userId,
        recordCount: exportData.summary.totalWallets + 
                     exportData.summary.totalOrders + 
                     exportData.summary.totalTrades + 
                     exportData.summary.totalTransactions
      });

      return exportData;

    } catch (error) {
      logger.error('Failed to export user data', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Request data deletion (GDPR Article 17 - Right to be Forgotten)
   * Creates a deletion request with grace period
   */
  async requestDataDeletion(userId, reason, requestedBy, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      // Check for existing pending deletion
      const existingRequest = await DataDeletionRequest.findOne({
        where: {
          userId,
          status: {
            [Op.in]: ['pending', 'processing']
          }
        }
      });

      if (existingRequest) {
        return {
          success: false,
          message: 'A deletion request is already pending for this user',
          existing: existingRequest
        };
      }

      // Schedule deletion for 30 days from now (grace period)
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + this.DELETION_GRACE_PERIOD_DAYS);

      const deletionRequest = await DataDeletionRequest.create({
        userId,
        requestType: 'full_deletion',
        status: 'pending',
        reason,
        requestedBy,
        ipAddress,
        scheduledFor
      }, { transaction });

      await transaction.commit();

      logger.warn('Data deletion requested', {
        userId,
        requestId: deletionRequest.id,
        scheduledFor,
        gracePeriodDays: this.DELETION_GRACE_PERIOD_DAYS
      });

      return {
        success: true,
        deletionRequest: deletionRequest.toJSON(),
        message: `Deletion scheduled for ${scheduledFor.toISOString()}. You have ${this.DELETION_GRACE_PERIOD_DAYS} days to cancel.`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to request data deletion', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Cancel pending deletion request
   */
  async cancelDataDeletion(requestId, userId) {
    try {
      const request = await DataDeletionRequest.findByPk(requestId);

      if (!request || request.userId !== userId) {
        throw new Error('Deletion request not found');
      }

      if (request.status !== 'pending') {
        throw new Error(`Cannot cancel request with status: ${request.status}`);
      }

      await request.update({
        status: 'cancelled',
        metadata: {
          ...request.metadata,
          cancelledAt: new Date(),
          cancelledBy: userId
        }
      });

      logger.info('Deletion request cancelled', { requestId, userId });

      return { success: true, message: 'Deletion cancelled successfully' };

    } catch (error) {
      logger.error('Failed to cancel deletion', { error: error.message, requestId });
      throw error;
    }
  }

  /**
   * Execute data deletion (called by scheduled job)
   * Permanently deletes user data while keeping financial records for compliance
   */
  async executeDataDeletion(requestId) {
    const transaction = await sequelize.transaction();

    try {
      const request = await DataDeletionRequest.findByPk(requestId);

      if (!request || request.status !== 'pending') {
        throw new Error('Invalid deletion request');
      }

      // Check if grace period has passed
      if (new Date() < new Date(request.scheduledFor)) {
        throw new Error('Grace period has not elapsed');
      }

      await request.update({ status: 'processing' }, { transaction });

      const userId = request.userId;
      const deletedData = {};

      // Anonymize user profile (KEEP for audit, but remove PII)
      const user = await User.findByPk(userId);
      const anonymizedEmail = `deleted_${crypto.randomBytes(8).toString('hex')}@anonymized.local`;

      await user.update({
        email: anonymizedEmail,
        username: `deleted_${user.id.substring(0, 8)}`,
        firstName: '[DELETED]',
        lastName: '[DELETED]',
        ethereumAddress: null,
        isActive: false,
        kycStatus: 'deleted'
      }, { transaction });

      deletedData.user = { anonymized: true, originalId: userId };

      // Delete non-financial data
      deletedData.consents = await PrivacyConsent.destroy({ where: { userId }, transaction });
      deletedData.accessLogs = await DataAccessLog.destroy({ where: { userId }, transaction });

      // NOTE: DO NOT delete trades, transactions, or orders
      // These must be kept for 7 years per financial regulations (AML/CTF)
      logger.warn('Financial records retained per regulatory requirements', { userId });

      await request.update({
        status: 'completed',
        processedAt: new Date(),
        deletedData
      }, { transaction });

      await transaction.commit();

      logger.warn('User data deleted', {
        requestId,
        userId,
        deletedData
      });

      return { success: true, deletedData };

    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to execute data deletion', { error: error.message, requestId });

      // Mark as failed
      await DataDeletionRequest.update({
        status: 'failed',
        errorMessage: error.message
      }, {
        where: { id: requestId }
      });

      throw error;
    }
  }

  /**
   * Log data access for audit trail (GDPR Article 30)
   */
  async logDataAccess(params) {
    try {
      const {
        userId,
        accessedBy,
        accessType,
        resourceType,
        resourceId,
        purpose,
        ipAddress,
        userAgent,
        dataFields = []
      } = params;

      const log = await DataAccessLog.create({
        userId,
        accessedBy,
        accessType,
        resourceType,
        resourceId,
        purpose,
        ipAddress,
        userAgent,
        dataFields
      });

      return log;

    } catch (error) {
      logger.error('Failed to log data access', { error: error.message });
      // Don't throw - logging failure shouldn't block operations
      return null;
    }
  }

  /**
   * Get user's data access history
   */
  async getUserAccessHistory(userId, limit = 100) {
    try {
      const logs = await DataAccessLog.findAll({
        where: { userId },
        include: [{
          model: User,
          as: 'accessor',
          attributes: ['id', 'email', 'role']
        }],
        order: [['createdAt', 'DESC']],
        limit
      });

      return logs;

    } catch (error) {
      logger.error('Failed to get access history', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Process scheduled deletions (run daily via cron)
   */
  async processScheduledDeletions() {
    try {
      const now = new Date();
      const pendingDeletions = await DataDeletionRequest.findAll({
        where: {
          status: 'pending',
          scheduledFor: {
            [Op.lte]: now
          }
        }
      });

      logger.info(`Processing ${pendingDeletions.length} scheduled deletions`);

      const results = [];
      for (const request of pendingDeletions) {
        try {
          const result = await this.executeDataDeletion(request.id);
          results.push({ success: true, requestId: request.id, ...result });
        } catch (error) {
          results.push({ success: false, requestId: request.id, error: error.message });
        }
      }

      return results;

    } catch (error) {
      logger.error('Failed to process scheduled deletions', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if user has required consents
   */
  async checkRequiredConsents(userId) {
    try {
      const requiredTypes = ['privacy_policy', 'terms_of_service', 'data_processing'];
      const consents = await this.getUserConsents(userId);

      const consentMap = {};
      for (const consent of consents) {
        consentMap[consent.consentType] = consent.consentGiven;
      }

      const missing = requiredTypes.filter(type => !consentMap[type]);

      return {
        hasAllRequired: missing.length === 0,
        missing,
        consents: consentMap
      };

    } catch (error) {
      logger.error('Failed to check required consents', { error: error.message, userId });
      throw error;
    }
  }
}

module.exports = new PrivacyComplianceService();
