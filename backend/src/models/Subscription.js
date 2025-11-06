const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subscription = sequelize.define('Subscription', {
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
  tier: {
    type: DataTypes.ENUM('free', 'pro', 'enterprise'),
    allowNull: false,
    defaultValue: 'free'
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'expired', 'trial'),
    allowNull: false,
    defaultValue: 'active'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'payment_method'
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'auto_renew'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  discountApplied: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'discount_applied'
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true
});

module.exports = Subscription;
