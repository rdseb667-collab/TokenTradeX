const UserReward = require('../models/UserReward');
const { User } = require('../models');
const logger = require('./logger');

const REWARD_AMOUNTS = {
  // FREE rewards for everyone
  daily_login: 10, // 10 TTX per day just for logging in
  first_trade: 100, // 100 TTX for first trade
  trading_volume_tier1: 5, // Per $100 traded (0-$10K)
  trading_volume_tier2: 10, // Per $100 traded ($10K-$100K)
  trading_volume_tier3: 20, // Per $100 traded ($100K+)
  referral_signup: 50, // When someone you refer signs up
  referral_trade: 25, // When referral makes first trade
  milestone_10_trades: 500, // Hit 10 trades
  milestone_100_trades: 2000, // Hit 100 trades
};

class RewardService {
  // Daily login reward - FREE TTX just for showing up!
  async giveDailyLoginReward(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if already claimed today
      const existingReward = await UserReward.findOne({
        where: {
          userId,
          rewardType: 'daily_login',
          createdAt: {
            [require('sequelize').Op.gte]: today
          }
        }
      });

      if (existingReward) {
        return { 
          success: false, 
          message: 'Already claimed today',
          nextClaimAt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      }

      // Give reward
      const reward = await UserReward.create({
        userId,
        rewardType: 'daily_login',
        amount: REWARD_AMOUNTS.daily_login,
        description: `Daily login bonus: ${REWARD_AMOUNTS.daily_login} TTX`,
        claimed: true,
        claimedAt: new Date()
      });

      logger.info('Daily login reward given', { userId, amount: REWARD_AMOUNTS.daily_login });

      return {
        success: true,
        reward,
        message: `You earned ${REWARD_AMOUNTS.daily_login} TTX for logging in today! 🎁`
      };
    } catch (error) {
      logger.error('Error giving daily login reward', { error: error.message, userId });
      throw error;
    }
  }

  // Trading volume rewards - Earn while you trade!
  async giveTradingVolumeReward(userId, tradeVolume) {
    try {
      const user = await User.findByPk(userId);
      const totalVolume = parseFloat(user.totalTradingVolume || 0);

      let rewardRate;
      if (totalVolume < 10000) {
        rewardRate = REWARD_AMOUNTS.trading_volume_tier1;
      } else if (totalVolume < 100000) {
        rewardRate = REWARD_AMOUNTS.trading_volume_tier2;
      } else {
        rewardRate = REWARD_AMOUNTS.trading_volume_tier3;
      }

      const rewardAmount = (tradeVolume / 100) * rewardRate;

      if (rewardAmount > 0) {
        const reward = await UserReward.create({
          userId,
          rewardType: 'trading_volume',
          amount: rewardAmount,
          description: `Trading reward: $${tradeVolume.toFixed(2)} volume = ${rewardAmount.toFixed(2)} TTX`,
          claimed: true,
          claimedAt: new Date()
        });

        logger.info('Trading volume reward given', { userId, volume: tradeVolume, amount: rewardAmount });

        return {
          success: true,
          reward,
          message: `You earned ${rewardAmount.toFixed(2)} TTX from trading! 📈`
        };
      }

      return { success: false, message: 'No reward earned' };
    } catch (error) {
      logger.error('Error giving trading volume reward', { error: error.message, userId });
      throw error;
    }
  }

  // Milestone rewards
  async checkAndGiveMilestoneRewards(userId) {
    try {
      const user = await User.findByPk(userId);
      const totalTrades = await this.getUserTotalTrades(userId);

      const rewards = [];

      // 10 trades milestone
      if (totalTrades === 10) {
        const reward = await UserReward.create({
          userId,
          rewardType: 'milestone',
          amount: REWARD_AMOUNTS.milestone_10_trades,
          description: `Milestone: 10 trades completed! ${REWARD_AMOUNTS.milestone_10_trades} TTX`,
          claimed: false
        });
        rewards.push(reward);
      }

      // 100 trades milestone
      if (totalTrades === 100) {
        const reward = await UserReward.create({
          userId,
          rewardType: 'milestone',
          amount: REWARD_AMOUNTS.milestone_100_trades,
          description: `Milestone: 100 trades completed! ${REWARD_AMOUNTS.milestone_100_trades} TTX`,
          claimed: false
        });
        rewards.push(reward);
      }

      return { success: true, rewards };
    } catch (error) {
      logger.error('Error checking milestone rewards', { error: error.message, userId });
      throw error;
    }
  }

  // Get all unclaimed rewards
  async getUnclaimedRewards(userId) {
    try {
      const rewards = await UserReward.findAll({
        where: {
          userId,
          claimed: false
        },
        order: [['createdAt', 'DESC']]
      });

      const total = rewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);

      return {
        success: true,
        rewards,
        totalUnclaimed: total
      };
    } catch (error) {
      logger.error('Error getting unclaimed rewards', { error: error.message, userId });
      throw error;
    }
  }

  // Claim all pending rewards
  async claimAllRewards(userId) {
    try {
      const unclaimed = await UserReward.findAll({
        where: {
          userId,
          claimed: false
        }
      });

      const total = unclaimed.reduce((sum, r) => sum + parseFloat(r.amount), 0);

      await UserReward.update(
        { 
          claimed: true, 
          claimedAt: new Date() 
        },
        {
          where: {
            userId,
            claimed: false
          }
        }
      );

      logger.info('All rewards claimed', { userId, amount: total, count: unclaimed.length });

      return {
        success: true,
        totalClaimed: total,
        rewardCount: unclaimed.length,
        message: `Claimed ${total.toFixed(2)} TTX! 🎉`
      };
    } catch (error) {
      logger.error('Error claiming rewards', { error: error.message, userId });
      throw error;
    }
  }

  // Get reward stats
  async getRewardStats(userId) {
    try {
      const allRewards = await UserReward.findAll({
        where: { userId }
      });

      const totalEarned = allRewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const totalClaimed = allRewards
        .filter(r => r.claimed)
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const totalUnclaimed = totalEarned - totalClaimed;

      const rewardsByType = {};
      allRewards.forEach(r => {
        if (!rewardsByType[r.rewardType]) {
          rewardsByType[r.rewardType] = 0;
        }
        rewardsByType[r.rewardType] += parseFloat(r.amount);
      });

      return {
        success: true,
        stats: {
          totalEarned,
          totalClaimed,
          totalUnclaimed,
          rewardsByType,
          rewardCount: allRewards.length
        }
      };
    } catch (error) {
      logger.error('Error getting reward stats', { error: error.message, userId });
      throw error;
    }
  }

  async getUserTotalTrades(userId) {
    const { Order } = require('../models');
    const count = await Order.count({
      where: {
        userId,
        status: 'filled'
      }
    });
    return count;
  }
}

module.exports = new RewardService();
