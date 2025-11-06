const { User, Wallet, Token, Transaction } = require('../models');
const { sequelize } = require('../config/database');
const logger = require('./logger');

/**
 * Referral & Reward Service
 * Viral growth mechanism - users earn TTX for referring friends
 */
class ReferralService {
  constructor() {
    this.rewards = {
      newUserSignup: 100,        // 100 TTX for signing up
      referrerBonus: 500,        // 500 TTX for each referral
      firstTrade: 250,           // 250 TTX for first trade
      tradingMilestone1k: 1000,  // 1000 TTX at $1k volume
      tradingMilestone10k: 5000, // 5000 TTX at $10k volume
      tradingMilestone100k: 25000 // 25000 TTX at $100k volume
    };
  }

  /**
   * Generate unique referral code for user
   */
  generateReferralCode(userId) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return `TTX${code}`;
  }

  /**
   * Reward new user signup
   */
  async rewardNewUser(userId, referralCode = null) {
    const transaction = await sequelize.transaction();
    
    try {
      const user = await User.findByPk(userId);
      const ttxToken = await Token.findOne({ where: { symbol: 'TTX' } });
      
      if (!ttxToken) {
        await transaction.rollback();
        return { success: false, message: 'TTX token not found' };
      }

      // Get or create TTX wallet
      let wallet = await Wallet.findOne({
        where: { userId, tokenId: ttxToken.id },
        transaction
      });

      if (!wallet) {
        wallet = await Wallet.create({
          userId,
          tokenId: ttxToken.id,
          balance: 0,
          lockedBalance: 0
        }, { transaction });
      }

      // Award signup bonus
      const signupBonus = this.rewards.newUserSignup;
      const newBalance = parseFloat(wallet.balance) + signupBonus;
      
      await wallet.update({ balance: newBalance }, { transaction });

      // Record transaction
      await Transaction.create({
        userId,
        tokenId: ttxToken.id,
        type: 'transfer',
        amount: signupBonus,
        balanceBefore: parseFloat(wallet.balance),
        balanceAfter: newBalance,
        status: 'completed',
        notes: 'Welcome bonus - New user signup reward'
      }, { transaction });

      // If user was referred, reward the referrer
      if (referralCode) {
        const referrer = await User.findOne({ 
          where: { referralCode },
          transaction 
        });

        if (referrer) {
          await this.rewardReferrer(referrer.id, userId, transaction);
        }
      }

      await transaction.commit();

      logger.info('New user rewarded', { userId, amount: signupBonus });

      return {
        success: true,
        reward: signupBonus,
        message: `Welcome! You received ${signupBonus} TTX tokens!`
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to reward new user', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Reward user who referred someone
   */
  async rewardReferrer(referrerId, newUserId, transaction) {
    const ttxToken = await Token.findOne({ where: { symbol: 'TTX' } });
    
    let wallet = await Wallet.findOne({
      where: { userId: referrerId, tokenId: ttxToken.id },
      transaction
    });

    if (!wallet) {
      wallet = await Wallet.create({
        userId: referrerId,
        tokenId: ttxToken.id,
        balance: 0,
        lockedBalance: 0
      }, { transaction });
    }

    const referralBonus = this.rewards.referrerBonus;
    const newBalance = parseFloat(wallet.balance) + referralBonus;
    
    await wallet.update({ balance: newBalance }, { transaction });

    await Transaction.create({
      userId: referrerId,
      tokenId: ttxToken.id,
      type: 'transfer',
      amount: referralBonus,
      balanceBefore: parseFloat(wallet.balance),
      balanceAfter: newBalance,
      status: 'completed',
      notes: `Referral bonus - Referred user ${newUserId}`
    }, { transaction });

    logger.info('Referrer rewarded', { 
      referrerId, 
      newUserId, 
      amount: referralBonus 
    });
  }

  /**
   * Reward first trade milestone
   */
  async rewardFirstTrade(userId) {
    const transaction = await sequelize.transaction();
    
    try {
      const ttxToken = await Token.findOne({ where: { symbol: 'TTX' } });
      
      let wallet = await Wallet.findOne({
        where: { userId, tokenId: ttxToken.id },
        transaction
      });

      if (!wallet) {
        wallet = await Wallet.create({
          userId,
          tokenId: ttxToken.id,
          balance: 0,
          lockedBalance: 0
        }, { transaction });
      }

      const bonus = this.rewards.firstTrade;
      const newBalance = parseFloat(wallet.balance) + bonus;
      
      await wallet.update({ balance: newBalance }, { transaction });

      await Transaction.create({
        userId,
        tokenId: ttxToken.id,
        type: 'transfer',
        amount: bonus,
        balanceBefore: parseFloat(wallet.balance),
        balanceAfter: newBalance,
        status: 'completed',
        notes: 'First trade milestone reward'
      }, { transaction });

      await transaction.commit();

      logger.info('First trade rewarded', { userId, amount: bonus });

      return {
        success: true,
        reward: bonus,
        message: `Congratulations! You earned ${bonus} TTX for your first trade!`
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to reward first trade', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Check and reward trading volume milestones
   */
  async checkTradingMilestones(userId, totalVolume) {
    const milestones = [
      { volume: 1000, reward: this.rewards.tradingMilestone1k, name: '$1K' },
      { volume: 10000, reward: this.rewards.tradingMilestone10k, name: '$10K' },
      { volume: 100000, reward: this.rewards.tradingMilestone100k, name: '$100K' }
    ];

    const rewards = [];

    for (const milestone of milestones) {
      if (totalVolume >= milestone.volume) {
        // Check if user already received this milestone
        const existing = await Transaction.findOne({
          where: {
            userId,
            notes: `Trading volume milestone - ${milestone.name}`
          }
        });

        if (!existing) {
          const result = await this.rewardMilestone(
            userId, 
            milestone.reward, 
            milestone.name
          );
          if (result.success) {
            rewards.push(result);
          }
        }
      }
    }

    return rewards;
  }

  /**
   * Award milestone reward
   */
  async rewardMilestone(userId, amount, milestoneName) {
    const transaction = await sequelize.transaction();
    
    try {
      const ttxToken = await Token.findOne({ where: { symbol: 'TTX' } });
      
      let wallet = await Wallet.findOne({
        where: { userId, tokenId: ttxToken.id },
        transaction
      });

      if (!wallet) {
        wallet = await Wallet.create({
          userId,
          tokenId: ttxToken.id,
          balance: 0,
          lockedBalance: 0
        }, { transaction });
      }

      const newBalance = parseFloat(wallet.balance) + amount;
      
      await wallet.update({ balance: newBalance }, { transaction });

      await Transaction.create({
        userId,
        tokenId: ttxToken.id,
        type: 'transfer',
        amount,
        balanceBefore: parseFloat(wallet.balance),
        balanceAfter: newBalance,
        status: 'completed',
        notes: `Trading volume milestone - ${milestoneName}`
      }, { transaction });

      await transaction.commit();

      logger.info('Milestone rewarded', { userId, milestone: milestoneName, amount });

      return {
        success: true,
        reward: amount,
        milestone: milestoneName,
        message: `🎉 Milestone unlocked! You earned ${amount} TTX for reaching ${milestoneName} trading volume!`
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to reward milestone', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get referral stats for user
   */
  async getReferralStats(userId) {
    const user = await User.findByPk(userId);
    
    if (!user || !user.referralCode) {
      return null;
    }

    // Count referrals
    const referrals = await User.count({
      where: { referredBy: user.referralCode }
    });

    // Calculate earnings from referrals
    const referralEarnings = referrals * this.rewards.referrerBonus;

    return {
      referralCode: user.referralCode,
      totalReferrals: referrals,
      referralEarnings,
      potentialBonus: this.rewards.referrerBonus,
      shareUrl: `https://tokentradex.com/signup?ref=${user.referralCode}`
    };
  }
}

module.exports = new ReferralService();
