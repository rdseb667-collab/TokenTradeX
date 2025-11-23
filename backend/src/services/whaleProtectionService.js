const { Wallet, Order, Token, Transaction } = require('../models');
const { Op } = require('sequelize');

class WhaleProtectionService {
  constructor() {
    // Configuration limits
    this.LIMITS = {
      // Position limits (% of total supply)
      MAX_WALLET_PERCENTAGE: 5, // No wallet can hold >5% of any token
      
      // Withdrawal limits (USD)
      DAILY_WITHDRAWAL_REGULAR: 50000,
      DAILY_WITHDRAWAL_VERIFIED: 500000,
      
      // Large withdrawal delays (hours)
      DELAY_10K: 0,
      DELAY_100K: 24,
      DELAY_500K: 48,
      
      // Circuit breaker (% price change in 5 min)
      CIRCUIT_BREAKER_THRESHOLD: 15,
      CIRCUIT_BREAKER_DURATION: 5 * 60 * 1000, // 5 minutes
      
      // Whale detection threshold (USD)
      WHALE_THRESHOLD: 100000
    };
    
    this.circuitBreakers = {}; // Track active circuit breakers by tokenId
  }

  /**
   * Check if wallet can hold more of this token
   * @param {string} userId - User ID
   * @param {string} tokenId - Token ID
   * @param {number} additionalAmount - Amount to add
   * @param {string} userRole - User role (super_admin, admin, user)
   */
  async checkPositionLimit(userId, tokenId, additionalAmount, userRole = 'user') {
    try {
      // Super admins bypass whale protection limits
      if (userRole === 'super_admin') {
        console.log('🔓 Super admin bypassing whale protection');
        return { allowed: true, exempted: true };
      }

      const token = await Token.findByPk(tokenId);
      if (!token) throw new Error('Token not found');

      const wallet = await Wallet.findOne({
        where: { userId, tokenId }
      });

      const currentBalance = wallet ? parseFloat(wallet.balance) : 0;
      const newBalance = currentBalance + parseFloat(additionalAmount);
      const totalSupply = parseFloat(token.totalSupply);
      
      const maxAllowedBalance = (totalSupply * this.LIMITS.MAX_WALLET_PERCENTAGE) / 100;
      const percentageOfSupply = (newBalance / totalSupply) * 100;

      if (percentageOfSupply > this.LIMITS.MAX_WALLET_PERCENTAGE) {
        // Calculate how much MORE they can buy (never negative)
        const remainingCapacity = Math.max(0, maxAllowedBalance - currentBalance);
        
        return {
          allowed: false,
          reason: `Position limit exceeded. Maximum ${this.LIMITS.MAX_WALLET_PERCENTAGE}% of token supply per wallet`,
          maxAllowed: remainingCapacity
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Position limit check error:', error);
      return { allowed: false, reason: 'Error checking position limits' };
    }
  }

  /**
   * Check withdrawal limits and required delays
   */
  async checkWithdrawalLimit(userId, amount, isVerified = false) {
    try {
      const amountUSD = parseFloat(amount);
      
      // Check 24h withdrawal total
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentWithdrawals = await Transaction.sum('amount', {
        where: {
          userId,
          type: 'withdrawal',
          createdAt: { [Op.gte]: last24h },
          status: { [Op.in]: ['completed', 'pending'] }
        }
      });

      const totalWithdrawn = recentWithdrawals || 0;
      const dailyLimit = isVerified 
        ? this.LIMITS.DAILY_WITHDRAWAL_VERIFIED 
        : this.LIMITS.DAILY_WITHDRAWAL_REGULAR;

      if (totalWithdrawn + amountUSD > dailyLimit) {
        return {
          allowed: false,
          reason: `Daily withdrawal limit exceeded. Limit: $${dailyLimit.toLocaleString()}`,
          remaining: Math.max(0, dailyLimit - totalWithdrawn)
        };
      }

      // Calculate required delay
      let delayHours = 0;
      if (amountUSD >= 500000) {
        delayHours = this.LIMITS.DELAY_500K;
      } else if (amountUSD >= 100000) {
        delayHours = this.LIMITS.DELAY_100K;
      } else if (amountUSD >= 10000) {
        delayHours = this.LIMITS.DELAY_10K;
      }

      return {
        allowed: true,
        delayHours,
        message: delayHours > 0 
          ? `Withdrawal will be processed in ${delayHours} hours` 
          : 'Withdrawal will be processed immediately'
      };
    } catch (error) {
      console.error('Withdrawal limit check error:', error);
      return { allowed: false, reason: 'Error checking withdrawal limits' };
    }
  }

  /**
   * Circuit breaker - pause trading if price moves too fast
   * @param {string} tokenId - Token ID
   * @param {number} currentPrice - Current price to check
   * @param {string} userRole - User role (super_admin, admin, user)
   */
  async checkCircuitBreaker(tokenId, currentPrice, userRole = 'user') {
    try {
      // Super admins bypass circuit breaker
      if (userRole === 'super_admin') {
        console.log('🔓 Super admin bypassing circuit breaker');
        return { active: false, exempted: true };
      }

      const token = await Token.findByPk(tokenId);
      if (!token) return { active: false };

      // Check if circuit breaker already active
      if (this.circuitBreakers[tokenId]) {
        const { triggeredAt, duration } = this.circuitBreakers[tokenId];
        if (Date.now() - triggeredAt < duration) {
          const remainingMs = duration - (Date.now() - triggeredAt);
          return {
            active: true,
            reason: 'Circuit breaker active - trading paused',
            remainingSeconds: Math.ceil(remainingMs / 1000)
          };
        } else {
          // Expired, remove it
          delete this.circuitBreakers[tokenId];
        }
      }

      // Check if price moved too much in last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const oldPrice = parseFloat(token.currentPrice);
      const newPrice = parseFloat(currentPrice);
      
      const priceChange = Math.abs((newPrice - oldPrice) / oldPrice * 100);

      if (priceChange > this.LIMITS.CIRCUIT_BREAKER_THRESHOLD) {
        // Trigger circuit breaker
        this.circuitBreakers[tokenId] = {
          triggeredAt: Date.now(),
          duration: this.LIMITS.CIRCUIT_BREAKER_DURATION,
          priceChange: priceChange.toFixed(2)
        };

        console.log(`🚨 CIRCUIT BREAKER TRIGGERED for ${token.symbol}: ${priceChange.toFixed(2)}% change`);

        return {
          active: true,
          reason: `Price moved ${priceChange.toFixed(2)}% in 5 minutes - trading paused for safety`,
          remainingSeconds: this.LIMITS.CIRCUIT_BREAKER_DURATION / 1000
        };
      }

      return { active: false };
    } catch (error) {
      console.error('Circuit breaker check error:', error);
      return { active: false };
    }
  }

  /**
   * Get whale wallets (holdings > $100K)
   */
  async getWhaleWallets(limit = 10) {
    try {
      const wallets = await Wallet.findAll({
        include: [{ 
          model: Token, 
          as: 'token',
          attributes: ['id', 'symbol', 'name', 'currentPrice']
        }],
        order: [['balance', 'DESC']],
        limit: 100
      });

      const whales = wallets
        .map((wallet, index) => {
          const value = parseFloat(wallet.balance) * parseFloat(wallet.token.currentPrice);
          return {
            rank: index + 1,
            walletId: `Whale #${index + 1}`, // Anonymized
            tokenSymbol: wallet.token.symbol,
            holdings: parseFloat(wallet.balance),
            valueUSD: value,
            percentOfSupply: (parseFloat(wallet.balance) / parseFloat(wallet.token.totalSupply) * 100).toFixed(2)
          };
        })
        .filter(w => w.valueUSD >= this.LIMITS.WHALE_THRESHOLD)
        .slice(0, limit);

      return whales;
    } catch (error) {
      console.error('Get whale wallets error:', error);
      return [];
    }
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats() {
    try {
      const [totalUsers, totalWallets, totalOrders] = await Promise.all([
        require('../models').User.count(),
        Wallet.count(),
        Order.count()
      ]);

      const tokens = await Token.findAll();
      const totalVolume = tokens.reduce((sum, t) => sum + parseFloat(t.volume24h || 0), 0);
      const totalMarketCap = tokens.reduce((sum, t) => sum + parseFloat(t.marketCap || 0), 0);

      return {
        totalUsers,
        totalWallets,
        totalOrders,
        totalVolume24h: totalVolume,
        totalMarketCap,
        activeCircuitBreakers: Object.keys(this.circuitBreakers).length
      };
    } catch (error) {
      console.error('Get platform stats error:', error);
      return null;
    }
  }
}

module.exports = new WhaleProtectionService();
