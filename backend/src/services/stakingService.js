const StakingPosition = require('../models/StakingPosition');
const { User, Token, Wallet, Transaction } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * STAKING SERVICE - Auto-Compounding Passive Income + Dividend Mining
 * 
 * Lock Period -> APY -> Benefits:
 * - 30 days   -> 8%  -> Flexible, quick unlock
 * - 90 days   -> 12% -> Quarterly earnings
 * - 180 days  -> 15% -> Semi-annual commitment
 * - 365 days  -> 20% -> Maximum returns
 * 
 * DIVIDEND MINING:
 * - Stake RWA tokens (stocks, bonds) -> Earn DOUBLE income
 * - Get underlying asset dividends PLUS staking APY
 * - Example: Stake AAPL -> 0.52% dividends + 15% APY = 15.52% total yield
 * 
 * Features:
 * - Auto-compounding rewards (70% to stakers)
 * - Dividend passthrough to stakers
 * - Early withdrawal with 20% penalty
 * - Penalties redistributed to other stakers
 * - Real-time APY calculations
 */

class StakingService {
  // APY rates based on lock period
  static APY_RATES = {
    '30': 8,
    '90': 12,
    '180': 15,
    '365': 20
  };

  static EARLY_WITHDRAWAL_PENALTY = 0.20; // 20% penalty

  /**
   * Create a new staking position
   */
  async stake(userId, tokenId, amount, lockPeriod, autoCompound = true) {
    const transaction = await sequelize.transaction();

    try {
      // Validate amount
      if (amount <= 0) {
        throw new Error('Staking amount must be greater than 0');
      }

      // Validate lock period
      if (!StakingService.APY_RATES[lockPeriod]) {
        throw new Error('Invalid lock period');
      }

      // Check user's wallet balance
      const wallet = await Wallet.findOne({
        where: { userId, tokenId },
        transaction
      });

      if (!wallet || parseFloat(wallet.balance) < amount) {
        throw new Error('Insufficient balance');
      }

      // Get token details
      const token = await Token.findByPk(tokenId, { transaction });
      if (!token) {
        throw new Error('Token not found');
      }

      // Deduct from wallet and get balances
      const balanceBefore = parseFloat(wallet.balance);
      await wallet.update({
        balance: sequelize.literal(`balance - ${amount}`)
      }, { transaction });
      const balanceAfter = balanceBefore - amount;

      // Calculate unlock date
      const stakedAt = new Date();
      const unlockAt = new Date(stakedAt);
      unlockAt.setDate(unlockAt.getDate() + parseInt(lockPeriod));

      // Create staking position
      const position = await StakingPosition.create({
        userId,
        tokenId,
        amount,
        lockPeriod,
        apy: StakingService.APY_RATES[lockPeriod],
        stakedAt,
        unlockAt,
        autoCompound,
        status: 'active'
      }, { transaction });

      // Create transaction record
      await Transaction.create({
        userId,
        tokenId,
        type: 'transfer',
        amount,
        balanceBefore,
        balanceAfter,
        status: 'completed',
        reference: `stake_${position.id}`,
        notes: `Staked ${amount} for ${lockPeriod} days at ${StakingService.APY_RATES[lockPeriod]}% APY`
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        position,
        message: `Successfully staked ${amount} ${token.symbol} for ${lockPeriod} days at ${StakingService.APY_RATES[lockPeriod]}% APY`
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Calculate current rewards for a position
   */
  async calculateRewards(positionId) {
    const position = await StakingPosition.findByPk(positionId, {
      include: [{ model: Token }]
    });

    if (!position) {
      throw new Error('Staking position not found');
    }

    const now = new Date();
    const stakedDuration = (now - new Date(position.lastRewardCalculation)) / (1000 * 60 * 60 * 24); // days
    
    // Calculate rewards: (amount * APY * days) / 365
    const dailyRate = parseFloat(position.apy) / 100 / 365;
    const newRewards = parseFloat(position.amount) * dailyRate * stakedDuration;

    return {
      newRewards,
      totalRewards: parseFloat(position.rewardsAccumulated) + newRewards,
      position
    };
  }

  /**
   * Update and compound rewards for all active positions
   * Called by cron job daily
   */
  async updateAllRewards() {
    const activePositions = await StakingPosition.findAll({
      where: { status: 'active' }
    });

    let totalUpdated = 0;
    let totalRewardsDistributed = 0;

    for (const position of activePositions) {
      try {
        const { newRewards } = await this.calculateRewards(position.id);
        
        if (newRewards > 0) {
          const updates = {
            rewardsAccumulated: sequelize.literal(`rewards_accumulated + ${newRewards}`),
            lastRewardCalculation: new Date()
          };

          // Auto-compound if enabled
          if (position.autoCompound) {
            updates.amount = sequelize.literal(`amount + ${newRewards}`);
          }

          await position.update(updates);
          totalUpdated++;
          totalRewardsDistributed += newRewards;
        }
      } catch (error) {
        console.error(`Error updating rewards for position ${position.id}:`, error);
      }
    }

    return {
      updated: totalUpdated,
      totalRewardsDistributed
    };
  }

  /**
   * Unstake tokens (after lock period)
   */
  async unstake(userId, positionId) {
    const transaction = await sequelize.transaction();

    try {
      const position = await StakingPosition.findOne({
        where: { id: positionId, userId },
        include: [{ model: Token }],
        transaction
      });

      if (!position) {
        throw new Error('Staking position not found');
      }

      if (position.status !== 'active') {
        throw new Error('Position is not active');
      }

      const now = new Date();
      const unlockDate = new Date(position.unlockAt);

      if (now < unlockDate) {
        throw new Error('Lock period not yet complete. Use emergency withdrawal if needed.');
      }

      // Calculate final rewards
      const { newRewards } = await this.calculateRewards(positionId);
      const totalAmount = parseFloat(position.amount) + newRewards;

      // Get wallet
      const wallet = await Wallet.findOne({
        where: { userId, tokenId: position.tokenId },
        transaction
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Return to wallet
      const balanceBefore = parseFloat(wallet.balance);
      await wallet.update({
        balance: sequelize.literal(`balance + ${totalAmount}`)
      }, { transaction });
      const balanceAfter = balanceBefore + totalAmount;

      // Update position
      await position.update({
        status: 'withdrawn',
        rewardsAccumulated: sequelize.literal(`rewards_accumulated + ${newRewards}`)
      }, { transaction });

      // Create transaction record
      await Transaction.create({
        userId,
        tokenId: position.tokenId,
        type: 'transfer',
        amount: totalAmount,
        balanceBefore,
        balanceAfter,
        status: 'completed',
        reference: `unstake_${position.id}`,
        notes: `Unstaked ${position.amount} + ${parseFloat(position.rewardsAccumulated) + newRewards} rewards`
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        principal: position.amount,
        rewards: parseFloat(position.rewardsAccumulated) + newRewards,
        total: totalAmount,
        message: `Successfully unstaked ${totalAmount} ${position.Token.symbol}`
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Emergency withdrawal (before lock period ends)
   * 20% penalty redistributed to other stakers
   */
  async emergencyWithdraw(userId, positionId) {
    const transaction = await sequelize.transaction();

    try {
      const position = await StakingPosition.findOne({
        where: { id: positionId, userId },
        include: [{ model: Token }],
        transaction
      });

      if (!position) {
        throw new Error('Staking position not found');
      }

      if (position.status !== 'active') {
        throw new Error('Position is not active');
      }

      // Calculate penalty
      const penalty = parseFloat(position.amount) * StakingService.EARLY_WITHDRAWAL_PENALTY;
      const amountToReturn = parseFloat(position.amount) - penalty;

      // Get wallet
      const wallet = await Wallet.findOne({
        where: { userId, tokenId: position.tokenId },
        transaction
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Return to wallet (minus penalty)
      const balanceBefore = parseFloat(wallet.balance);
      await wallet.update({
        balance: sequelize.literal(`balance + ${amountToReturn}`)
      }, { transaction });
      const balanceAfter = balanceBefore + amountToReturn;

      // Update position
      await position.update({
        status: 'emergency_withdrawn',
        penaltyPaid: penalty
      }, { transaction });

      // Redistribute penalty to other stakers (bonus rewards pool)
      await this.redistributePenalty(position.tokenId, penalty, transaction);

      // Create transaction record
      await Transaction.create({
        userId,
        tokenId: position.tokenId,
        type: 'transfer',
        amount: amountToReturn,
        balanceBefore,
        balanceAfter,
        status: 'completed',
        reference: `emergency_withdraw_${position.id}`,
        notes: `Emergency withdrawal with ${StakingService.EARLY_WITHDRAWAL_PENALTY * 100}% penalty (${penalty})`
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        returned: amountToReturn,
        penalty,
        message: `Emergency withdrawal completed. ${penalty} ${position.Token.symbol} penalty redistributed to other stakers.`
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Redistribute penalty rewards to all active stakers of this token
   */
  async redistributePenalty(tokenId, penaltyAmount, transaction) {
    // Get all active staking positions for this token
    const activeStakers = await StakingPosition.findAll({
      where: {
        tokenId,
        status: 'active'
      },
      transaction
    });

    if (activeStakers.length === 0) return;

    // Calculate total staked amount
    const totalStaked = activeStakers.reduce((sum, pos) => sum + parseFloat(pos.amount), 0);

    // Distribute penalty proportionally
    for (const staker of activeStakers) {
      const proportion = parseFloat(staker.amount) / totalStaked;
      const reward = penaltyAmount * proportion;

      await staker.update({
        rewardsAccumulated: sequelize.literal(`rewards_accumulated + ${reward}`)
      }, { transaction });
    }
  }

  /**
   * Get user's staking positions
   */
  async getUserPositions(userId) {
    const positions = await StakingPosition.findAll({
      where: { userId },
      include: [{
        model: Token,
        attributes: ['id', 'symbol', 'name', 'currentPrice']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Calculate current rewards for each
    const positionsWithRewards = await Promise.all(
      positions.map(async (pos) => {
        if (pos.status === 'active') {
          const { newRewards, totalRewards } = await this.calculateRewards(pos.id);
          return {
            ...pos.toJSON(),
            currentRewards: totalRewards,
            projectedTotal: parseFloat(pos.amount) + totalRewards
          };
        }
        return pos.toJSON();
      })
    );

    return positionsWithRewards;
  }

  /**
   * Get staking statistics
   */
  async getStats(userId = null) {
    const where = userId ? { userId } : {};

    const [totalStaked, totalRewards, activePositions] = await Promise.all([
      StakingPosition.sum('amount', { where: { ...where, status: 'active' } }),
      StakingPosition.sum('rewardsAccumulated', { where }),
      StakingPosition.count({ where: { ...where, status: 'active' } })
    ]);

    return {
      totalStaked: totalStaked || 0,
      totalRewards: totalRewards || 0,
      activePositions,
      apyRates: StakingService.APY_RATES
    };
  }

  /**
   * DIVIDEND MINING: Distribute dividends to stakers of RWA tokens
   * Called when automated dividend payments execute
   */
  async distributeDividendsToStakers(tokenId, totalDividendAmount) {
    try {
      // Get all active staking positions for this token
      const stakingPositions = await StakingPosition.findAll({
        where: {
          tokenId,
          status: 'active'
        }
      });

      if (stakingPositions.length === 0) {
        return {
          success: true,
          distributed: 0,
          message: 'No stakers for this token'
        };
      }

      // Calculate total staked amount
      const totalStaked = stakingPositions.reduce(
        (sum, pos) => sum + parseFloat(pos.amount),
        0
      );

      let totalDistributed = 0;

      // Distribute dividends proportionally to each staker
      for (const position of stakingPositions) {
        const proportion = parseFloat(position.amount) / totalStaked;
        const dividendShare = totalDividendAmount * proportion;

        // Add dividend to rewards (separate from APY rewards)
        await position.update({
          rewardsAccumulated: sequelize.literal(
            `rewards_accumulated + ${dividendShare}`
          )
        });

        totalDistributed += dividendShare;
      }

      return {
        success: true,
        distributed: totalDistributed,
        recipients: stakingPositions.length,
        message: `Distributed ${totalDistributed} in dividends to ${stakingPositions.length} stakers`
      };
    } catch (error) {
      console.error('Error distributing dividends to stakers:', error);
      throw error;
    }
  }
}

module.exports = new StakingService();
