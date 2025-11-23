const { sequelize } = require('../config/database');
const { RevenueEvent, RevenueStream } = require('../models');
const { Op } = require('sequelize');
const logger = require('./logger');
const ttxReserveService = require('./ttxReserveService');
const ethConversionService = require('./ethConversionService');

/**
 * On-Chain Revenue Retry Worker
 * 
 * Retries failed on-chain revenue deliveries with exponential backoff.
 * Ensures revenue collected in backend eventually reaches the smart contract.
 * 
 * Key Features:
 * - Tracks delivery status in metadata.onChainDeliveryStatus
 * - Exponential backoff retry strategy
 * - Capped logging to prevent spam
 * - Aggregated failure reporting for reconciliation
 */
class OnChainRevenueRetryWorker {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.pollIntervalMs = parseInt(process.env.ONCHAIN_RETRY_POLL_MS || '60000', 10); // 1 minute
    this.batchSize = parseInt(process.env.ONCHAIN_RETRY_BATCH || '20', 10);
    this.maxRetryAttempts = parseInt(process.env.ONCHAIN_MAX_RETRIES || '5', 10);
    this.failureLogCap = new Map(); // streamId -> { count, lastLogged }
    this.MAX_LOG_PER_STREAM = 10; // Log first 10 failures, then throttle
  }

  /**
   * Start the retry worker
   */
  async start() {
    if (this.isRunning) {
      logger.warn('⚠️ On-chain revenue retry worker already running');
      return;
    }

    // Only run in production mode when smart contract is configured
    if (process.env.CONTRACT_MODE !== 'production' || !process.env.TTX_TOKEN_ADDRESS) {
      logger.info('ℹ️ On-chain retry worker disabled (not in production or contract not configured)');
      return;
    }

    logger.info('🚀 Starting on-chain revenue retry worker...');

    this.isRunning = true;
    this.interval = setInterval(() => {
      this.processBatch().catch(err => {
        logger.error('❌ On-chain retry worker batch processing error', {
          error: err.message,
          stack: err.stack
        });
      });
    }, this.pollIntervalMs);

    // Run immediately on startup
    this.processBatch().catch(err => {
      logger.error('❌ Initial on-chain retry failed', { error: err.message });
    });

    logger.info(`✅ On-chain revenue retry worker started (poll: ${this.pollIntervalMs}ms, batch: ${this.batchSize})`);
  }

  /**
   * Stop the worker gracefully
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping on-chain revenue retry worker...');

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
    logger.info('✅ On-chain revenue retry worker stopped');
  }

  /**
   * Process a batch of failed revenue events
   */
  async processBatch() {
    try {
      // Find events with failed on-chain delivery that are eligible for retry
      const failedEvents = await RevenueEvent.findAll({
        where: {
          [Op.or]: [
            // Events that failed and haven't exceeded max retries
            sequelize.literal(`
              "RevenueEvent"."metadata"->>'onChainDeliveryStatus' = 'failed' 
              AND COALESCE(("RevenueEvent"."metadata"->>'retryAttempts')::int, 0) < ${this.maxRetryAttempts}
              AND (
                "RevenueEvent"."metadata"->>'nextRetryAt' IS NULL 
                OR ("RevenueEvent"."metadata"->>'nextRetryAt')::timestamp <= NOW()
              )
            `),
            // Events that haven't been attempted yet (null status) and are old enough
            sequelize.literal(`
              "RevenueEvent"."metadata"->>'onChainDeliveryStatus' IS NULL
              AND "RevenueEvent"."created_at" < NOW() - INTERVAL '5 minutes'
            `)
          ]
        },
        include: [{
          model: RevenueStream,
          as: 'stream'
        }],
        order: [['createdAt', 'ASC']],
        limit: this.batchSize
      });

      if (failedEvents.length === 0) {
        return;
      }

      logger.info(`🔄 Processing ${failedEvents.length} failed on-chain deliveries`);

      let successCount = 0;
      let failureCount = 0;

      for (const event of failedEvents) {
        const success = await this.retryOnChainDelivery(event);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      }

      logger.info(`✅ On-chain retry batch complete`, {
        total: failedEvents.length,
        succeeded: successCount,
        failed: failureCount
      });

    } catch (error) {
      logger.error('❌ Failed to process on-chain retry batch', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Retry on-chain delivery for a single revenue event
   */
  async retryOnChainDelivery(event) {
    const metadata = event.metadata || {};
    const retryAttempts = parseInt(metadata.retryAttempts || '0', 10);
    const streamId = event.streamId;

    try {
      // Convert USD holder share to ETH
      const holderShareUSD = parseFloat(event.holderShare);
      const holderShareETH = await ethConversionService.convertUsdToEth(holderShareUSD);

      if (!holderShareETH || holderShareETH <= 0) {
        throw new Error('ETH conversion failed or returned zero');
      }

      // Attempt on-chain delivery
      await ttxReserveService.collectRevenue(streamId, holderShareETH, true);

      // Success - update metadata
      await event.update({
        metadata: {
          ...metadata,
          onChainDeliveryStatus: 'delivered',
          deliveredAt: new Date().toISOString(),
          retryAttempts,
          lastRetryAt: new Date().toISOString()
        }
      });

      // Clear failure log for this stream
      this.failureLogCap.delete(streamId);

      logger.info('✅ On-chain delivery retry succeeded', {
        eventId: event.id,
        streamId,
        streamName: event.stream?.name,
        holderShareUSD: holderShareUSD.toFixed(4),
        holderShareETH: holderShareETH.toFixed(6),
        retryAttempts
      });

      return true;

    } catch (error) {
      // Failure - increment retry count and schedule next retry
      const newRetryAttempts = retryAttempts + 1;
      const backoffMinutes = Math.pow(2, newRetryAttempts); // Exponential: 2, 4, 8, 16, 32 minutes
      const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

      await event.update({
        metadata: {
          ...metadata,
          onChainDeliveryStatus: 'failed',
          retryAttempts: newRetryAttempts,
          lastRetryAt: new Date().toISOString(),
          lastError: error.message,
          nextRetryAt: nextRetryAt.toISOString()
        }
      });

      // Capped logging - prevent spam
      this.logOnChainFailure(streamId, {
        eventId: event.id,
        streamName: event.stream?.name,
        holderShare: parseFloat(event.holderShare),
        retryAttempts: newRetryAttempts,
        maxAttempts: this.maxRetryAttempts,
        nextRetryAt,
        error: error.message
      });

      return false;
    }
  }

  /**
   * Log on-chain failure with rate limiting to prevent spam
   */
  logOnChainFailure(streamId, details) {
    if (!this.failureLogCap.has(streamId)) {
      this.failureLogCap.set(streamId, { count: 0, lastLogged: null });
    }

    const cap = this.failureLogCap.get(streamId);
    cap.count++;

    // Log strategy:
    // - First 10 failures: log every time
    // - 11-100: log every 10th
    // - 100+: log every 100th
    const shouldLog = 
      cap.count <= this.MAX_LOG_PER_STREAM ||
      (cap.count <= 100 && cap.count % 10 === 0) ||
      (cap.count % 100 === 0);

    if (shouldLog) {
      const logLevel = details.retryAttempts >= this.maxRetryAttempts ? 'error' : 'warn';
      
      logger[logLevel]('On-chain revenue delivery failed', {
        streamId,
        streamName: details.streamName,
        eventId: details.eventId,
        holderShare: details.holderShare?.toFixed(4),
        totalFailures: cap.count,
        retryAttempts: details.retryAttempts,
        maxAttempts: details.maxAttempts,
        nextRetryAt: details.nextRetryAt,
        error: details.error
      });

      cap.lastLogged = new Date();
    }
  }

  /**
   * Get aggregated failure report for reconciliation
   * @param {number|null} streamId - Optional stream to filter by
   * @param {number} hours - Hours to look back (default 24)
   */
  async getFailureReport(streamId = null, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const whereClause = {
      createdAt: { [Op.gte]: since },
      [Op.or]: [
        sequelize.literal(`"RevenueEvent"."metadata"->>'onChainDeliveryStatus' = 'failed'`),
        sequelize.literal(`
          "RevenueEvent"."metadata"->>'onChainDeliveryStatus' IS NULL 
          AND "RevenueEvent"."created_at" < NOW() - INTERVAL '10 minutes'
        `)
      ]
    };

    if (streamId !== null) {
      whereClause.streamId = streamId;
    }

    const failures = await RevenueEvent.findAll({
      where: whereClause,
      include: [{
        model: RevenueStream,
        as: 'stream'
      }],
      order: [['createdAt', 'DESC']]
    });

    // Aggregate by stream
    const byStream = failures.reduce((acc, event) => {
      const sid = event.streamId;
      if (!acc[sid]) {
        acc[sid] = {
          streamId: sid,
          streamName: event.stream?.name || `Stream ${sid}`,
          count: 0,
          totalHolderShare: 0,
          maxRetries: 0,
          events: []
        };
      }

      const retryAttempts = parseInt(event.metadata?.retryAttempts || '0', 10);
      
      acc[sid].count++;
      acc[sid].totalHolderShare += parseFloat(event.holderShare || 0);
      acc[sid].maxRetries = Math.max(acc[sid].maxRetries, retryAttempts);
      acc[sid].events.push({
        id: event.id,
        holderShare: parseFloat(event.holderShare),
        description: event.description,
        createdAt: event.createdAt,
        retryAttempts,
        lastError: event.metadata?.lastError,
        nextRetryAt: event.metadata?.nextRetryAt
      });

      return acc;
    }, {});

    const streams = Object.values(byStream);
    const totalFailures = failures.length;
    const totalHolderSharePending = streams.reduce((sum, s) => sum + s.totalHolderShare, 0);
    const criticalFailures = failures.filter(e => 
      parseInt(e.metadata?.retryAttempts || '0', 10) >= this.maxRetryAttempts
    ).length;

    return {
      summary: {
        totalFailures,
        criticalFailures, // Max retries exceeded
        totalHolderSharePending: parseFloat(totalHolderSharePending.toFixed(4)),
        period: `Last ${hours} hours`,
        needsReconciliation: totalFailures > 0
      },
      byStream: streams.sort((a, b) => b.count - a.count)
    };
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pollIntervalMs: this.pollIntervalMs,
      batchSize: this.batchSize,
      maxRetryAttempts: this.maxRetryAttempts,
      enabled: process.env.CONTRACT_MODE === 'production' && !!process.env.TTX_TOKEN_ADDRESS,
      failureLogCaps: Array.from(this.failureLogCap.entries()).map(([streamId, data]) => ({
        streamId,
        totalFailuresSeen: data.count,
        lastLogged: data.lastLogged
      }))
    };
  }
}

module.exports = new OnChainRevenueRetryWorker();
