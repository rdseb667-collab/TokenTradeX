const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RevenueStream = sequelize.define('RevenueStream', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    comment: 'Stream ID (0-9 for the 10 revenue streams)'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  collected: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0,
    allowNull: false,
    comment: 'Total revenue collected in USD'
  },
  distributed: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0,
    allowNull: false,
    comment: 'Total distributed to holders in USD'
  },
  targetMonthly: {
    type: DataTypes.DECIMAL(20, 2),
    defaultValue: 0,
    allowNull: false,
    comment: 'Monthly revenue target in USD'
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'USD',
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'revenue_streams',
  indexes: [
    { fields: ['is_active'] }
  ]
});

module.exports = RevenueStream;
