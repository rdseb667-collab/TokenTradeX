const ttxReserveService = require('./ttxReserveService');
const ethConversionService = require('./ethConversionService');
const logger = require('./logger');
const prometheusMetrics = require('./prometheusMetrics');
const { sequelize } = require('../config/database');
const { RevenueStream, RevenueEvent } = require('../models');

/**
 * Revenue Stream Service - Phase 2 PERSISTENT VERSION
 * 
 * Now uses RevenueStream and RevenueEvent models for durability.
 * 
 * CLEAN SEPARATION (matches TTXUnified.sol):
 * - TTX token fees → totalRevenueTTX (for staker rewards)
 * - Cash/ETH fees → totalReserveETH (for buybacks)
 * 
 * SPLIT: 15% → TTX holders (fair rewards), 85% → Reserve (backing)
 * 
 * This creates the flywheel:
 * Usage → Revenue → Holder rewards + Reserve growth → Price up → More usage
 * 
 * NOTE: Backend tracks in USD for accounting, smart contract tracks separately:
 * - TTX fees stay on-chain for auto-compound
 * - ETH fees accumulate for buyback operations
 */
class RevenueStreamService {
  constructor() {
    const hp = parseFloat(process.env.REVENUE_HOLDER_PERCENTAGE ?? '0.15');
    const rp = parseFloat(process.env.REVENUE_RESERVE_PERCENTAGE ?? '0.85');
    this.holderSharePercentage = isNaN(hp) ? 0.15 : hp; // 15% to holders (fair & sustainable)
    this.reserveFundPercentage = isNaN(rp) ? 0.85 : rp; // 85% to reserve (strong backing)
    this.circulatingSupply = 500000000; // 500M TTX circulating
  }

  /**
   * Collect revenue from any stream - Phase 2 PERSISTENT VERSION
   * Records to RevenueEvent ledger for complete audit trail
   * 15% → TTX holders
   * 85% → Reserve fund
   */
  async collectRevenue(streamId, amount, description = '', sourceId = null) {
    const transaction = await sequelize.transaction();
    
    try {
      if (streamId < 0 || streamId > 9) {
        throw new Error('Invalid stream ID');
      }

      // Get stream from database
      const stream = await RevenueStream.findByPk(streamId, { transaction });
      if (!stream) {
        throw new Error(`Revenue stream ${streamId} not found`);
      }

      const holderShare = amount * this.holderSharePercentage;
      const reserveShare = amount * this.reserveFundPercentage;

      // Create revenue event (idempotent via unique index on source_type + source_id)
      const sourceType = 'trade'; // Default, can be parameterized
      const eventSourceId = sourceId || `${sourceType}-${Date.now()}-${Math.random()}`;

      try {
        await RevenueEvent.create({
          streamId,
          sourceType,
          sourceId: eventSourceId,
          currency: 'USD',
          grossAmount: amount,
          netAmount: amount,
          holderShare,
          reserveShare,
          description,
          metadata: {
            timestamp: new Date().toISOString(),
            streamName: stream.name,
            onChainDeliveryStatus: 'pending'
          }
        }, { transaction });
      } catch (error) {
        // If duplicate (unique constraint violation), skip silently (idempotent)
        if (error.name === 'SequelizeUniqueConstraintError') {
          logger.info('Revenue event already recorded (idempotent)', { sourceId: eventSourceId });
          await transaction.rollback();
          return { success: true, duplicate: true };
        }
        throw error;
      }

      // Update stream totals
      await stream.increment({
        collected: amount,
        distributed: holderShare
      }, { transaction });

      await transaction.commit();

      // Update Prometheus metrics
      prometheusMetrics.updateRevenueMetrics(streamId, stream.name, 
        parseFloat(stream.collected) + amount, 
        parseFloat(stream.distributed) + holderShare
      );
      prometheusMetrics.recordRevenueEvent(streamId, stream.name, sourceType);

      logger.info('✅ Revenue collected - Flywheel active', {
        stream: stream.name,
        totalAmount: amount,
        holderShare: holderShare,
        reserveShare: reserveShare,
        description
      });

      // Send to smart contract (holder share goes on-chain) - ASYNC
      setImmediate(async () => {
        let deliveryStatus = 'pending';
        try {
          // Only invoke on-chain when in production and contract is configured
          if (process.env.CONTRACT_MODE === 'production' && process.env.TTX_TOKEN_ADDRESS) {
            // Convert USD holder share to ETH before sending
            const holderShareETH = await ethConversionService.convertUsdToEth(holderShare);
            logger.info('💰 Sending on-chain holder share', { holderShareUSD: holderShare, holderShareETH });
            await ttxReserveService.collectRevenue(streamId, holderShareETH, true);
            deliveryStatus = 'delivered';
            
            // Update event metadata with success
            await RevenueEvent.update(
              { 
                metadata: sequelize.fn(
                  'jsonb_set',
                  sequelize.fn(
                    'jsonb_set',
                    sequelize.col('metadata'),
                    '{onChainDeliveryStatus}',
                    JSON.stringify('delivered')
                  ),
                  '{deliveredAt}',
                  JSON.stringify(new Date().toISOString())
                )
              },
              { where: { sourceId: eventSourceId } }
            );
          } else {
            logger.info('⚠️ On-chain holder share skipped', { 
              holderShareUSD: holderShare,
              mode: process.env.CONTRACT_MODE || 'development',
              reason: !process.env.TTX_TOKEN_ADDRESS ? 'Contract not configured' : 'Not in production mode'
            });
          }
        } catch (error) {
          deliveryStatus = 'failed';
          logger.warn('Smart contract revenue collection failed, tracking locally', {
            error: error.message,
            eventSourceId
          });
          
          // Update event metadata with failure details
          await RevenueEvent.update(
            { 
              metadata: sequelize.fn(
                'jsonb_set',
                sequelize.fn(
                  'jsonb_set',
                  sequelize.fn(
                    'jsonb_set',
                    sequelize.col('metadata'),
                    '{onChainDeliveryStatus}',
                    JSON.stringify('failed')
                  ),
                  '{retryAttempts}',
                  '0'
                ),
                '{lastError}',
                JSON.stringify(error.message)
              )
            },
            { where: { sourceId: eventSourceId } }
          );
        }
      });

      return {
        success: true,
        streamName: stream.name,
        totalCollected: amount,
        holderShare,
        reserveShare
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('❌ Failed to collect revenue', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Get reserve fund status - Phase 2 VERSION
   * Calculates from persisted data
   */
  async getReserveFundStatus() {
    const streams = await RevenueStream.findAll();
    const totalReserveCollected = streams.reduce((sum, s) => sum + parseFloat(s.collected || 0), 0) * this.reserveFundPercentage;
    const ttxBacking = totalReserveCollected / this.circulatingSupply;

    // Update Prometheus metrics for reserve
    prometheusMetrics.updateReserveMetrics(totalReserveCollected, ttxBacking);

    return {
      totalReserveCollected,
      ttxBackingPerToken: ttxBacking,
      circulatingSupply: this.circulatingSupply,
      impliedMinPrice: ttxBacking,
      message: `Each TTX is backed by $${ttxBacking.toFixed(6)} in reserve. Active usage increases this backing.`
    };
  }
  
  /**
   * Show the flywheel effect - Phase 2 VERSION
   */
  async getFlywheelMetrics() {
    const streams = await RevenueStream.findAll();
    const totalRevenue = streams.reduce((sum, s) => sum + parseFloat(s.collected || 0), 0);
    const holderEarnings = totalRevenue * this.holderSharePercentage;
    const reserveGrowth = totalRevenue * this.reserveFundPercentage;
    
    return {
      totalPlatformRevenue: totalRevenue,
      userBenefits: {
        directEarnings: holderEarnings,
        percentage: '15%',
        message: 'You earn 15% of all revenue - sustainable rewards!'
      },
      priceAppreciation: {
        reserveGrowth: reserveGrowth,
        backingIncrease: (reserveGrowth / this.circulatingSupply).toFixed(6),
        percentage: '85%',
        message: 'Reserve backing grows strongly, supporting higher prices'
      },
      flywheelEffect: [
        '1. You use platform → Revenue generated',
        '2. You get 15% as holder → Fair benefit',
        '3. Reserve gets 85% → Backing increases strongly',
        '4. Higher backing → TTX price rises',
        '5. Your holdings worth more → You use more',
        '6. Cycle repeats → Sustainable growth'
      ],
      streams: streams.map(s => ({
        id: s.id,
        name: s.name,
        collected: parseFloat(s.collected || 0),
        distributed: parseFloat(s.distributed || 0),
        targetMonthly: parseFloat(s.targetMonthly || 0),
        progress: parseFloat(s.collected || 0) / parseFloat(s.targetMonthly || 1) * 100
      }))
    };
  }

  /**
   * Get all revenue streams from database
   */
  async getAllStreams() {
    return await RevenueStream.findAll({
      order: [['id', 'ASC']]
    });
  }

  /**
   * Get revenue events for a stream
   */
  async getStreamEvents(streamId, limit = 100) {
    return await RevenueEvent.findAll({
      where: { streamId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  /**
   * Calculate user's potential monthly earnings
   */
  calculateUserMonthlyEarnings(userTTXBalance, monthlyPlatformRevenue) {
    // Assume 500M circulating supply
    const circulatingSupply = 500000000;
    const userPercentage = userTTXBalance / circulatingSupply;
    const holderShare = monthlyPlatformRevenue * this.holderSharePercentage;
    
    // Get user's tier for multiplier
    const tier = ttxReserveService.feeTiers.find(t => userTTXBalance >= t.minBalance) 
      || ttxReserveService.feeTiers[0];
    
    const baseEarnings = holderShare * userPercentage;
    const multipliedEarnings = baseEarnings * (tier.revenueMultiplier || 1);
    
    return {
      monthlyEarnings: multipliedEarnings,
      annualEarnings: multipliedEarnings * 12,
      userPercentage: (userPercentage * 100).toFixed(4),
      revenueMultiplier: tier.revenueMultiplier || 1,
      tier: tier.discountPercent ? `${tier.discountPercent}% discount tier` : 'Standard'
    };
  }

  /**
   * Show ROI for buying TTX
   */
  calculateTTXInvestmentROI(ttxAmount, ttxPrice, monthlyPlatformRevenue) {
    const investmentCost = ttxAmount * ttxPrice;
    const earnings = this.calculateUserMonthlyEarnings(ttxAmount, monthlyPlatformRevenue);
    
    const monthlyROI = (earnings.monthlyEarnings / investmentCost) * 100;
    const annualROI = (earnings.annualEarnings / investmentCost) * 100;
    const paybackMonths = investmentCost / earnings.monthlyEarnings;
    
    return {
      investment: investmentCost,
      monthlyEarnings: earnings.monthlyEarnings,
      annualEarnings: earnings.annualEarnings,
      monthlyROI: monthlyROI.toFixed(2),
      annualROI: annualROI.toFixed(2),
      paybackMonths: paybackMonths.toFixed(1),
      message: `Buy ${ttxAmount} TTX for $${investmentCost} → Earn $${earnings.monthlyEarnings.toFixed(2)}/month (${annualROI.toFixed(1)}% annual ROI)`
    };
  }
}

module.exports = new RevenueStreamService();
