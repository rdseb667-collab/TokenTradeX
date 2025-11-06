const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
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
  type: {
    type: DataTypes.ENUM('deposit', 'withdrawal', 'trade', 'fee', 'transfer'),
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
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  txHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'transactions',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['token_id'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

module.exports = Transaction;
