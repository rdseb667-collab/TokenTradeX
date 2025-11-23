const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const logger = require('./logger');

/**
 * Revenue Defense Service
 * Prevents profit concentration, detects anomalies, and enforces hard caps
 */
class RevenueDefenseService {
  constructor() {
    // Hard caps from environment (immutable after load)
    this.HARD_CAPS = Object.freeze({
      MAX_MAKER_REBATE_BPS: parseInt(process.env.MAX_MAKER_REBATE_BPS || '50'), // 0.5% max
      MAX_TAKER_FEE_BPS: parseInt(process.env.MAX_TAKER_FEE_BPS || '100'), // 1% max
      MAX_COMMISSION_BPS: parseInt(process.env.MAX_COMMISSION_BPS || '2000'), // 20% max
      MAX_WITHDRAWAL_FEE_PCT: parseFloat(process.env.MAX_WITHDRAWAL_FEE_PCT || '2.0'), // 2% max
      
      // Concentration limits
      MAX_SINGLE_USER_DAILY_PCT: parseFloat(process.env.MAX_SINGLE_USER_DAILY_PCT || '20.0'), // 20% of daily revenue
      MAX_TOP5_USERS_DAILY_PCT: parseFloat(process.env.MAX_TOP5_USERS_DAILY_PCT || '50.0'), // 50% of daily revenue
      
      // Timelock for parameter changes (milliseconds)
      PARAMETER_CHANGE_DELAY_MS: parseInt(process.env.PARAMETER_CHANGE_DELAY_MS || '86400000'), // 24 hours
      
      // Alert thresholds
      GINI_COEFFICIENT_WARNING: parseFloat(process.env.GINI_COEFFICIENT_WARNING || '0.7'),
      NEGATIVE_NET_THRESHOLD_USD: parseFloat(process.env.NEGATIVE_NET_THRESHOLD_USD || '1000')
    });

    // Pending parameter changes (timelock)
    this.pendingChanges = new Map();
    
    // Immutable recipient registry
    this.recipientRegistry = new Set();
    this.loadRecipientRegistry();
  }

  /**
   * Load immutable recipient registry
   * In production, this should be loaded from blockchain multi-sig contract
   */
  async loadRecipientRegistry() {
    try {
      // Load approved recipients from database or environment
      const approvedRecipients = (process.env.APPROVED_RECIPIENTS || '').split(',').filter(Boolean);
      
      for (const recipient of approvedRecipients) {
        this.recipientRegistry.add(recipient.trim());
      }

      logger.info('Loaded recipient registry', {
        count: this.recipientRegistry.size
      });
    } catch (error) {
      logger.error('Failed to load recipient registry', { error: error.message });
    }
  }

  /**
   * Validate fee parameters against hard caps
   */
  validateFeeParameters(params) {
    const violations = [];

    if (params.makerRebateBps > this.HARD_CAPS.MAX_MAKER_REBATE_BPS) {
      violations.push({
        param: 'makerRebateBps',
        value: params.makerRebateBps,
        max: this.HARD_CAPS.MAX_MAKER_REBATE_BPS,
        message: `Maker rebate exceeds hard cap of ${this.HARD_CAPS.MAX_MAKER_REBATE_BPS} bps`
      });
    }

    if (params.takerFeeBps > this.HARD_CAPS.MAX_TAKER_FEE_BPS) {
      violations.push({
        param: 'takerFeeBps',
        value: params.takerFeeBps,
        max: this.HARD_CAPS.MAX_TAKER_FEE_BPS,
        message: `Taker fee exceeds hard cap of ${this.HARD_CAPS.MAX_TAKER_FEE_BPS} bps`
      });
    }

    if (params.commissionBps && params.commissionBps > this.HARD_CAPS.MAX_COMMISSION_BPS) {
      violations.push({
        param: 'commissionBps',
        value: params.commissionBps,
        max: this.HARD_CAPS.MAX_COMMISSION_BPS,
        message: `Commission exceeds hard cap of ${this.HARD_CAPS.MAX_COMMISSION_BPS} bps`
      });
    }

    if (violations.length > 0) {
      logger.error('Fee parameter validation failed', { violations });
      throw new Error(`Fee parameters violate hard caps: ${violations.map(v => v.message).join('; ')}`);
    }

    return true;
  }

  /**
   * Validate recipient is in approved registry
   */
  validateRecipient(recipient) {
    if (!this.recipientRegistry.has(recipient)) {
      logger.error('Unauthorized recipient', { recipient });
      throw new Error(`Recipient not in approved registry: ${recipient}`);
    }
    return true;
  }

  /**
   * Request parameter change with timelock
   */
  async requestParameterChange(key, newValue, requestedBy) {
    const changeId = `${key}_${Date.now()}`;
    const executeAt = new Date(Date.now() + this.HARD_CAPS.PARAMETER_CHANGE_DELAY_MS);

    this.pendingChanges.set(changeId, {
      key,
      oldValue: process.env[key],
      newValue,
      requestedBy,
      requestedAt: new Date(),
      executeAt,
      status: 'pending'
    });

    logger.warn('Parameter change requested (timelock active)', {
      changeId,
      key,
      newValue,
      executeAt,
      requestedBy
    });

    // TODO: Store in database for persistence
    // await ConfigChangeLog.create({ changeId, key, oldValue, newValue, requestedBy, executeAt });

    return { changeId, executeAt };
  }

  /**
   * Execute pending parameter changes that have passed timelock
   */
  async executePendingChanges() {
    const now = new Date();
    const executed = [];

    for (const [changeId, change] of this.pendingChanges.entries()) {
      if (change.status === 'pending' && now >= change.executeAt) {
        try {
          // Validate before applying
          if (change.key.includes('BPS') || change.key.includes('FEE')) {
            this.validateFeeParameters({ [change.key]: parseFloat(change.newValue) });
          }

          // Apply change (in production, update environment via config service)
          process.env[change.key] = change.newValue;
          change.status = 'executed';
          change.executedAt = now;

          executed.push(change);

          logger.info('Parameter change executed', {
            changeId,
            key: change.key,
            oldValue: change.oldValue,
            newValue: change.newValue
          });

        } catch (error) {
          change.status = 'failed';
          change.error = error.message;

          logger.error('Parameter change execution failed', {
            changeId,
            error: error.message
          });
        }
      }
    }

    return executed;
  }

  /**
   * Calculate revenue concentration metrics (Gini coefficient)
   * Higher Gini = more concentration (0 = perfect equality, 1 = total concentration)
   */
  async calculateRevenueConcentration(startDate, endDate) {
    try {
      const results = await sequelize.query(`
        WITH user_revenues AS (
          SELECT 
            user_id,
            SUM(gross) AS total_revenue
          FROM revenue_ledger
          WHERE period >= :startDate AND period < :endDate
            AND user_id IS NOT NULL
          GROUP BY user_id
          ORDER BY total_revenue ASC
        ),
        ranked AS (
          SELECT 
            user_id,
            total_revenue,
            ROW_NUMBER() OVER (ORDER BY total_revenue ASC) AS rank,
            COUNT(*) OVER () AS total_count,
            SUM(total_revenue) OVER () AS total_sum
          FROM user_revenues
        )
        SELECT 
          COUNT(*) AS user_count,
          SUM(total_revenue) AS total_revenue,
          -- Gini coefficient calculation
          (2.0 * SUM(rank * total_revenue) / NULLIF(SUM(total_revenue), 0) / total_count - (total_count + 1.0) / total_count) AS gini_coefficient,
          -- Top N concentration
          (SELECT SUM(total_revenue) FROM (SELECT total_revenue FROM user_revenues ORDER BY total_revenue DESC LIMIT 1) t) AS top1_revenue,
          (SELECT SUM(total_revenue) FROM (SELECT total_revenue FROM user_revenues ORDER BY total_revenue DESC LIMIT 5) t) AS top5_revenue
        FROM ranked
        GROUP BY total_count
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      if (results.length === 0 || !results[0].total_revenue) {
        return {
          giniCoefficient: 0,
          top1Pct: 0,
          top5Pct: 0,
          userCount: 0,
          totalRevenue: 0,
          warning: false
        };
      }

      const data = results[0];
      const gini = parseFloat(data.gini_coefficient || 0);
      const top1Pct = (parseFloat(data.top1_revenue || 0) / parseFloat(data.total_revenue)) * 100;
      const top5Pct = (parseFloat(data.top5_revenue || 0) / parseFloat(data.total_revenue)) * 100;

      // Check for concentration warnings
      const warning = 
        gini > this.HARD_CAPS.GINI_COEFFICIENT_WARNING ||
        top1Pct > this.HARD_CAPS.MAX_SINGLE_USER_DAILY_PCT ||
        top5Pct > this.HARD_CAPS.MAX_TOP5_USERS_DAILY_PCT;

      if (warning) {
        logger.warn('Revenue concentration alert', {
          gini,
          top1Pct,
          top5Pct,
          thresholds: {
            gini: this.HARD_CAPS.GINI_COEFFICIENT_WARNING,
            top1: this.HARD_CAPS.MAX_SINGLE_USER_DAILY_PCT,
            top5: this.HARD_CAPS.MAX_TOP5_USERS_DAILY_PCT
          }
        });
      }

      return {
        giniCoefficient: gini,
        top1Pct,
        top5Pct,
        userCount: parseInt(data.user_count),
        totalRevenue: parseFloat(data.total_revenue),
        warning
      };

    } catch (error) {
      logger.error('Failed to calculate revenue concentration', { error: error.message });
      throw error;
    }
  }

  /**
   * Detect wash trading / maker-taker arbitrage
   * Flags entities earning more from rebates than they pay in fees
   */
  async detectNegativeNetFlows(days = 7) {
    try {
      const results = await sequelize.query(`
        WITH fee_flows AS (
          SELECT 
            user_id,
            SUM(CASE WHEN metadata->>'role' = 'MAKER' THEN gross ELSE 0 END) AS maker_rebates,
            SUM(CASE WHEN metadata->>'role' = 'TAKER' THEN gross ELSE 0 END) AS taker_fees,
            SUM(gross) AS total_fees
          FROM revenue_events
          WHERE source_type = 'TRADING_FEES'
            AND created_at >= NOW() - INTERVAL '${days} days'
            AND user_id IS NOT NULL
          GROUP BY user_id
        )
        SELECT 
          f.user_id,
          u.email,
          f.maker_rebates,
          f.taker_fees,
          f.total_fees,
          (f.maker_rebates - f.taker_fees) AS net_flow
        FROM fee_flows f
        JOIN users u ON u.id = f.user_id
        WHERE (f.maker_rebates - f.taker_fees) > :threshold
        ORDER BY net_flow DESC
        LIMIT 50
      `, {
        replacements: { threshold: this.HARD_CAPS.NEGATIVE_NET_THRESHOLD_USD },
        type: sequelize.QueryTypes.SELECT
      });

      if (results.length > 0) {
        logger.warn('Negative net flow detected (potential wash trading)', {
          count: results.length,
          topOffender: results[0]
        });
      }

      return results;

    } catch (error) {
      logger.error('Failed to detect negative net flows', { error: error.message });
      throw error;
    }
  }

  /**
   * Detect missing revenue events (completeness check)
   */
  async detectMissingRevenueEvents() {
    try {
      const results = await sequelize.query(`
        WITH sources AS (
          SELECT 
            'TRADING_FEES' AS stream,
            id::text AS ref_id,
            created_at AS occurred_at
          FROM trades
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          
          UNION ALL
          
          SELECT 
            'WITHDRAWAL_FEES' AS stream,
            id::text AS ref_id,
            created_at AS occurred_at
          FROM transactions
          WHERE type = 'withdrawal'
            AND status = 'completed'
            AND created_at >= NOW() - INTERVAL '24 hours'
        )
        SELECT 
          s.stream,
          COUNT(*) AS missing_count,
          ARRAY_AGG(s.ref_id ORDER BY s.occurred_at DESC) FILTER (WHERE e.id IS NULL) AS sample_missing_ids
        FROM sources s
        LEFT JOIN revenue_events e 
          ON e.source_type = s.stream 
          AND e.source_id = s.ref_id
        WHERE e.id IS NULL
        GROUP BY s.stream
        HAVING COUNT(*) > 0
        ORDER BY missing_count DESC
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      if (results.length > 0) {
        logger.error('Missing revenue events detected', {
          streams: results.map(r => ({
            stream: r.stream,
            missing: r.missing_count,
            sampleIds: r.sample_missing_ids.slice(0, 5)
          }))
        });
      }

      return results;

    } catch (error) {
      logger.error('Failed to detect missing revenue events', { error: error.message });
      return [];
    }
  }

  /**
   * Get recent parameter changes (audit log)
   */
  async getRecentParameterChanges(hours = 24) {
    const changes = [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    for (const [changeId, change] of this.pendingChanges.entries()) {
      if (change.requestedAt >= cutoff) {
        changes.push({ changeId, ...change });
      }
    }

    changes.sort((a, b) => b.requestedAt - a.requestedAt);
    return changes;
  }

  /**
   * Run all defense checks
   */
  async runDefenseChecks() {
    logger.info('Running revenue defense checks...');

    const results = {
      timestamp: new Date(),
      checks: {}
    };

    try {
      // 1. Execute pending parameter changes
      const executedChanges = await this.executePendingChanges();
      results.checks.parameterChanges = {
        executed: executedChanges.length,
        changes: executedChanges
      };

      // 2. Check revenue concentration (today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const concentration = await this.calculateRevenueConcentration(today, tomorrow);
      results.checks.concentration = concentration;

      // 3. Detect negative net flows
      const negativeFlows = await this.detectNegativeNetFlows(7);
      results.checks.negativeFlows = {
        count: negativeFlows.length,
        flagged: negativeFlows.slice(0, 10)
      };

      // 4. Detect missing events
      const missingEvents = await this.detectMissingRevenueEvents();
      results.checks.missingEvents = {
        streams: missingEvents.length,
        details: missingEvents
      };

      // Log summary
      logger.info('Revenue defense checks complete', {
        concentration: concentration.warning ? 'WARNING' : 'OK',
        negativeFlows: negativeFlows.length,
        missingEvents: missingEvents.reduce((sum, s) => sum + parseInt(s.missing_count), 0)
      });

    } catch (error) {
      logger.error('Revenue defense checks failed', { error: error.message });
      results.error = error.message;
    }

    return results;
  }
}

module.exports = new RevenueDefenseService();
