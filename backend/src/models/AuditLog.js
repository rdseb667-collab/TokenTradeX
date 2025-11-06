const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Action performed (e.g., CREATE_ADMIN, UPDATE_ROLE, DELETE_USER)'
  },
  resourceType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Type of resource affected (e.g., User, Token, Automation)'
  },
  resourceId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID of the affected resource'
  },
  changes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'JSON object showing before/after values'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional context (IP, user agent, etc.)'
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('success', 'failed', 'blocked'),
    defaultValue: 'success'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  underscored: true,
  timestamps: true,
  updatedAt: false, // Audit logs are immutable after creation
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action'] },
    { fields: ['created_at'] },
    { fields: ['status'] }
  ]
});

module.exports = AuditLog;
