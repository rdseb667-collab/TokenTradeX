const { sequelize } = require('../config/database');
const { AsyncJob } = require('../models');
const { Op, QueryTypes } = require('sequelize');
const logger = require('./logger');

/**
 * Durable Revenue Queue Service - Phase 2
 * 
 * Replaces in-memory queue with persistent AsyncJob table.
 * Uses row-level locking (SELECT FOR UPDATE SKIP LOCKED) for safe concurrency.
 * Records all revenue to RevenueEvent ledger for complete audit trail.
 */
class RevenueQueueService {
  constructor() {
    this.isProcessing = false;
    this.processingInterval = null;
    this.pollIntervalMs = parseInt(process.env.REVENUE_QUEUE_POLL_MS || '5000', 10);
    this.batchSize = parseInt(process.env.REVENUE_QUEUE_BATCH || '10', 10);
  }

  /**
   * Enqueue a revenue collection job
   */
  async enqueue(type, payload, options = {}) {
    try {
      const job = await AsyncJob.create({
        type,
        payload,
        maxAttempts: options.maxAttempts || 3,
        scheduledFor: options.scheduledFor || new Date()
      });

      logger.info(`✅ Job enqueued: ${type}`, { jobId: job.id, payload });
      return job.id;
    } catch (error) {
      logger.error(`❌ Failed to enqueue job: ${type}`, {
        error: error.message,
        payload
      });
      throw error;
    }
  }

  /**
   * Start background worker
   */
  async startWorker() {
    if (this.isProcessing) {
      logger.warn('Revenue queue worker already running');
      return;
    }

    this.isProcessing = true;
    logger.info(`🚀 Starting revenue queue worker (poll: ${this.pollIntervalMs}ms, batch: ${this.batchSize})`);

    this.processingInterval = setInterval(() => {
      this.processBatch().catch(err => {
        logger.error('Revenue queue processing error', { error: err.message });
      });
    }, this.pollIntervalMs);
  }

  /**
   * Stop background worker
   */
  async stopWorker() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    logger.info('🛑 Revenue queue worker stopped');
  }

  /**
   * Process a batch of jobs using SELECT FOR UPDATE SKIP LOCKED
   */
  async processBatch() {
    const transaction = await sequelize.transaction();

    try {
      // Claim pending jobs with row lock
      const jobs = await sequelize.query(
        `
        SELECT * FROM async_jobs
        WHERE status = 'pending'
          AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
        LIMIT :limit
        FOR UPDATE SKIP LOCKED
        `,
        {
          replacements: { limit: this.batchSize },
          type: QueryTypes.SELECT,
          transaction,
          lock: transaction.LOCK.UPDATE
        }
      );

      if (jobs.length === 0) {
        await transaction.commit();
        return;
      }

      logger.info(`📦 Processing ${jobs.length} jobs from queue`);

      // Mark jobs as processing
      await AsyncJob.update(
        { status: 'processing' },
        {
          where: { id: { [Op.in]: jobs.map(j => j.id) } },
          transaction
        }
      );

      await transaction.commit();

      // Process each job (outside transaction for isolation)
      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (error) {
      await transaction.rollback();
      logger.error('❌ Failed to claim jobs', { error: error.message });
    }
  }

  /**
   * Process a single job
   */
  async processJob(job) {
    try {
      logger.info(`Processing job: ${job.type}`, { jobId: job.id, payload: job.payload });

      // Route to appropriate handler
      switch (job.type) {
        case 'revenue_collection':
          await this.handleRevenueCollection(job);
          break;
        case 'reward_distribution':
          await this.handleRewardDistribution(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark as completed
      await AsyncJob.update(
        {
          status: 'completed',
          processedAt: new Date()
        },
        { where: { id: job.id } }
      );

      logger.info(`✅ Job completed: ${job.type}`, { jobId: job.id });
    } catch (error) {
      logger.error(`❌ Job failed: ${job.type}`, {
        jobId: job.id,
        error: error.message,
        stack: error.stack
      });

      // Retry or fail
      const attempts = job.attempts + 1;
      const maxAttempts = job.max_attempts || 3;

      if (attempts < maxAttempts) {
        // Retry with exponential backoff
        const backoffMs = Math.min(1000 * Math.pow(2, attempts), 60000);
        const scheduledFor = new Date(Date.now() + backoffMs);

        await AsyncJob.update(
          {
            status: 'pending',
            attempts,
            error: error.message,
            scheduledFor
          },
          { where: { id: job.id } }
        );

        logger.info(`🔄 Job retry scheduled (${attempts}/${maxAttempts})`, {
          jobId: job.id,
          backoffMs,
          scheduledFor
        });
      } else {
        // Max retries reached - mark as failed
        await AsyncJob.update(
          {
            status: 'failed',
            attempts,
            error: error.message,
            processedAt: new Date()
          },
          { where: { id: job.id } }
        );

        logger.error(`💀 Job failed permanently (max retries)`, {
          jobId: job.id,
          attempts,
          error: error.message
        });
      }
    }
  }

  /**
   * Handle revenue collection job
   */
  async handleRevenueCollection(job) {
    const { streamId, amount, description, tradeId } = job.payload;
    
    const revenueCollector = require('../helpers/revenueCollector');
    await revenueCollector.collectRevenue(streamId, amount, description, tradeId);
  }

  /**
   * Handle reward distribution job
   */
  async handleRewardDistribution(job) {
    const { userId, amount, type } = job.payload;
    
    const rewardService = require('./rewardService');
    const tradingMiningService = require('./tradingMiningService');
    
    if (type === 'trading_volume') {
      await rewardService.giveTradingVolumeReward(userId, amount);
    } else if (type === 'trading_mining') {
      await tradingMiningService.awardReward(userId, amount, job.payload.orderId);
    } else if (type === 'milestone') {
      await rewardService.checkAndGiveMilestoneRewards(userId);
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [pending, processing, completed, failed] = await Promise.all([
      AsyncJob.count({ where: { status: 'pending' } }),
      AsyncJob.count({ where: { status: 'processing' } }),
      AsyncJob.count({ where: { status: 'completed' } }),
      AsyncJob.count({ where: { status: 'failed' } })
    ]);

    return {
      pending,
      processing,
      completed,
      failed,
      total: pending + processing + completed + failed,
      workerRunning: this.isProcessing
    };
  }

  /**
   * Clear completed jobs older than N days
   */
  async cleanup(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await AsyncJob.destroy({
      where: {
        status: 'completed',
        processedAt: { [Op.lt]: cutoffDate }
      }
    });

    logger.info(`🧹 Cleaned up ${deleted} completed jobs older than ${daysToKeep} days`);
    return deleted;
  }
}

module.exports = new RevenueQueueService();
