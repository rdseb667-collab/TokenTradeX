const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Privacy Consent Model
 * Tracks user consent for GDPR/CCPA compliance
 */
const PrivacyConsent = sequelize.define('PrivacyConsent', {
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
  consentType: {
    type: DataTypes.ENUM(
      'privacy_policy',
      'terms_of_service',
      'marketing_emails',
      'data_processing',
      'cookie_policy',
      'third_party_sharing'
    ),
    allowNull: false
  },
  consentGiven: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  consentVersion: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Version of policy user consented to (e.g., "1.0", "2.1")'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address when consent was given'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Browser user agent when consent was given'
  },
  consentMethod: {
    type: DataTypes.ENUM('signup', 'explicit_accept', 'settings_change', 'api'),
    allowNull: false,
    defaultValue: 'explicit_accept'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When consent expires and needs renewal (optional)'
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When user revoked consent'
  }
}, {
  tableName: 'privacy_consents',
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['consent_type'] },
    { fields: ['user_id', 'consent_type'] },
    { fields: ['consent_given'] },
    { fields: ['expires_at'] }
  ]
});

module.exports = PrivacyConsent;
