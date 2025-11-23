const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * FeePoolTransaction - Tracks all fee pool movements for transparency
 */
const FeePoolTransaction = sequelize.define('FeePoolTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  poolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fee_pools',
      key: 'id'
    }
  },
  transactionType: {
    type: DataTypes.ENUM('collection', 'distribution', 'adjustment'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false
  },
  balanceBefore: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false
  },
  sourceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g., trade, staking, liquidity'
  },
  sourceId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Trade ID or other source identifier'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'fee_pool_transactions',
  indexes: [
    { fields: ['pool_id', 'created_at'] },
    { fields: ['source_type', 'source_id'] },
    { fields: ['transaction_type'] }
  ]
});

module.exports = FeePoolTransaction;
