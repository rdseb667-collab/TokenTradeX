const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserReward = sequelize.define('UserReward', {
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
  rewardType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'daily_login, trading_volume, milestone, referral, etc.'
  },
  amount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  claimed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  claimedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional context (tradeId, volume, tier, etc.)'
  }
}, {
  tableName: 'user_rewards',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['reward_type'] },
    { fields: ['claimed'] },
    { fields: ['created_at'] }
  ]
});

module.exports = UserReward;
