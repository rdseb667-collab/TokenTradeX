const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AsyncJob = sequelize.define('AsyncJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Job type: revenue_collection, reward_distribution, etc.'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending',
    allowNull: false
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Job data (tradeId, userId, amount, etc.)'
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  maxAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    allowNull: false
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Last error message'
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  scheduledFor: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    comment: 'When to process this job'
  }
}, {
  tableName: 'async_jobs',
  indexes: [
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['scheduled_for'] },
    { fields: ['status', 'scheduled_for'] }
  ]
});

module.exports = AsyncJob;
