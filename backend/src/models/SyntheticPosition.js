const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SyntheticPosition = sequelize.define('SyntheticPosition', {
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
    comment: 'User-defined basket name (e.g., "Tech Giants", "Dividend Kings")'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  composition: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of {tokenId, percentage} representing the basket'
  },
  totalValue: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0,
    comment: 'Current total value of the basket in USD'
  },
  stakingEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this basket is staked'
  },
  stakingApy: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'APY if staked'
  },
  autoRebalance: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Auto-rebalance to maintain target percentages'
  },
  rebalanceFrequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly'),
    defaultValue: 'monthly'
  },
  lastRebalance: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalReturns: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Total returns earned (dividends + appreciation)'
  },
  dividendsEarned: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Total dividends earned from all basket components'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'synthetic_positions',
  timestamps: true,
  underscored: true
});

module.exports = SyntheticPosition;
