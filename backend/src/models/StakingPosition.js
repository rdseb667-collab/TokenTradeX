const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StakingPosition = sequelize.define('StakingPosition', {
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
  tokenId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tokens',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false,
    defaultValue: 0
  },
  lockPeriod: {
    type: DataTypes.ENUM('30', '90', '180', '365'),
    allowNull: false,
    comment: 'Lock period in days'
  },
  apy: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: 'Annual Percentage Yield (8%, 12%, 15%, 20%)'
  },
  stakedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  unlockAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'unlocked', 'withdrawn', 'emergency_withdrawn'),
    defaultValue: 'active'
  },
  rewardsAccumulated: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0,
    comment: 'Total rewards earned so far'
  },
  rewardsWithdrawn: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0,
    comment: 'Rewards already withdrawn'
  },
  autoCompound: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Auto-compound rewards into staking'
  },
  penaltyPaid: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0,
    comment: 'Early withdrawal penalty (redistributed to other stakers)'
  },
  lastRewardCalculation: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'staking_positions',
  timestamps: true,
  underscored: true
});

module.exports = StakingPosition;
