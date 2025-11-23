const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RevenueLedger = sequelize.define('RevenueLedger', {
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  stream: {
    type: DataTypes.STRING(50),
    allowNull: false,
    primaryKey: true,
    comment: 'Revenue stream type'
  },
  period: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    primaryKey: true,
    comment: 'Aggregation period (daily)'
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'USD',
    allowNull: false,
    primaryKey: true
  },
  gross: {
    type: DataTypes.DECIMAL(38, 18),
    defaultValue: 0,
    allowNull: false,
    comment: 'Gross revenue before platform split'
  },
  net: {
    type: DataTypes.DECIMAL(38, 18),
    defaultValue: 0,
    allowNull: false,
    comment: 'Net revenue after platform split'
  },
  lastEventId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Last processed event ID for idempotency'
  }
}, {
  tableName: 'revenue_ledger',
  timestamps: true,
  indexes: [
    { fields: ['user_id', 'stream'] },
    { fields: ['period'] },
    { fields: ['stream'] }
  ]
});

module.exports = RevenueLedger;
