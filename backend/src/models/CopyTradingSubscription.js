const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CopyTradingSubscription = sequelize.define('CopyTradingSubscription', {
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
  providerId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  providerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  autoCopy: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'cancelled'),
    defaultValue: 'active'
  },
  totalProfit: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Total profit made from copying this provider'
  },
  totalFeesPaid: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: '15% performance fees paid'
  },
  copiedOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'copy_trading_subscriptions',
  timestamps: true,
  underscored: true
});

module.exports = CopyTradingSubscription;
