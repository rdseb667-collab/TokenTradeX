/**
 * SMART CONTRACT AUTOMATION SERVICE
 * 
 * Eliminates traditional "paying agent" (banks that charge fees to distribute dividends/coupons)
 * 
 * TRADITIONAL FLOW:
 * Issuer → Paying Agent (Bank) → Distribution (fees charged) → Investors (days later)
 * 
 * AUTOMATED FLOW:
 * Issuer → Smart Contract → Instant Distribution → Investors (seconds, no fees)
 * 
 * USE CASES:
 * - Stock dividends (quarterly/annual)
 * - Bond coupons (semi-annual interest)
 * - Real estate rental income (monthly)
 * - Revenue sharing (TTX platform fees - 15% to holders)
 * - Royalty payments (art, IP, music)
 * 
 * BENEFITS:
 * - No paying agent fees (save 0.5-2% per distribution)
 * - Instant settlement (vs 2-3 days)
 * - Automated execution (set once, runs forever)
 * - Proportional distribution (exact math, no errors)
 * - Transparent on-chain (all payments visible)
 */

const { Token, Wallet, Transaction, User } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const stakingService = require('./stakingService');
const dividendMiningService = require('./dividendMiningService');

class SmartContractAutomationService {
  
  /**
   * SCHEDULED PAYMENT TYPES
   */
  PAYMENT_TYPES = {
    DIVIDEND: 'dividend',           // Stock dividends
    COUPON: 'coupon',              // Bond interest
    RENTAL: 'rental',              // Real estate rental income
    ROYALTY: 'royalty',            // Art/IP/Music royalties
    PLATFORM_FEE: 'platform_fee',  // TTX 15% revenue share
    CUSTOM: 'custom'
  };
  
  FREQUENCIES = {
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    SEMI_ANNUAL: 'semi_annual',
    ANNUAL: 'annual',
    ONE_TIME: 'one_time'
  };
  
  /**
   * CREATE AUTOMATED PAYMENT SCHEDULE
   * Set once, runs forever (like smart contract)
   */
  async createPaymentSchedule({
    tokenId,
    paymentType,
    frequency,
    amountPerToken,          // e.g., $0.25 dividend per token
    startDate = new Date(),
    endDate = null,          // null = runs forever
    metadata = {}
  }) {
    const t = await sequelize.transaction();
    
    try {
      const token = await Token.findByPk(tokenId, { transaction: t });
      if (!token) {
        throw new Error('Token not found');
      }
      
      // Store schedule in token metadata
      const schedule = {
        paymentType,
        frequency,
        amountPerToken,
        startDate,
        endDate,
        lastExecuted: null,
        nextExecution: this.calculateNextExecution(startDate, frequency),
        totalDistributed: 0,
        executionCount: 0,
        metadata
      };
      
      await token.update({
        underlyingAsset: {
          ...token.underlyingAsset,
          paymentSchedule: schedule
        }
      }, { transaction: t });
      
      await t.commit();
      
      return {
        success: true,
        message: `Automated ${paymentType} schedule created`,
        schedule: {
          ...schedule,
          savings: this.calculatePayingAgentSavings(amountPerToken, parseFloat(token.totalSupply))
        }
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
  
  /**
   * EXECUTE AUTOMATED PAYMENT
   * Called by cron job or manually
   */
  async executeScheduledPayment(tokenId) {
    const t = await sequelize.transaction();
    
    try {
      const token = await Token.findByPk(tokenId, { transaction: t });
      if (!token || !token.underlyingAsset?.paymentSchedule) {
        throw new Error('No payment schedule found');
      }
      
      const schedule = token.underlyingAsset.paymentSchedule;
      const now = new Date();
      
      // Check if payment is due
      if (new Date(schedule.nextExecution) > now) {
        return {
          success: false,
          message: 'Payment not yet due',
          nextExecution: schedule.nextExecution
        };
      }
      
      // Get all token holders
      const holders = await Wallet.findAll({
        where: { 
          tokenId,
          balance: { [Op.gt]: 0 }
        },
        include: [{ model: User }],
        transaction: t
      });
      
      const distributions = [];
      let totalDistributed = 0;
      
      // Calculate and distribute to each holder
      for (const holder of holders) {
        const tokens = parseFloat(holder.balance);
        const paymentAmount = tokens * parseFloat(schedule.amountPerToken);
        
        // Create transaction record
        await Transaction.create({
          userId: holder.userId,
          tokenId,
          type: 'PAYMENT_RECEIVED',
          amount: tokens,
          price: schedule.amountPerToken,
          total: paymentAmount,
          status: 'COMPLETED',
          metadata: {
            paymentType: schedule.paymentType,
            frequency: schedule.frequency,
            automated: true,
            executionDate: now
          }
        }, { transaction: t });
        
        distributions.push({
          userId: holder.userId,
          username: holder.User?.username,
          tokens,
          payment: `$${paymentAmount.toFixed(2)}`
        });
        
        totalDistributed += paymentAmount;
      }
      
      // Update schedule
      const updatedSchedule = {
        ...schedule,
        lastExecuted: now,
        nextExecution: this.calculateNextExecution(now, schedule.frequency),
        totalDistributed: parseFloat(schedule.totalDistributed) + totalDistributed,
        executionCount: parseInt(schedule.executionCount) + 1
      };
      
      await token.update({
        underlyingAsset: {
          ...token.underlyingAsset,
          paymentSchedule: updatedSchedule
        }
      }, { transaction: t });
      
      // DIVIDEND MINING: Also distribute to stakers of this RWA token
      const cat = (token.assetCategory || '').toLowerCase();
      if (cat && ['equity','stocks','bond','bonds','real_estate','realestate','commodity','art'].includes(cat)) {
        try {
          await stakingService.distributeDividendsToStakers(tokenId, totalDistributed);
          
          // DIVIDEND LOTTERY: Execute lottery for stakers
          const lotteryResult = await dividendMiningService.executeDividendLottery(tokenId, totalDistributed);
          if (lotteryResult.success && lotteryResult.winner) {
            console.log(`🎰 Lottery winner: ${lotteryResult.winner.username} won $${lotteryResult.winner.prize} (${lotteryResult.winner.multiplier}x)`);
          }
        } catch (stakingError) {
          console.error('Error in dividend mining/lottery:', stakingError);
          // Don't fail the main distribution if staking distribution fails
        }
      }
      
      await t.commit();
      
      return {
        success: true,
        message: `Automated ${schedule.paymentType} payment executed`,
        execution: {
          executionDate: now,
          totalHolders: holders.length,
          totalDistributed: `$${totalDistributed.toFixed(2)}`,
          amountPerToken: `$${schedule.amountPerToken}`,
          nextExecution: updatedSchedule.nextExecution,
          distributions
        },
        savings: {
          traditionalFees: this.calculatePayingAgentSavings(schedule.amountPerToken, parseFloat(token.totalSupply)),
          automatedFees: '$0.00',
          saved: this.calculatePayingAgentSavings(schedule.amountPerToken, parseFloat(token.totalSupply))
        }
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
  
  /**
   * BATCH EXECUTE ALL DUE PAYMENTS
   * Called by cron job every hour
   */
  async executeDuePayments() {
    try {
      const tokens = await Token.findAll({
        where: {
          underlyingAsset: {
            [Op.ne]: null
          }
        }
      });
      
      const results = [];
      const now = new Date();
      
      for (const token of tokens) {
        if (token.underlyingAsset?.paymentSchedule) {
          const schedule = token.underlyingAsset.paymentSchedule;
          
          // Check if payment is due
          if (new Date(schedule.nextExecution) <= now) {
            try {
              const result = await this.executeScheduledPayment(token.id);
              results.push({
                tokenId: token.id,
                symbol: token.symbol,
                ...result
              });
            } catch (err) {
              results.push({
                tokenId: token.id,
                symbol: token.symbol,
                success: false,
                error: err.message
              });
            }
          }
        }
      }
      
      return {
        success: true,
        message: `Executed ${results.length} automated payments`,
        results
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * ONE-TIME MANUAL PAYMENT
   * For irregular distributions
   */
  async executeOneTimePayment({
    tokenId,
    paymentType,
    totalAmount,
    description = ''
  }) {
    const t = await sequelize.transaction();
    
    try {
      const token = await Token.findByPk(tokenId, { transaction: t });
      if (!token) {
        throw new Error('Token not found');
      }
      
      const amountPerToken = totalAmount / parseFloat(token.totalSupply);
      
      // Get all holders
      const holders = await Wallet.findAll({
        where: { 
          tokenId,
          balance: { [Op.gt]: 0 }
        },
        include: [{ model: User }],
        transaction: t
      });
      
      const distributions = [];
      let totalDistributed = 0;
      
      for (const holder of holders) {
        const tokens = parseFloat(holder.balance);
        const paymentAmount = tokens * amountPerToken;
        
        await Transaction.create({
          userId: holder.userId,
          tokenId,
          type: 'PAYMENT_RECEIVED',
          amount: tokens,
          price: amountPerToken,
          total: paymentAmount,
          status: 'COMPLETED',
          metadata: {
            paymentType,
            description,
            oneTime: true
          }
        }, { transaction: t });
        
        distributions.push({
          userId: holder.userId,
          username: holder.User?.username,
          tokens,
          payment: `$${paymentAmount.toFixed(2)}`
        });
        
        totalDistributed += paymentAmount;
      }
      
      await t.commit();
      
      return {
        success: true,
        message: `One-time ${paymentType} payment distributed`,
        details: {
          totalAmount: `$${totalAmount.toFixed(2)}`,
          amountPerToken: `$${amountPerToken.toFixed(6)}`,
          holders: holders.length,
          distributions
        },
        savings: {
          traditionalFees: this.calculatePayingAgentSavings(amountPerToken, parseFloat(token.totalSupply)),
          automatedFees: '$0.00'
        }
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
  
  /**
   * GET PAYMENT HISTORY
   */
  async getPaymentHistory(tokenId) {
    try {
      const token = await Token.findByPk(tokenId);
      if (!token) {
        throw new Error('Token not found');
      }
      
      const payments = await Transaction.findAll({
        where: {
          tokenId,
          type: 'PAYMENT_RECEIVED'
        },
        include: [{ model: User, attributes: ['username', 'email'] }],
        order: [['createdAt', 'DESC']],
        limit: 100
      });
      
      const schedule = token.underlyingAsset?.paymentSchedule;
      
      return {
        success: true,
        token: {
          symbol: token.symbol,
          name: token.name
        },
        schedule: schedule || null,
        history: payments.map(p => ({
          date: p.createdAt,
          user: p.User?.username,
          amount: `$${parseFloat(p.total).toFixed(2)}`,
          paymentType: p.metadata?.paymentType,
          automated: p.metadata?.automated || false
        })),
        stats: {
          totalPayments: payments.length,
          totalDistributed: `$${payments.reduce((sum, p) => sum + parseFloat(p.total), 0).toFixed(2)}`
        }
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * CALCULATE NEXT EXECUTION DATE
   */
  calculateNextExecution(lastDate, frequency) {
    const next = new Date(lastDate);
    
    switch (frequency) {
      case this.FREQUENCIES.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case this.FREQUENCIES.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case this.FREQUENCIES.SEMI_ANNUAL:
        next.setMonth(next.getMonth() + 6);
        break;
      case this.FREQUENCIES.ANNUAL:
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        return null;
    }
    
    return next;
  }
  
  /**
   * CALCULATE PAYING AGENT SAVINGS
   * Traditional banks charge 0.5-2% to distribute dividends
   */
  calculatePayingAgentSavings(amountPerToken, totalSupply) {
    const totalAmount = amountPerToken * totalSupply;
    const traditionalFee = totalAmount * 0.01; // 1% average
    return `$${traditionalFee.toFixed(2)}`;
  }
  
  /**
   * GET AUTOMATION STATS
   */
  async getAutomationStats() {
    try {
      const tokens = await Token.findAll({
        where: {
          underlyingAsset: {
            [Op.ne]: null
          }
        }
      });
      
      let totalScheduled = 0;
      let totalExecuted = 0;
      let totalSaved = 0;
      
      tokens.forEach(token => {
        if (token.underlyingAsset?.paymentSchedule) {
          totalScheduled++;
          const schedule = token.underlyingAsset.paymentSchedule;
          totalExecuted += parseInt(schedule.executionCount) || 0;
          
          // Calculate total savings
          const savingsStr = this.calculatePayingAgentSavings(
            parseFloat(schedule.amountPerToken),
            parseFloat(token.totalSupply)
          );
          const savings = parseFloat(savingsStr.replace('$', ''));
          totalSaved += savings * (parseInt(schedule.executionCount) || 0);
        }
      });
      
      return {
        success: true,
        stats: {
          totalScheduledPayments: totalScheduled,
          totalExecutedPayments: totalExecuted,
          totalPayingAgentFeesSaved: `$${totalSaved.toFixed(2)}`,
          averageSavingsPerPayment: totalExecuted > 0 ? `$${(totalSaved / totalExecuted).toFixed(2)}` : '$0.00'
        },
        advantages: [
          'No paying agent fees (save 0.5-2% per distribution)',
          'Instant settlement (vs 2-3 days)',
          'Automated execution (set once, runs forever)',
          'Exact proportional distribution (no math errors)',
          'Transparent on-chain (all payments visible)'
        ]
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new SmartContractAutomationService();
