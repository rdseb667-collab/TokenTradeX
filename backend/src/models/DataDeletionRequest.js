const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Data Deletion Request Model
 * GDPR/CCPA "Right to be Forgotten" compliance
 */
const DataDeletionRequest = sequelize.define('DataDeletionRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  requestType: {
    type: DataTypes.ENUM('full_deletion', 'data_export', 'partial_deletion'),
    allowNull: false,
    defaultValue: 'full_deletion'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User-provided reason for deletion'
  },
  requestedBy: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Email or ID of requester (user or admin)'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When deletion will be executed (30-day grace period)'
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  processedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Admin who processed the request'
  },
  deletedData: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Summary of what data was deleted'
  },
  exportUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Signed URL for data export download'
  },
  exportExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When export download link expires'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'data_deletion_requests',
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['request_type'] },
    { fields: ['scheduled_for'] },
    { fields: ['created_at'] }
  ]
});

module.exports = DataDeletionRequest;
