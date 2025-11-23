const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Data Access Log Model
 * Audit trail for sensitive data access (GDPR Article 30)
 */
const DataAccessLog = sequelize.define('DataAccessLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User whose data was accessed (null for bulk operations)'
  },
  accessedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Admin/system user who accessed the data'
  },
  accessType: {
    type: DataTypes.ENUM(
      'view', 'export', 'modify', 'delete', 
      'kyc_review', 'admin_lookup', 'support_ticket',
      'automated_processing'
    ),
    allowNull: false
  },
  resourceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g., "user_profile", "transaction_history", "kyc_documents"'
  },
  resourceId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Legal basis for access (e.g., "KYC verification", "Support request #123")'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dataFields: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    comment: 'Specific fields accessed (e.g., ["email", "ssn", "address"])'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'data_access_logs',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['accessed_by'] },
    { fields: ['access_type'] },
    { fields: ['created_at'] }
  ]
});

module.exports = DataAccessLog;
