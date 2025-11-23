const { sequelize } = require('../config/database');
const { RevenueEvent, RevenueStream, User } = require('../models');
const logger = require('./logger');

/**
 * Revenue Event Service
 * Idempotent revenue recording with de-duplication on (stream, refId)
 */

const REVENUE_STREAMS = {
  TRADING_FEES: 'TRADING_FEES',
  WITHDRAWAL_FEES: 'WITHDRAWAL_FEES',
  PREMIUM_SUBS: 'PREMIUM_SUBS',
  API_LICENSING: 'API_LICENSING',
  MARKET_MAKING: 'MARKET_MAKING',
  LENDING_INTEREST: 'LENDING_INTEREST',
  STAKING_COMMISSIONS: 'STAKING_COMMISSIONS',
  COPY_TRADING_FEES: 'COPY_TRADING_FEES',
  WHITE_LABEL: 'WHITE_LABEL',
  NFT_POSITIONS: 'NFT_POSITIONS'
};

/**
 * Record revenue event idempotently
 * De-duplicates on unique(stream, refId) to prevent double-counting
 * 
 * @param {Object} input
 * @param {string} input.stream - Revenue stream type
 * @param {string} input.subtype - Optional subtype
 * @param {string} input.userId - User ID
 * @param {string} input.counterpartyId - Counterparty user ID
 * @param {string} input.asset - Asset symbol (e.g., 'USD', 'BTC')
 * @param {number} input.amount - Amount (can be negative for refunds)
 * @param {number} input.feeBps - Fee in basis points
 * @param {number} input.notional - Notional value if applicable
 * @param {string} input.refId - Unique reference ID per stream for de-duplication
 * @param {Date} input.occurredAt - When event occurred
 * @param {Object} input.metadata - Additional metadata
 */
async function recordRevenue(input) {
  const transaction = await sequelize.transaction();

  try {
    // Validate stream
    if (!REVENUE_STREAMS[input.stream]) {
      throw new Error(`Invalid revenue stream: ${input.stream}`);
    }

    // Find or create stream record
    const [stream] = await RevenueStream.findOrCreate({
      where: { name: input.stream },
      defaults: {
        name: input.stream,
        description: `Revenue from ${input.stream}`,
        totalRevenue: 0,
        eventCount: 0
      },
      transaction
    });

    // Calculate gross and net amounts
    const grossAmount = Math.abs(input.amount);
    const isNegative = input.amount < 0;
    
    // 15/85 split: 15% to holders, 85% to reserve
    const holderShare = grossAmount * 0.15;
    const reserveShare = grossAmount * 0.85;
    const netAmount = isNegative ? -holderShare : holderShare;

    // Check for existing event (idempotency via unique constraint)
    const existing = await RevenueEvent.findOne({
      where: {
        sourceType: input.stream,
        sourceId: input.refId
      },
      transaction
    });

    if (existing) {
      await transaction.commit();
      logger.debug('Revenue event already recorded (idempotent)', {
        stream: input.stream,
        refId: input.refId,
        eventId: existing.id
      });
      return { event: existing, isNew: false };
    }

    // Create new revenue event
    const event = await RevenueEvent.create({
      streamId: stream.id,
      sourceType: input.stream,
      sourceId: input.refId,
      userId: input.userId || null,
      grossAmount: isNegative ? -grossAmount : grossAmount,
      netAmount,
      holderShare: isNegative ? -holderShare : holderShare,
      reserveShare: isNegative ? -reserveShare : reserveShare,
      currency: input.asset || 'USD',
      metadata: {
        ...input.metadata,
        subtype: input.subtype,
        counterpartyId: input.counterpartyId,
        feeBps: input.feeBps,
        notional: input.notional,
        occurredAt: input.occurredAt || new Date()
      }
    }, { transaction });

    // Update stream totals
    await stream.increment({
      totalRevenue: isNegative ? -grossAmount : grossAmount,
      eventCount: 1
    }, { transaction });

    await transaction.commit();

    logger.info('Revenue event recorded', {
      stream: input.stream,
      refId: input.refId,
      amount: input.amount,
      userId: input.userId,
      eventId: event.id
    });

    return { event, isNew: true };

  } catch (error) {
    await transaction.rollback();
    
    // Check if duplicate key error (race condition)
    if (error.name === 'SequelizeUniqueConstraintError') {
      logger.warn('Revenue event duplicate (race condition)', {
        stream: input.stream,
        refId: input.refId
      });
      // Fetch the existing record
      const existing = await RevenueEvent.findOne({
        where: {
          sourceType: input.stream,
          sourceId: input.refId
        }
      });
      return { event: existing, isNew: false };
    }

    logger.error('Failed to record revenue event', {
      stream: input.stream,
      refId: input.refId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Record refund/chargeback (negative revenue event)
 */
async function recordRefund(stream, originalRefId, refundAmount, reason) {
  return recordRevenue({
    stream,
    amount: -Math.abs(refundAmount),
    refId: `refund:${originalRefId}`,
    metadata: { 
      reason,
      originalRefId,
      isRefund: true
    }
  });
}

/**
 * Bulk record revenue events (for batch processing)
 */
async function recordRevenueBatch(events) {
  const results = [];
  
  for (const event of events) {
    try {
      const result = await recordRevenue(event);
      results.push({ success: true, ...result });
    } catch (error) {
      results.push({ 
        success: false, 
        error: error.message,
        event 
      });
    }
  }

  return results;
}

module.exports = {
  REVENUE_STREAMS,
  recordRevenue,
  recordRefund,
  recordRevenueBatch
};
