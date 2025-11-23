const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const ApiKey = sequelize.define('ApiKey', {
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
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Friendly name for the API key'
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'The actual API key (hashed in production)'
  },
  secret: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'API secret for signing requests'
  },
  tier: {
    type: DataTypes.ENUM('starter', 'professional', 'enterprise', 'white_label'),
    defaultValue: 'starter',
    comment: 'API tier determines rate limits and features'
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'revoked'),
    defaultValue: 'active'
  },
  // Usage tracking
  requestsToday: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  requestsThisMonth: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalRequests: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Revenue tracking
  revenueGenerated: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Total revenue generated through this API key'
  },
  monthlyFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Monthly subscription fee for this tier'
  },
  // Rate limits (per tier)
  rateLimitPerMinute: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
    comment: 'Requests per minute allowed'
  },
  rateLimitPerDay: {
    type: DataTypes.INTEGER,
    defaultValue: 10000,
    comment: 'Requests per day allowed'
  },
  // Permissions
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {
      read: true,
      trade: false,
      withdraw: false,
      admin: false
    }
  },
  // White label settings (for enterprise/white_label tier)
  whiteLabelSettings: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Custom branding, revenue share %, etc.'
  },
  // IP whitelist for security
  ipWhitelist: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    comment: 'Allowed IP addresses'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'API key expiration date (null = never)'
  }
}, {
  tableName: 'api_keys',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (apiKey) => {
      // Generate secure API key if not provided
      if (!apiKey.key) {
        apiKey.key = 'ttx_' + crypto.randomBytes(32).toString('hex');
      }
      // Generate secret
      if (!apiKey.secret) {
        apiKey.secret = crypto.randomBytes(32).toString('hex');
      }
      
      // Set rate limits based on tier
      const tierLimits = {
        starter: { perMinute: 60, perDay: 10000, monthlyFee: 99 },
        professional: { perMinute: 300, perDay: 100000, monthlyFee: 499 },
        enterprise: { perMinute: 1000, perDay: 1000000, monthlyFee: 2499 },
        white_label: { perMinute: 5000, perDay: 10000000, monthlyFee: 9999 }
      };
      
      const limits = tierLimits[apiKey.tier] || tierLimits.starter;
      apiKey.rateLimitPerMinute = limits.perMinute;
      apiKey.rateLimitPerDay = limits.perDay;
      apiKey.monthlyFee = limits.monthlyFee;
    }
  }
});

module.exports = ApiKey;
