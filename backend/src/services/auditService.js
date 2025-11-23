const { AuditLog } = require('../models');
const logger = require('./logger');

/**
 * Audit Service - Immutable logging for privileged actions
 */
class AuditService {
  /**
   * Log a privileged action
   */
  async logAction({
    userId,
    action,
    resourceType = null,
    resourceId = null,
    changes = null,
    metadata = {},
    ipAddress = null,
    userAgent = null,
    status = 'success',
    errorMessage = null
  }) {
    try {
      const auditEntry = await AuditLog.create({
        userId,
        action,
        resourceType,
        resourceId,
        changes,
        metadata,
        ipAddress,
        userAgent,
        status,
        errorMessage
      });

      logger.info('Audit log created', {
        auditId: auditEntry.id,
        action,
        userId,
        status
      });

      return auditEntry;
    } catch (error) {
      // CRITICAL: If audit logging fails, log to system but don't block the operation
      logger.error('CRITICAL: Failed to create audit log', {
        action,
        userId,
        error: error.message
      });
      // In production, you might want to alert on this
    }
  }

  /**
   * Convenience method for logging - maps details to metadata
   */
  async log({
    userId,
    action,
    resourceType = null,
    resourceId = null,
    details = {},
    ipAddress = null,
    userAgent = null,
    status = 'success',
    errorMessage = null
  }) {
    return this.logAction({
      userId,
      action,
      resourceType,
      resourceId,
      metadata: details,
      ipAddress,
      userAgent,
      status,
      errorMessage
    });
  }

  /**
   * Log admin account creation
   */
  async logAdminCreation(adminUser, newAdminEmail, req) {
    return this.logAction({
      userId: adminUser.id,
      action: 'CREATE_ADMIN',
      resourceType: 'User',
      resourceId: newAdminEmail,
      metadata: {
        createdBy: adminUser.email,
        createdByRole: adminUser.role,
        targetEmail: newAdminEmail
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });
  }

  /**
   * Log failed admin creation attempt
   */
  async logFailedAdminCreation(userId, reason, req) {
    return this.logAction({
      userId,
      action: 'CREATE_ADMIN',
      resourceType: 'User',
      metadata: {
        reason
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'failed',
      errorMessage: reason
    });
  }

  /**
   * Log role change
   */
  async logRoleChange(adminUser, targetUserId, oldRole, newRole, req) {
    return this.logAction({
      userId: adminUser.id,
      action: 'UPDATE_ROLE',
      resourceType: 'User',
      resourceId: targetUserId,
      changes: { oldRole, newRole },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  }

  /**
   * Log account status change
   */
  async logStatusChange(adminUser, targetUserId, oldStatus, newStatus, req) {
    return this.logAction({
      userId: adminUser.id,
      action: 'UPDATE_STATUS',
      resourceType: 'User',
      resourceId: targetUserId,
      changes: { oldStatus, newStatus },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  }

  /**
   * Log 2FA enforcement action
   */
  async log2FACheck(userId, action, success, req) {
    return this.logAction({
      userId,
      action: `2FA_${action}`,
      status: success ? 'success' : 'blocked',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      errorMessage: success ? null : '2FA verification required but not provided or invalid'
    });
  }

  /**
   * Log automation config change
   */
  async logAutomationChange(adminUser, scheduleId, changes, req) {
    return this.logAction({
      userId: adminUser.id,
      action: 'UPDATE_AUTOMATION',
      resourceType: 'AutomationSchedule',
      resourceId: scheduleId,
      changes,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  }

  /**
   * Get audit logs (for admin review)
   */
  async getAuditLogs({ limit = 100, offset = 0, userId = null, action = null, startDate = null, endDate = null }) {
    const where = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = startDate;
      if (endDate) where.createdAt[Op.lte] = endDate;
    }

    const logs = await AuditLog.findAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: require('../models').User,
          as: 'user',
          attributes: ['id', 'email', 'role']
        }
      ]
    });

    return logs;
  }
}

module.exports = new AuditService();
