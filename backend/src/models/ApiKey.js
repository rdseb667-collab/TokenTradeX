const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const ApiKey = sequelize.define('ApiKey', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  secret: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tier: {
    type: DataTypes.ENUM('free', 'standard', 'professional', 'enterprise'),
    allowNull: false,
    defaultValue: 'free'
  },
  status: {
    type: DataTypes.ENUM('active', 'disabled', 'revoked'),
    allowNull: false,
    defaultValue: 'active'
  },
  requestsUsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'requests_used'
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    field: 'last_used_at'
  },
  expiresAt: {
    type: DataTypes.DATE,
    field: 'expires_at'
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {
      read: true,
      trade: false,
      withdraw: false
    }
  }
}, {
  tableName: 'api_keys',
  timestamps: true,
  underscored: true
});

// Generate API key and secret
ApiKey.generateKey = function() {
  return {
    key: 'ttx_' + crypto.randomBytes(16).toString('hex'),
    secret: crypto.randomBytes(32).toString('hex')
  };
};

module.exports = ApiKey;
