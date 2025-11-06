/**
 * Revenue Service - Multiple revenue models for TokenTradeX platform
 */

class RevenueService {
  constructor() {
    // Revenue model configurations
    this.revenueModels = {
      // 1. Trading Fees (Primary Revenue)
      tradingFees: {
        enabled: true,
        baseFee: 0.001, // 0.1% base fee
        makerFee: 0.0008, // 0.08% for liquidity providers
        takerFee: 0.0012, // 0.12% for liquidity takers
        ttxDiscountEnabled: true
      },

      // 2. Subscription Tiers
      subscriptions: {
        enabled: true,
        tiers: [
          {
            name: 'Free',
            monthlyFee: 0,
            tradingFeeDiscount: 0,
            features: ['Basic trading', 'Limited API calls', 'Email support']
          },
          {
            name: 'Pro',
            monthlyFee: 29.99,
            tradingFeeDiscount: 0.15, // 15% discount
            features: ['Advanced charts', 'Unlimited API', 'Priority support', 'Market insights']
          },
          {
            name: 'Enterprise',
            monthlyFee: 199.99,
            tradingFeeDiscount: 0.30, // 30% discount
            features: ['Dedicated account manager', 'Custom integrations', 'OTC desk access', 'Institutional tools']
          }
        ]
      },

      // 3. Withdrawal Fees
      withdrawalFees: {
        enabled: true,
        crypto: {
          BTC: 0.0005,
          ETH: 0.005,
          USDT: 1.0,
          default: 0.1 // percentage
        },
        fiat: {
          flat: 2.50,
          percentage: 0.005 // 0.5%
        }
      },

      // 4. Margin Trading Fees
      marginTrading: {
        enabled: true,
        borrowingInterest: {
          daily: 0.0002, // 0.02% per day
          annual: 0.073 // 7.3% APR
        },
        liquidationFee: 0.05, // 5% of liquidated position
        fundingRate: 0.0001 // 0.01% every 8 hours
      },

      // 5. Listing Fees (For new tokens)
      listingFees: {
        enabled: true,
        initialListing: 50000, // $50,000 to list
        fastTrackListing: 100000, // $100,000 for priority
        marketMakingDeposit: 250000, // $250,000 liquidity requirement
        monthlyMaintenanceFee: 5000 // $5,000/month
      },

      // 6. API Access Fees
      apiAccess: {
        enabled: true,
        tiers: [
          { name: 'Free', requestsPerMinute: 10, monthlyFee: 0 },
          { name: 'Standard', requestsPerMinute: 100, monthlyFee: 49 },
          { name: 'Pro', requestsPerMinute: 1000, monthlyFee: 199 },
          { name: 'Enterprise', requestsPerMinute: 'unlimited', monthlyFee: 999 }
        ]
      },

      // 7. Staking Rewards (Platform takes cut)
      stakingFees: {
        enabled: true,
        platformCut: 0.10, // 10% of staking rewards
        earlyUnstakePenalty: 0.05 // 5% penalty for early withdrawal
      },

      // 8. Premium Features
      premiumFeatures: {
        enabled: true,
        features: [
          { name: 'Advanced Analytics', monthlyFee: 19.99 },
          { name: 'Trading Bots', monthlyFee: 49.99 },
          { name: 'Portfolio Tracker', monthlyFee: 9.99 },
          { name: 'Tax Reports', perReport: 29.99 },
          { name: 'VIP Support', monthlyFee: 99.99 }
        ]
      },

      // 9. Referral Program (Cost, but drives revenue)
      referralProgram: {
        enabled: true,
        referrerReward: 0.20, // 20% of referee's trading fees
        refereeDiscount: 0.10, // 10% discount for new users
        lifetimeCommission: true,
        tieredRewards: [
          { minReferrals: 1, commission: 0.20 },
          { minReferrals: 10, commission: 0.25 },
          { minReferrals: 50, commission: 0.30 },
          { minReferrals: 100, commission: 0.35 }
        ]
      },

      // 10. Institutional Services
      institutional: {
        enabled: true,
        otcDesk: {
          minimumTrade: 100000,
          feePercentage: 0.001 // 0.1%
        },
        custodyServices: {
          setupFee: 10000,
          monthlyFee: 5000,
          feePercentage: 0.002 // 0.2% AUM
        },
        whiteLabel: {
          setupFee: 500000,
          monthlyLicense: 50000,
          revenueShare: 0.30 // 30% of generated fees
        }
      }
    };
  }

  /**
   * Calculate trading fee for a transaction
   */
  calculateTradingFee(amount, orderType, ttxBalance, subscriptionTier) {
    if (!this.revenueModels.tradingFees.enabled) return 0;

    const { baseFee, makerFee, takerFee } = this.revenueModels.tradingFees;
    
    // Base fee based on order type
    let fee = orderType === 'maker' ? makerFee : takerFee;
    
    // Apply subscription discount
    const subscription = this.revenueModels.subscriptions.tiers.find(t => t.name === subscriptionTier);
    if (subscription) {
      fee *= (1 - subscription.tradingFeeDiscount);
    }
    
    // Apply TTX holding discount
    if (this.revenueModels.tradingFees.ttxDiscountEnabled) {
      const ttxDiscount = this.getTTXDiscount(ttxBalance);
      fee *= (1 - ttxDiscount);
    }
    
    return amount * fee;
  }

  /**
   * Get TTX discount based on holdings
   */
  getTTXDiscount(ttxBalance) {
    if (ttxBalance >= 1000000) return 0.90; // 90% discount
    if (ttxBalance >= 100000) return 0.75;  // 75% discount
    if (ttxBalance >= 10000) return 0.50;   // 50% discount
    if (ttxBalance >= 1000) return 0.25;    // 25% discount
    if (ttxBalance >= 100) return 0.10;     // 10% discount
    return 0;
  }

  /**
   * Calculate withdrawal fee
   */
  calculateWithdrawalFee(amount, currency, type = 'crypto') {
    if (!this.revenueModels.withdrawalFees.enabled) return 0;

    if (type === 'crypto') {
      const cryptoFees = this.revenueModels.withdrawalFees.crypto;
      return cryptoFees[currency] || (amount * cryptoFees.default);
    } else {
      const fiatFees = this.revenueModels.withdrawalFees.fiat;
      return fiatFees.flat + (amount * fiatFees.percentage);
    }
  }

  /**
   * Calculate margin trading interest
   */
  calculateMarginInterest(borrowedAmount, days) {
    if (!this.revenueModels.marginTrading.enabled) return 0;
    
    const dailyRate = this.revenueModels.marginTrading.borrowingInterest.daily;
    return borrowedAmount * dailyRate * days;
  }

  /**
   * Calculate staking fee (platform cut)
   */
  calculateStakingFee(stakingReward) {
    if (!this.revenueModels.stakingFees.enabled) return 0;
    
    return stakingReward * this.revenueModels.stakingFees.platformCut;
  }

  /**
   * Get monthly recurring revenue projection
   */
  calculateMonthlyRecurringRevenue(userStats) {
    let mrr = 0;

    // Subscriptions
    if (this.revenueModels.subscriptions.enabled) {
      this.revenueModels.subscriptions.tiers.forEach(tier => {
        const usersInTier = userStats.subscriptions[tier.name] || 0;
        mrr += usersInTier * tier.monthlyFee;
      });
    }

    // API Access
    if (this.revenueModels.apiAccess.enabled) {
      this.revenueModels.apiAccess.tiers.forEach(tier => {
        const usersInTier = userStats.apiAccess[tier.name] || 0;
        mrr += usersInTier * tier.monthlyFee;
      });
    }

    // Premium Features
    if (this.revenueModels.premiumFeatures.enabled) {
      this.revenueModels.premiumFeatures.features.forEach(feature => {
        if (feature.monthlyFee) {
          const subscribers = userStats.premiumFeatures[feature.name] || 0;
          mrr += subscribers * feature.monthlyFee;
        }
      });
    }

    // Institutional
    if (this.revenueModels.institutional.enabled) {
      mrr += (userStats.institutional?.custody || 0) * this.revenueModels.institutional.custodyServices.monthlyFee;
      mrr += (userStats.institutional?.whiteLabel || 0) * this.revenueModels.institutional.whiteLabel.monthlyLicense;
    }

    return mrr;
  }

  /**
   * Get revenue breakdown by model
   */
  getRevenueBreakdown(period = 'monthly') {
    return {
      tradingFees: { percentage: 60, description: 'Primary revenue from trading activity' },
      subscriptions: { percentage: 15, description: 'Pro and Enterprise tier subscriptions' },
      withdrawalFees: { percentage: 8, description: 'Crypto and fiat withdrawal fees' },
      marginTrading: { percentage: 7, description: 'Interest and liquidation fees' },
      listingFees: { percentage: 5, description: 'Token listing and maintenance' },
      premiumFeatures: { percentage: 3, description: 'Advanced tools and analytics' },
      institutional: { percentage: 2, description: 'OTC, custody, and white-label services' }
    };
  }

  /**
   * Get all revenue models
   */
  getAllRevenueModels() {
    return this.revenueModels;
  }
}

module.exports = new RevenueService();
