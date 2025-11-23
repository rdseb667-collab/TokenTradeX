const { Trade, UserReward, Token, Wallet, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('./logger');

/**
 * Volume Rebate Service
 * Monthly fee rebates based on trading volume tiers
 * Pays rebates in TTX tokens
 */
class VolumeRebateService {
  constructor() {
    // Load rebate tiers from environment
    this.tiers = [
      {
        min: parseFloat(process.env.VOLUME_REBATE_TIER1_MIN || '0'),
        max: parseFloat(process.env.VOLUME_REBATE_TIER1_MAX || '10000'),
        rebatePercent: parseFloat(process.env.VOLUME_REBATE_TIER1_PERCENT || '5')
      },
      {
        min: parseFloat(process.env.VOLUME_REBATE_TIER2_MIN || '10000'),
        max: parseFloat(process.env.VOLUME_REBATE_TIER2_MAX || '50000'),
        rebatePercent: parseFloat(process.env.VOLUME_REBATE_TIER2_PERCENT || '10')
      },
      {
        min: parseFloat(process.env.VOLUME_REBATE_TIER3_MIN || '50000'),
        max: parseFloat(process.env.VOLUME_REBATE_TIER3_MAX || '250000'),
        rebatePercent: parseFloat(process.env.VOLUME_REBATE_TIER3_PERCENT || '15')
      },
      {
        min: parseFloat(process.env.VOLUME_REBATE_TIER4_MIN || '250000'),
        max: parseFloat(process.env.VOLUME_REBATE_TIER4_MAX || '999999999'),
        rebatePercent: parseFloat(process.env.VOLUME_REBATE_TIER4_PERCENT || '20')
      }
    ];
  }

  /**
   * Get rebate tier for monthly volume
   */
  getTierForVolume(volume) {
    for (const tier of this.tiers) {
      if (volume >= tier.min && volume < tier.max) {
        return tier;
      }
    }
    return this.tiers[0]; // Fallback to tier 1
  }

  /**
   * Calculate monthly rebate for a user
   * @param {string} userId - User ID
   * @param {Date} monthStart - Start of month
   * @param {Date} monthEnd - End of month
   */
  async calculateMonthlyRebate(userId, monthStart, monthEnd) {
    try {
      // Get all trades for user in this month
      const trades = await Trade.findAll({
        where: {
          [Op.or]: [
            { buyerId: userId },
            { sellerId: userId }
          ],
          executedAt: {
            [Op.gte]: monthStart,
            [Op.lt]: monthEnd
          }
        }
      });

      if (trades.length === 0) {
        return {
          userId,
          monthlyVolume: 0,
          feesPaid: 0,
          rebatePercent: 0,
          rebateAmount: 0,
          tier: this.tiers[0],
          tradeCount: 0
        };
      }

      // Calculate total volume and fees paid
      let totalVolume = 0;
      let totalFeesPaid = 0;

      trades.forEach(trade => {
        const tradeVolume = parseFloat(trade.totalValue || 0);
        totalVolume += tradeVolume;

        // Add fees paid by this user
        if (trade.buyerId === userId) {
          totalFeesPaid += parseFloat(trade.buyerFee || 0);
        }
        if (trade.sellerId === userId) {
          totalFeesPaid += parseFloat(trade.sellerFee || 0);
        }
      });

      // Get rebate tier
      const tier = this.getTierForVolume(totalVolume);
      
      // Calculate rebate amount (percentage of fees paid)
      const rebateAmount = (totalFeesPaid * tier.rebatePercent) / 100;

      logger.info('📊 Monthly rebate calculated', {
        userId,
        monthlyVolume: totalVolume,
        feesPaid: totalFeesPaid,
        rebatePercent: tier.rebatePercent,
        rebateAmount,
        tradeCount: trades.length
      });

      return {
        userId,
        monthlyVolume: totalVolume,
        feesPaid: totalFeesPaid,
        rebatePercent: tier.rebatePercent,
        rebateAmount,
        tier,
        tradeCount: trades.length
      };
    } catch (error) {
      logger.error('❌ Error calculating monthly rebate', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Distribute rebate to user wallet in TTX
   */
  async distributeRebate(userId, rebateAmountUSD, metadata = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      // Get TTX token
      const ttxToken = await Token.findOne({ 
        where: { symbol: 'TTX' },
        transaction
      });

      if (!ttxToken) {
        throw new Error('TTX token not found');
      }

      // Convert USD rebate to TTX amount (using current TTX price)
      const ttxPrice = parseFloat(ttxToken.currentPrice);
      const rebateAmountTTX = rebateAmountUSD / ttxPrice;

      // Get or create user's TTX wallet
      const [wallet] = await Wallet.findOrCreate({
        where: { userId, tokenId: ttxToken.id },
        defaults: { balance: 0, lockedBalance: 0 },
        transaction
      });

      // Add rebate to wallet
      await wallet.increment('balance', { by: rebateAmountTTX, transaction });

      // Record rebate reward
      await UserReward.create({
        userId,
        rewardType: 'volume_rebate',
        amount: rebateAmountTTX,
        description: `Monthly volume rebate: ${metadata.rebatePercent}% of $${metadata.feesPaid?.toFixed(2)} fees`,
        claimed: true,
        claimedAt: new Date(),
        metadata: {
          ...metadata,
          rebateAmountUSD,
          rebateAmountTTX,
          ttxPrice,
          month: metadata.month
        }
      }, { transaction });

      await transaction.commit();

      logger.info('✅ Rebate distributed', {
        userId,
        rebateAmountUSD,
        rebateAmountTTX,
        ttxPrice
      });

      return {
        success: true,
        rebateAmountUSD,
        rebateAmountTTX,
        ttxPrice
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('❌ Failed to distribute rebate', {
        userId,
        rebateAmountUSD,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Process monthly rebates for all active users
   * Called by cron job at end of month
   */
  async processMonthlyRebates(year, month) {
    try {
      // Calculate month boundaries
      const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const monthEnd = new Date(year, month, 1, 0, 0, 0, 0);

      logger.info('🎁 Processing monthly volume rebates', {
        year,
        month,
        monthStart,
        monthEnd
      });

      // Get all unique users who traded this month
      const trades = await Trade.findAll({
        where: {
          executedAt: {
            [Op.gte]: monthStart,
            [Op.lt]: monthEnd
          }
        },
        attributes: ['buyerId', 'sellerId'],
        raw: true
      });

      const userIds = new Set();
      trades.forEach(trade => {
        userIds.add(trade.buyerId);
        userIds.add(trade.sellerId);
      });

      logger.info(`📊 Found ${userIds.size} users to process`);

      const results = {
        total: userIds.size,
        successful: 0,
        failed: 0,
        totalRebateUSD: 0,
        totalRebateTTX: 0,
        details: []
      };

      // Process each user
      for (const userId of userIds) {
        try {
          // Calculate rebate
          const calculation = await this.calculateMonthlyRebate(userId, monthStart, monthEnd);

          // Only distribute if rebate > 0
          if (calculation.rebateAmount > 0) {
            const distribution = await this.distributeRebate(
              userId,
              calculation.rebateAmount,
              {
                month: `${year}-${String(month).padStart(2, '0')}`,
                monthlyVolume: calculation.monthlyVolume,
                feesPaid: calculation.feesPaid,
                rebatePercent: calculation.rebatePercent,
                tradeCount: calculation.tradeCount
              }
            );

            results.successful++;
            results.totalRebateUSD += calculation.rebateAmount;
            results.totalRebateTTX += distribution.rebateAmountTTX;
            results.details.push({
              userId,
              ...calculation,
              distributed: true
            });
          } else {
            results.details.push({
              userId,
              ...calculation,
              distributed: false,
              reason: 'No rebate earned'
            });
          }
        } catch (error) {
          results.failed++;
          results.details.push({
            userId,
            distributed: false,
            error: error.message
          });
          logger.error('❌ Failed to process rebate for user', {
            userId,
            error: error.message
          });
        }
      }

      logger.info('✅ Monthly rebate processing complete', {
        ...results,
        year,
        month
      });

      return results;
    } catch (error) {
      logger.error('❌ Monthly rebate processing failed', {
        year,
        month,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get user's current month progress
   */
  async getUserMonthProgress(userId) {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

      const calculation = await this.calculateMonthlyRebate(userId, monthStart, monthEnd);

      return {
        currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        ...calculation,
        tiers: this.tiers,
        nextTier: this.getNextTier(calculation.monthlyVolume)
      };
    } catch (error) {
      logger.error('❌ Error getting user month progress', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get next tier info
   */
  getNextTier(currentVolume) {
    const currentTier = this.getTierForVolume(currentVolume);
    const currentIndex = this.tiers.findIndex(t => t.rebatePercent === currentTier.rebatePercent);

    if (currentIndex < this.tiers.length - 1) {
      const nextTier = this.tiers[currentIndex + 1];
      return {
        ...nextTier,
        volumeNeeded: nextTier.min - currentVolume
      };
    }

    return null; // Already at max tier
  }

  /**
   * Get rebate statistics
   */
  async getRebateStats() {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

      const [totalRebates, monthlyRebates] = await Promise.all([
        UserReward.sum('amount', {
          where: { rewardType: 'volume_rebate' }
        }),
        UserReward.sum('amount', {
          where: {
            rewardType: 'volume_rebate',
            createdAt: { [Op.gte]: monthStart }
          }
        })
      ]);

      return {
        totalRebatesPaid: totalRebates || 0,
        monthlyRebatesPaid: monthlyRebates || 0,
        tiers: this.tiers
      };
    } catch (error) {
      logger.error('❌ Error getting rebate stats', { error: error.message });
      throw error;
    }
  }
}

module.exports = new VolumeRebateService();
