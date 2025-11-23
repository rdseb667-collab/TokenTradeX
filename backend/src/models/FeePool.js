const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * FeePool - Tracks platform fee distribution pools
 * Handles the 40/30/20/10 split of platform fees (85% of total)
 */
const FeePool = sequelize.define('FeePool', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    comment: 'Pool ID: 0=Staking, 1=Liquidity, 2=Treasury, 3=Development'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  totalCollected: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Total fees collected in USD'
  },
  totalDistributed: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Total distributed/spent from pool in USD'
  },
  availableBalance: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0,
    allowNull: false,
    comment: 'Current available balance in USD'
  },
  allocationPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: 'Percentage of platform fees (e.g., 40.00 for 40%)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'fee_pools',
  indexes: [
    { fields: ['is_active'] },
    { fields: ['name'], unique: true }
  ]
});

module.exports = FeePool;
