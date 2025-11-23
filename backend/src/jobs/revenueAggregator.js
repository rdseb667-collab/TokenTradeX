const { sequelize } = require('../config/database');
const { RevenueEvent, RevenueLedger, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../services/logger');
const revenueDefenseService = require('../services/revenueDefenseService');

/**
 * Revenue Aggregator Job
 * Aggregates revenue events into daily ledger entries per user/stream
 * Runs every 5 minutes to keep ledger up-to-date for dashboards
 */
class RevenueAggregatorJob {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
  }

  /**
   * Aggregate revenue events into ledger
   * Idempotent: tracks lastEventId to avoid reprocessing
   */
  async run() {
    if (this.isRunning) {
      logger.warn('Revenue aggregator already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      logger.info('🔄 Starting revenue aggregation...');

      // Get all unaggregated events
      const unaggregatedEvents = await this.getUnaggregatedEvents();
      
      if (unaggregatedEvents.length === 0) {
        logger.info('✅ No new events to aggregate');
        return { processed: 0, duration: Date.now() - startTime };
      }

      logger.info(`📊 Processing ${unaggregatedEvents.length} events`);

      // Group events by (userId, stream, period, currency)
      const groupedEvents = this.groupEventsByLedgerKey(unaggregatedEvents);

      // Process each group
      let processed = 0;
      for (const [key, events] of Object.entries(groupedEvents)) {
        await this.upsertLedgerEntry(key, events);
        processed += events.length;
      }

      const duration = Date.now() - startTime;
      this.lastRun = new Date();

      logger.info(`✅ Revenue aggregation complete`, {
        processed,
        groups: Object.keys(groupedEvents).length,
        duration: `${duration}ms`
      });

      return { processed, duration };

    } catch (error) {
      logger.error('❌ Revenue aggregation failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get events that haven't been aggregated yet
   */
  async getUnaggregatedEvents() {
    const transaction = await sequelize.transaction();
    
    try {
      // Find all events not yet in any ledger entry
      const events = await sequelize.query(`
        SELECT re.*
        FROM revenue_events re
        LEFT JOIN revenue_ledger rl ON (
          rl.user_id = re.user_id
          AND rl.stream = re.source_type
          AND rl.period = DATE(re.created_at)
          AND rl.last_event_id = re.id
        )
        WHERE rl.id IS NULL
          OR re.created_at > (
            SELECT MAX(created_at) 
            FROM revenue_events 
            WHERE id = rl.last_event_id
          )
        ORDER BY re.created_at ASC
        LIMIT 10000
      `, {
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      await transaction.commit();
      return events;

    } catch (error) {
      await transaction.rollback();
      
      // Fallback to simpler query if above fails
      logger.warn('Complex query failed, using fallback');
      return await RevenueEvent.findAll({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        order: [['createdAt', 'ASC']],
        limit: 10000
      });
    }
  }

  /**
   * Group events by ledger key (userId, stream, period, currency)
   */
  groupEventsByLedgerKey(events) {
    const groups = {};

    for (const event of events) {
      // Extract period (date only)
      const period = new Date(event.createdAt || event.created_at);
      const periodKey = period.toISOString().split('T')[0];

      // Use sourceType as stream name
      const stream = event.sourceType || event.source_type || 'UNKNOWN';
      const userId = event.userId || event.user_id || null;
      const currency = event.currency || 'USD';

      // Create composite key
      const key = `${userId}|${stream}|${periodKey}|${currency}`;

      if (!groups[key]) {
        groups[key] = {
          userId,
          stream,
          period: periodKey,
          currency,
          events: []
        };
      }

      groups[key].events.push(event);
    }

    return groups;
  }

  /**
   * Upsert ledger entry for a group of events
   */
  async upsertLedgerEntry(key, group) {
    const transaction = await sequelize.transaction();

    try {
      const { userId, stream, period, currency, events } = group;

      // Skip if no userId (platform-level events handled separately)
      if (!userId) {
        await transaction.commit();
        return;
      }

      // Calculate totals
      const gross = events.reduce((sum, e) => {
        const amount = parseFloat(e.grossAmount || e.gross_amount || 0);
        return sum + amount;
      }, 0);

      const net = events.reduce((sum, e) => {
        const amount = parseFloat(e.netAmount || e.net_amount || 0);
        return sum + amount;
      }, 0);

      // Get last event ID for idempotency tracking
      const lastEvent = events[events.length - 1];
      const lastEventId = lastEvent.id;

      // Upsert ledger entry
      await sequelize.query(`
        INSERT INTO revenue_ledger (
          user_id, stream, period, currency, gross, net, last_event_id, created_at, updated_at
        )
        VALUES (
          :userId, :stream, :period, :currency, :gross, :net, :lastEventId, NOW(), NOW()
        )
        ON CONFLICT (user_id, stream, period, currency)
        DO UPDATE SET
          gross = revenue_ledger.gross + :gross,
          net = revenue_ledger.net + :net,
          last_event_id = :lastEventId,
          updated_at = NOW()
      `, {
        replacements: {
          userId,
          stream,
          period,
          currency,
          gross,
          net,
          lastEventId
        },
        transaction
      });

      await transaction.commit();

      logger.debug('📝 Ledger entry updated', {
        userId,
        stream,
        period,
        eventCount: events.length,
        gross: parseFloat(gross).toFixed(2),
        net: parseFloat(net).toFixed(2)
      });

    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to upsert ledger entry', {
        key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get aggregation status
   */
  async getStatus() {
    try {
      const [eventCount] = await sequelize.query(`
        SELECT COUNT(*) as total FROM revenue_events
      `, { type: sequelize.QueryTypes.SELECT });

      const [ledgerCount] = await sequelize.query(`
        SELECT COUNT(*) as total FROM revenue_ledger
      `, { type: sequelize.QueryTypes.SELECT });

      const [lastEvent] = await sequelize.query(`
        SELECT created_at FROM revenue_events ORDER BY created_at DESC LIMIT 1
      `, { type: sequelize.QueryTypes.SELECT });

      return {
        isRunning: this.isRunning,
        lastRun: this.lastRun,
        totalEvents: eventCount?.total || 0,
        totalLedgerEntries: ledgerCount?.total || 0,
        lastEventTime: lastEvent?.created_at || null,
        healthy: !this.isRunning || (Date.now() - (this.lastRun?.getTime() || 0)) < 600000 // 10 min
      };
    } catch (error) {
      logger.error('Failed to get aggregator status', { error: error.message });
      return { error: error.message };
    }
  }

  /**
   * Start periodic aggregation (call from server startup)
   */
  startPeriodic(intervalMs = 5 * 60 * 1000) {
    logger.info(`🚀 Starting revenue aggregator (interval: ${intervalMs}ms)`);
    
    // Run immediately
    this.run().catch(err => logger.error('Initial aggregation failed', err));
    
    // Then run periodically
    this.interval = setInterval(() => {
      this.run().catch(err => logger.error('Periodic aggregation failed', err));
    }, intervalMs);

    // Run defense checks every hour
    this.defenseInterval = setInterval(() => {
      revenueDefenseService.runDefenseChecks()
        .then(results => {
          if (results.checks?.concentration?.warning ||
              results.checks?.negativeFlows?.count > 0 ||
              results.checks?.missingEvents?.streams > 0) {
            logger.warn('⚠️ Revenue defense alert', {
              concentration: results.checks.concentration,
              negativeFlows: results.checks.negativeFlows?.count,
              missingEvents: results.checks.missingEvents?.streams
            });
          }
        })
        .catch(err => logger.error('Defense checks failed', err));
    }, 60 * 60 * 1000); // Every hour

    return this.interval;
  }

  /**
   * Stop periodic aggregation
   */
  stopPeriodic() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('⏹️ Revenue aggregator stopped');
    }
    if (this.defenseInterval) {
      clearInterval(this.defenseInterval);
      this.defenseInterval = null;
      logger.info('⏹️ Revenue defense checks stopped');
    }
  }
}

module.exports = new RevenueAggregatorJob();
