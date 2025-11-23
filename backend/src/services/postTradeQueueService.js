const PostTradeJob = require('../models/PostTradeJob');
const { Op } = require('sequelize');
const logger = require('./logger');

/**
 * PostTradeQueueService - Manages post-trade job queue
 * Ensures fee distributions, rewards, and referral updates are persisted
 */
class PostTradeQueueService {
  /**
   * Enqueue a post-trade job
   * @param {string} type - Job type (fee_distribution, reward_distribution, referral_update)
   * @param {object} payload - Job data
   * @param {object} options - Additional options (maxAttempts, scheduledFor)
   */
  async enqueue(type, payload, options = {}) {
    try {
      const job = await PostTradeJob.create({
        tradeId: payload.tradeId,
        jobType: type,
        correlationId: payload.correlationId || `trade-${payload.tradeId}-${Date.now()}`,
        payload,
        status: 'pending',
        attempts: 0,
        maxAttempts: options.maxAttempts || 3,
        scheduledFor: options.scheduledFor || new Date()
      });

      logger.info(`✅ Post-trade job enqueued: ${type}`, {
        jobId: job.id,
        tradeId: payload.tradeId,
        correlationId: job.correlationId
      });

      return job.id;
    } catch (error) {
      logger.error(`❌ Failed to enqueue post-trade job: ${type}`, {
        error: error.message,
        payload
      });
      throw error;
    }
  }

  /**
   * Replay stalled jobs on startup
   * Finds jobs stuck in 'processing' state and resets them to 'pending'
   */
  async replayStalled() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 300000); // 5 minutes

      const stalledJobs = await PostTradeJob.findAll({
        where: {
          status: 'processing',
          updatedAt: { [Op.lt]: fiveMinutesAgo }
        }
      });

      if (stalledJobs.length === 0) {
        logger.info('🔄 No stalled jobs to replay');
        return 0;
      }

      // Reset stalled jobs to pending
      for (const job of stalledJobs) {
        await job.update({
          status: 'pending',
          attempts: job.attempts // Keep attempt count for tracking
        });
      }

      logger.warn(`🔄 Replayed ${stalledJobs.length} stalled jobs`, {
        jobIds: stalledJobs.map(j => j.id)
      });

      return stalledJobs.length;
    } catch (error) {
      logger.error('❌ Failed to replay stalled jobs', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    try {
      const [pending, processing, completed, failed, deadLetter] = await Promise.all([
        PostTradeJob.count({ where: { status: 'pending' } }),
        PostTradeJob.count({ where: { status: 'processing' } }),
        PostTradeJob.count({ where: { status: 'completed' } }),
        PostTradeJob.count({ where: { status: 'failed' } }),
        PostTradeJob.count({ where: { status: 'dead_letter' } })
      ]);

      return {
        pending,
        processing,
        completed,
        failed,
        deadLetter,
        total: pending + processing + completed + failed + deadLetter,
        health: deadLetter > 10 ? 'critical' : failed > 50 ? 'warning' : 'healthy'
      };
    } catch (error) {
      logger.error('Failed to get queue stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean up old completed jobs
   */
  async cleanup(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleted = await PostTradeJob.destroy({
        where: {
          status: 'completed',
          processedAt: { [Op.lt]: cutoffDate }
        }
      });

      logger.info(`🧹 Cleaned up ${deleted} completed jobs older than ${daysToKeep} days`);
      return deleted;
    } catch (error) {
      logger.error('Failed to clean up jobs', { error: error.message });
      throw error;
    }
  }
}

module.exports = new PostTradeQueueService();
