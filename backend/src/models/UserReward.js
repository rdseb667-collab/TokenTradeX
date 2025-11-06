const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserReward = sequelize.define('UserReward', {
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
  rewardType: {
    type: DataTypes.ENUM(
      'daily_login',
      'first_trade',
      'trading_volume',
      'referral_bonus',
      'community_contribution',
      'milestone'
    ),
    allowNull: false,
    field: 'reward_type'
  },
  amount: {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: false,
    defaultValue: 0
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  claimed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  claimedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'claimed_at'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  }
}, {
  tableName: 'user_rewards',
  timestamps: true,
  underscored: true
});

module.exports = UserReward;
