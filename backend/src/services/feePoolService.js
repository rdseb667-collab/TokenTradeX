const FeePool = require('../models/FeePool');
const FeePoolTransaction = require('../models/FeePoolTransaction');
const { sequelize } = require('../config/database');
const logger = require('./logger');

/**
 * FeePoolService - Manages the 40/30/20/10 fee distribution to pools
 * Handles the 85% platform share from total trading fees
 */
class FeePoolService {
  constructor() {
    // Pool IDs
    this.POOLS = {
      STAKING: 0,
      LIQUIDITY: 1,
      TREASURY: 2,
      DEVELOPMENT: 3
    };

    // Allocation percentages (must sum to 100%)
    this.ALLOCATIONS = {
      [this.POOLS.STAKING]: 40.0,      // 40% to staking rewards
      [this.POOLS.LIQUIDITY]: 30.0,    // 30% to liquidity incentives
      [this.POOLS.TREASURY]: 20.0,     // 20% to treasury/reserves
      [this.POOLS.DEVELOPMENT]: 10.0   // 10% to development fund
    };
  }

  /**
   * Initialize fee pools in database (one-time setup)
   */
  async initializePools() {
    const transaction = await sequelize.transaction();
    
    try {
      const pools = [
        {
          id: this.POOLS.STAKING,
          name: 'Staking Rewards',
          description: 'Pool for TTX staking rewards distribution',
          allocationPercentage: this.ALLOCATIONS[this.POOLS.STAKING],
          totalCollected: 0,
          totalDistributed: 0,
          availableBalance: 0,
          isActive: true
        },
        {
          id: this.POOLS.LIQUIDITY,
          name: 'Liquidity Mining',
          description: 'Pool for liquidity provider incentives',
          allocationPercentage: this.ALLOCATIONS[this.POOLS.LIQUIDITY],
          totalCollected: 0,
          totalDistributed: 0,
          availableBalance: 0,
          isActive: true
        },
        {
          id: this.POOLS.TREASURY,
          name: 'Treasury Reserve',
          description: 'Pool for protocol treasury and reserves',
          allocationPercentage: this.ALLOCATIONS[this.POOLS.TREASURY],
          totalCollected: 0,
          totalDistributed: 0,
          availableBalance: 0,
          isActive: true
        },
        {
          id: this.POOLS.DEVELOPMENT,
          name: 'Development Fund',
          description: 'Pool for platform development and maintenance',
          allocationPercentage: this.ALLOCATIONS[this.POOLS.DEVELOPMENT],
          totalCollected: 0,
          totalDistributed: 0,
          availableBalance: 0,
          isActive: true
        }
      ];

      for (const pool of pools) {
        await FeePool.upsert(pool, { transaction });
      }

      await transaction.commit();
      logger.info('✅ Fee pools initialized successfully');
      
      return { success: true, pools };
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to initialize fee pools', { error: error.message });
      throw error;
    }
  }

  /**
   * Distribute platform fees (85% of total) to pools using 40/30/20/10 split
   * @param {number} platformFees - The 85% platform share (in USD)
   * @param {string} sourceId - Trade ID or source identifier
   * @param {object} transaction - Optional Sequelize transaction
   */
  async distributeFees(platformFees, sourceId, transaction = null) {
    const t = transaction || await sequelize.transaction();
    const shouldCommit = !transaction; // Only commit if we created the transaction
    
    try {
      if (!platformFees || platformFees <= 0) {
        logger.warn('Fee distribution skipped - zero or negative amount', { platformFees });
        if (shouldCommit) await t.rollback();
        return { success: true, skipped: true, reason: 'Zero amount' };
      }

      const distributions = {};
      const poolUpdates = [];

      // Calculate and distribute to each pool
      for (const [poolId, percentage] of Object.entries(this.ALLOCATIONS)) {
        const amount = platformFees * (percentage / 100);
        
        // Get current pool balance
        const pool = await FeePool.findByPk(poolId, { 
          transaction: t,
          lock: t.LOCK.UPDATE 
        });
        
        if (!pool) {
          throw new Error(`Fee pool ${poolId} not found - run initializePools() first`);
        }

        const balanceBefore = parseFloat(pool.availableBalance);
        const balanceAfter = balanceBefore + amount;

        // Update pool balance
        await pool.increment({
          totalCollected: amount,
          availableBalance: amount
        }, { transaction: t });

        // Record transaction for transparency
        await FeePoolTransaction.create({
          poolId: parseInt(poolId),
          transactionType: 'collection',
          amount,
          balanceBefore,
          balanceAfter,
          sourceType: 'trade',
          sourceId,
          description: `Platform fee distribution (${percentage}% of ${platformFees.toFixed(2)} USD)`,
          metadata: {
            platformFees,
            percentage,
            timestamp: new Date().toISOString()
          }
        }, { transaction: t });

        distributions[pool.name] = {
          amount,
          percentage,
          newBalance: balanceAfter
        };

        poolUpdates.push({
          poolId,
          poolName: pool.name,
          amount,
          percentage
        });
      }

      if (shouldCommit) await t.commit();

      logger.info('✅ Platform fees distributed to pools', {
        sourceId,
        platformFees: platformFees.toFixed(2),
        distributions: poolUpdates
      });

      return {
        success: true,
        platformFees,
        distributions
      };

    } catch (error) {
      if (shouldCommit) await t.rollback();
      logger.error('Failed to distribute fees to pools', {
        platformFees,
        sourceId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get all pool balances
   */
  async getPoolBalances() {
    try {
      const pools = await FeePool.findAll({
        where: { isActive: true },
        order: [['id', 'ASC']]
      });

      return pools.map(pool => ({
        id: pool.id,
        name: pool.name,
        allocationPercentage: parseFloat(pool.allocationPercentage),
        totalCollected: parseFloat(pool.totalCollected),
        totalDistributed: parseFloat(pool.totalDistributed),
        availableBalance: parseFloat(pool.availableBalance)
      }));
    } catch (error) {
      logger.error('Failed to get pool balances', { error: error.message });
      throw error;
    }
  }

  /**
   * Get pool transaction history
   */
  async getPoolTransactions(poolId, limit = 50) {
    try {
      const transactions = await FeePoolTransaction.findAll({
        where: { poolId },
        order: [['createdAt', 'DESC']],
        limit
      });

      return transactions;
    } catch (error) {
      logger.error('Failed to get pool transactions', { poolId, error: error.message });
      throw error;
    }
  }
}

module.exports = new FeePoolService();
