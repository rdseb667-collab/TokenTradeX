const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RevenueEvent = sequelize.define('RevenueEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  streamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'revenue_streams',
      key: 'id'
    },
    comment: 'Which revenue stream (0-9)'
  },
  sourceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'trade, withdrawal, subscription, etc.'
  },
  sourceId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Trade ID, withdrawal ID, etc.'
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'USD',
    allowNull: false
  },
  grossAmount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    comment: 'Total revenue before splits'
  },
  netAmount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    comment: 'Net after platform/holder split'
  },
  holderShare: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    comment: '15% to holders'
  },
  reserveShare: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    comment: '85% to reserve'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional context (userId, tokenSymbol, etc.)'
  }
}, {
  tableName: 'revenue_events',
  indexes: [
    { fields: ['stream_id'] },
    { fields: ['source_type'] },
    { fields: ['source_type', 'source_id'], unique: true, name: 'revenue_events_source_unique' },
    { fields: ['created_at'] }
  ]
});

module.exports = RevenueEvent;
