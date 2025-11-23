const { sequelize } = require('../config/database');
const PostTradeJob = require('../models/PostTradeJob');
const postTradeQueueService = require('./postTradeQueueService');
const revenueStreamService = require('./revenueStreamService');
const revenueCollector = require('../helpers/revenueCollector');
const feePoolService = require('./feePoolService');
const rewardService = require('./rewardService');
const tradingMiningService = require('./tradingMiningService');
const referralService = require('./referralService');
const { Op, QueryTypes } = require('sequelize');
const logger = require('./logger');

/**
 * PostTradeWorker - Background processor for post-trade jobs
 * Handles fee distribution, rewards, and referral updates with retry logic
 */
class PostTradeWorker {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.pollIntervalMs = parseInt(process.env.POST_TRADE_POLL_MS || '5000', 10);
    this.batchSize = parseInt(process.env.POST_TRADE_BATCH || '10', 10);
  }

  /**
   * Start the worker
   */
  async start() {
    if (this.isRunning) {
      logger.warn('⚠️ Post-trade worker already running');
      return;
    }

    logger.info('🚀 Starting post-trade worker...');

    // Replay stalled jobs from previous crash
    try {
      const replayedCount = await postTradeQueueService.replayStalled();
      if (replayedCount > 0) {
        logger.info(`🔄 Replayed ${replayedCount} stalled jobs`);
      }
    } catch (error) {
      logger.error('❌ Failed to replay stalled jobs', { error: error.message });
    }

    // Start polling for jobs
    this.isRunning = true;
    this.interval = setInterval(() => {
      this.processBatch().catch(err => {
        logger.error('❌ Post-trade worker batch processing error', {
          error: err.message,
          stack: err.stack
        });
      });
    }, this.pollIntervalMs);

    logger.info(`✅ Post-trade worker started (poll: ${this.pollIntervalMs}ms, batch: ${this.batchSize})`);
  }

  /**
   * Stop the worker gracefully
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping post-trade worker...');

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
    logger.info('✅ Post-trade worker stopped');
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
        SELECT * FROM post_trade_jobs
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

      // Mark jobs as processing
      await PostTradeJob.update(
        { status: 'processing' },
        {
          where: { id: { [Op.in]: jobs.map(j => j.id) } },
          transaction
        }
      );

      await transaction.commit();

      logger.info(`📦 Processing ${jobs.length} post-trade jobs`);

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
  async processJob(jobData) {
    // Reload job to get Sequelize instance
    const job = await PostTradeJob.findByPk(jobData.id);
    if (!job) {
      logger.error('❌ Job not found', { jobId: jobData.id });
      return;
    }

    const { payload } = job;

    try {
      logger.info(`⚙️ Processing job: ${job.jobType}`, {
        jobId: job.id,
        tradeId: payload.tradeId,
        correlationId: job.correlationId
      });

      // Execute fee distribution: 15% to holders via unified collector, 85% to platform pools
      if (payload.holderShare) {
        await revenueCollector.collectRevenue(
          0,
          payload.holderShare,
          `Trading fees - Trade #${payload.tradeId}`,
          job.correlationId
        );
        logger.info('✅ Holder share collected via unified collector', {
          jobId: job.id,
          holderShare: payload.holderShare.toFixed(4),
          correlationId: job.correlationId
        });
      }

      if (payload.platformShare) {
        await feePoolService.distributeFees(
          payload.platformShare,
          job.correlationId
        );
        logger.info('✅ Platform share distributed to pools', {
          jobId: job.id,
          amount: payload.platformShare
        });
      }

      // Execute reward distribution
      if (payload.buyerId && payload.totalValue) {
        await rewardService.giveTradingVolumeReward(
          payload.buyerId,
          payload.totalValue,
          {
            tradeId: payload.tradeId,
            orderId: payload.buyOrderId,
            correlationId: job.correlationId
          }
        );

        await tradingMiningService.awardReward(
          payload.buyerId,
          payload.totalValue,
          payload.buyOrderId
        );

        await rewardService.checkAndGiveMilestoneRewards(
          payload.buyerId,
          { tradeId: payload.tradeId, correlationId: job.correlationId }
        );

        logger.info('✅ Buyer rewards distributed', {
          jobId: job.id,
          buyerId: payload.buyerId
        });
      }

      if (payload.sellerId && payload.totalValue) {
        await rewardService.giveTradingVolumeReward(
          payload.sellerId,
          payload.totalValue,
          {
            tradeId: payload.tradeId,
            orderId: payload.sellOrderId,
            correlationId: job.correlationId
          }
        );

        await tradingMiningService.awardReward(
          payload.sellerId,
          payload.totalValue,
          payload.sellOrderId
        );

        await rewardService.checkAndGiveMilestoneRewards(
          payload.sellerId,
          { tradeId: payload.tradeId, correlationId: job.correlationId }
        );

        logger.info('✅ Seller rewards distributed', {
          jobId: job.id,
          sellerId: payload.sellerId
        });
      }

      // Update referral milestones
      if (payload.buyerId) {
        await referralService.checkTradingMilestones(payload.buyerId, payload.totalValue);
      }
      if (payload.sellerId) {
        await referralService.checkTradingMilestones(payload.sellerId, payload.totalValue);
      }

      // Mark job as completed
      await job.update({
        status: 'completed',
        processedAt: new Date()
      });

      logger.info(`✅ Job completed: ${job.jobType}`, {
        jobId: job.id,
        tradeId: payload.tradeId
      });
    } catch (error) {
      await this.handleJobError(job, error);
    }
  }

  /**
   * Handle job error with retry logic
   */
  async handleJobError(job, error) {
    const attempts = job.attempts + 1;
    const maxAttempts = job.maxAttempts || 3;

    logger.error(`❌ Job failed: ${job.jobType}`, {
      jobId: job.id,
      tradeId: job.payload.tradeId,
      attempts,
      maxAttempts,
      error: error.message,
      stack: error.stack
    });

    if (attempts < maxAttempts) {
      // Retry with exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, attempts), 60000);
      const scheduledFor = new Date(Date.now() + backoffMs);

      await job.update({
        status: 'pending',
        attempts,
        error: error.message,
        scheduledFor
      });

      logger.info(`🔄 Job retry scheduled (${attempts}/${maxAttempts})`, {
        jobId: job.id,
        backoffMs,
        scheduledFor
      });
    } else {
      // Max retries reached - move to dead letter queue
      await job.update({
        status: 'dead_letter',
        attempts,
        error: error.message,
        processedAt: new Date()
      });

      logger.error(`💀 Job moved to dead letter queue (max retries)`, {
        jobId: job.id,
        tradeId: job.payload.tradeId,
        attempts,
        error: error.message
      });

      // TODO: Send alert to admin
      // await sendAdminAlert(`Job ${job.id} moved to DLQ`);
    }
  }
}

module.exports = new PostTradeWorker();
