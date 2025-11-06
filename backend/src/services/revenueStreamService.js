const ttxReserveService = require('./ttxReserveService');
const logger = require('./logger');

/**
 * Revenue Stream Service - Manages 10 revenue streams
 * 70% of ALL revenue goes to TTX holders (active usage incentive)
 * 30% goes to RESERVE FUND (backing increases = price appreciation)
 * 
 * This creates the flywheel:
 * Usage → Revenue → Holder rewards + Reserve growth → Price up → More usage
 */
class RevenueStreamService {
  constructor() {
    this.revenueStreams = [
      { 
        id: 0, 
        name: 'Trading Fees',
        description: '0.15% fee on every trade',
        collected: 0,
        distributed: 0,
        targetMonthly: 50000 // $50K/month target
      },
      { 
        id: 1, 
        name: 'Withdrawal Fees',
        description: 'Small fee when users cash out',
        collected: 0,
        distributed: 0,
        targetMonthly: 10000
      },
      { 
        id: 2, 
        name: 'Premium Subscriptions',
        description: '$10-50/month for pro features',
        collected: 0,
        distributed: 0,
        targetMonthly: 25000
      },
      { 
        id: 3, 
        name: 'API Licensing',
        description: 'Other platforms pay to use our engine',
        collected: 0,
        distributed: 0,
        targetMonthly: 100000 // B2B = big money
      },
      { 
        id: 4, 
        name: 'Market Making',
        description: 'Earn spread from liquidity provision',
        collected: 0,
        distributed: 0,
        targetMonthly: 75000
      },
      { 
        id: 5, 
        name: 'Lending Interest',
        description: 'Users borrow, platform earns interest',
        collected: 0,
        distributed: 0,
        targetMonthly: 40000
      },
      { 
        id: 6, 
        name: 'Staking Commissions',
        description: 'Small % of staking rewards',
        collected: 0,
        distributed: 0,
        targetMonthly: 30000
      },
      { 
        id: 7, 
        name: 'Copy Trading Fees',
        description: 'Fee when copying successful traders',
        collected: 0,
        distributed: 0,
        targetMonthly: 20000
      },
      { 
        id: 8, 
        name: 'White Label Licensing',
        description: 'Monthly fees from other exchanges using our tech',
        collected: 0,
        distributed: 0,
        targetMonthly: 150000 // Recurring B2B revenue
      },
      { 
        id: 9, 
        name: 'NFT Position Trading',
        description: 'Fees from tokenized position marketplace',
        collected: 0,
        distributed: 0,
        targetMonthly: 35000
      }
    ];
    
    this.holderSharePercentage = 0.15; // 15% to holders (fair & sustainable)
    this.reserveFundPercentage = 0.30; // 30% to reserve (increases backing)
    
    // Reserve fund tracking
    this.reserveFund = {
      totalCollected: 0,
      ttxBacking: 0, // Total USD backing each TTX
      circulatingSupply: 500000000 // 500M TTX circulating
    };
  }

  /**
   * Collect revenue from any stream
   * 15% → TTX holders (fair rewards)
   * 85% → Reserve fund (increases TTX backing/price)
   */
  async collectRevenue(streamId, amount, description = '') {
    try {
      if (streamId < 0 || streamId >= this.revenueStreams.length) {
        throw new Error('Invalid stream ID');
      }

      const stream = this.revenueStreams[streamId];
      const holderShare = amount * this.holderSharePercentage;
      const reserveShare = amount * this.reserveFundPercentage;

      // Update local tracking
      stream.collected += amount;
      stream.distributed += holderShare;
      
      // Add to reserve fund
      this.reserveFund.totalCollected += reserveShare;
      this.reserveFund.ttxBacking = this.reserveFund.totalCollected / this.reserveFund.circulatingSupply;

      logger.info('Revenue collected - Flywheel active', {
        stream: stream.name,
        totalAmount: amount,
        holderShare: holderShare,
        reserveShare: reserveShare,
        newTTXBacking: this.reserveFund.ttxBacking.toFixed(6),
        description
      });

      // Send to smart contract (holder share goes on-chain)
      try {
        await ttxReserveService.collectRevenue(streamId, holderShare);
      } catch (error) {
        logger.warn('Smart contract revenue collection failed, tracking locally', {
          error: error.message
        });
      }

      return {
        success: true,
        streamName: stream.name,
        totalCollected: amount,
        holderShare,
        reserveShare,
        ttxBacking: this.reserveFund.ttxBacking,
        flywheelEffect: `Reserve backing increased from usage. TTX now backed by $${this.reserveFund.ttxBacking.toFixed(6)} per token`
      };
    } catch (error) {
      logger.error('Failed to collect revenue', { error: error.message });
      throw error;
    }
  }

  /**
   * Get reserve fund status
   * Shows how usage drives price appreciation
   */
  getReserveFundStatus() {
    return {
      totalReserveCollected: this.reserveFund.totalCollected,
      ttxBackingPerToken: this.reserveFund.ttxBacking,
      circulatingSupply: this.reserveFund.circulatingSupply,
      impliedMinPrice: this.reserveFund.ttxBacking, // Minimum price based on backing
      message: `Each TTX is backed by $${this.reserveFund.ttxBacking.toFixed(6)} in reserve. Active usage increases this backing.`
    };
  }
  
  /**
   * Show the flywheel effect to users
   */
  getFlywheelMetrics() {
    const totalRevenue = this.revenueStreams.reduce((sum, s) => sum + s.collected, 0);
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
        backingIncrease: (reserveGrowth / this.reserveFund.circulatingSupply).toFixed(6),
        percentage: '85%',
        message: 'Reserve backing grows, supporting higher prices'
      },
      flywheelEffect: [
        '1. You use platform → Revenue generated',
        '2. You get 15% as holder → Fair benefit',
        '3. Reserve gets 85% → Backing increases strongly',
        '4. Higher backing → TTX price rises',
        '5. Your holdings worth more → You use more',
        '6. Cycle repeats → Sustainable growth'
      ]
    };
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
