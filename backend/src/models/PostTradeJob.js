const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * PostTradeJob - Dedicated model for post-trade async operations
 * Ensures fee distribution, rewards, and referral updates survive server restarts
 */
const PostTradeJob = sequelize.define('PostTradeJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tradeId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to the trade that triggered this job'
  },
  jobType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'fee_distribution, reward_distribution, referral_update'
  },
  correlationId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Unique identifier for tracking related jobs'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'dead_letter'),
    defaultValue: 'pending',
    allowNull: false
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Job data: buyerId, sellerId, amounts, etc.'
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
  tableName: 'post_trade_jobs',
  indexes: [
    { fields: ['status'] },
    { fields: ['scheduled_for'] },
    { fields: ['trade_id'] },
    { fields: ['status', 'scheduled_for'] },
    { fields: ['correlation_id'] },
    { fields: ['job_type'] }
  ]
});

module.exports = PostTradeJob;
