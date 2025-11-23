const { UserReward, Token, Wallet, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Trading Mining Service
 * Awards TTX tokens based on trading volume with anti-abuse measures
 */

class TradingMiningService {
  constructor() {
    // Mining rates per $100 traded
    this.rates = {
      tier1: { min: 0, max: 10000, reward: 5 },      // 0-10K: 5 TTX per $100
      tier2: { min: 10000, max: 100000, reward: 10 }, // 10K-100K: 10 TTX per $100
      tier3: { min: 100000, max: Infinity, reward: 20 } // 100K+: 20 TTX per $100
    };
    
    // Daily cap per user
    this.dailyCap = 200; // max 200 TTX per day from mining
  }

  /**
   * Calculate mining reward for a trade
   */
  async calculateReward(userId, tradeVolume) {
    try {
      // Get user's 24h volume
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const dailyVolume = await this.getUserDailyVolume(userId);
      
      // Check daily cap
      const earnedToday = await this.getUserDailyMining(userId);
      if (earnedToday >= this.dailyCap) {
        return { reward: 0, reason: 'Daily cap reached', cap: this.dailyCap };
      }

      // Determine tier
      const tier = this.getTier(dailyVolume + tradeVolume);
      const rewardRate = tier.reward;

      // Calculate reward
      const baseReward = (tradeVolume / 100) * rewardRate;
      const cappedReward = Math.min(baseReward, this.dailyCap - earnedToday);

      return {
        reward: cappedReward,
        tier: tier,
        dailyEarned: earnedToday,
        dailyCap: this.dailyCap,
        volume: tradeVolume
      };
    } catch (error) {
      console.error('Error calculating mining reward:', error);
      return { reward: 0, reason: 'Error calculating reward' };
    }
  }

  /**
   * Award mining reward to user
   */
  async awardReward(userId, tradeVolume, tradeId) {
    try {
      const calculation = await this.calculateReward(userId, tradeVolume);
      
      if (calculation.reward <= 0) {
        return { success: false, ...calculation };
      }

      // Get TTX token
      const ttxToken = await Token.findOne({ where: { symbol: 'TTX' } });
      if (!ttxToken) {
        return { success: false, reason: 'TTX token not found' };
      }

      // Award TTX to user's wallet
      const [wallet] = await Wallet.findOrCreate({
        where: { userId, tokenId: ttxToken.id },
        defaults: { balance: 0, lockedBalance: 0 }
      });

      await wallet.increment('balance', { by: calculation.reward });

      // Record reward
      await UserReward.create({
        userId,
        rewardType: 'trading_volume',
        amount: calculation.reward,
        description: `Mining reward for $${tradeVolume.toFixed(2)} trade`,
        metadata: {
          tradeId,
          volume: tradeVolume,
          tier: calculation.tier,
          dailyEarned: calculation.dailyEarned
        }
      });

      return {
        success: true,
        reward: calculation.reward,
        tier: calculation.tier,
        message: `Earned ${calculation.reward.toFixed(2)} TTX from trading!`
      };
    } catch (error) {
      console.error('Error awarding mining reward:', error);
      return { success: false, reason: 'Error awarding reward' };
    }
  }

  /**
   * Get user's daily trading volume
   */
  async getUserDailyVolume(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { Order } = require('../models');
      const orders = await Order.findAll({
        where: {
          userId,
          status: 'filled',
          updatedAt: { [Op.gte]: today }
        }
      });

      return orders.reduce((sum, order) => {
        return sum + (parseFloat(order.price) * parseFloat(order.filledQuantity || order.quantity));
      }, 0);
    } catch (error) {
      console.error('Error getting daily volume:', error);
      return 0;
    }
  }

  /**
   * Get user's daily mining earnings
   */
  async getUserDailyMining(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const rewards = await UserReward.findAll({
        where: {
          userId,
          rewardType: 'trading_volume',
          createdAt: { [Op.gte]: today }
        }
      });

      return rewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    } catch (error) {
      console.error('Error getting daily mining:', error);
      return 0;
    }
  }

  /**
   * Get tier based on volume
   */
  getTier(volume) {
    if (volume >= this.rates.tier3.min) return this.rates.tier3;
    if (volume >= this.rates.tier2.min) return this.rates.tier2;
    return this.rates.tier1;
  }

  /**
   * Get user's mining summary
   */
  async getUserSummary(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const [dailyMining, monthlyMining, dailyVolume] = await Promise.all([
        this.getUserDailyMining(userId),
        UserReward.sum('amount', {
          where: {
            userId,
            rewardType: 'trading_volume',
            createdAt: { [Op.gte]: thisMonth }
          }
        }),
        this.getUserDailyVolume(userId)
      ]);

      const tier = this.getTier(dailyVolume);

      return {
        dailyMining: dailyMining || 0,
        monthlyMining: monthlyMining || 0,
        dailyCap: this.dailyCap,
        dailyVolume,
        currentTier: tier,
        nextReward: `${tier.reward} TTX per $100 traded`
      };
    } catch (error) {
      console.error('Error getting mining summary:', error);
      return null;
    }
  }
}

module.exports = new TradingMiningService();
