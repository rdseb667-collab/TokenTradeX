const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FeeExemptAllowlist = sequelize.define('FeeExemptAllowlist', {
  userId: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for fee exemption (e.g., partnership, promotion)'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Exemption expiry date'
  }
}, {
  tableName: 'fee_exempt_allowlist',
  timestamps: true,
  indexes: [
    { fields: ['expires_at'] },
    { fields: ['user_id', 'expires_at'] }
  ]
});

module.exports = FeeExemptAllowlist;
