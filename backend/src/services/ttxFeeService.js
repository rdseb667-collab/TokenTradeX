/**
 * TTX Fee Service - Enhanced with Reserve-Backed System
 * Calculate trading fees based on TTX holdings
 * Integrates with smart contract for on-chain verification
 */

const ttxReserveService = require('./ttxReserveService');

class TTXFeeService {
  constructor() {
    // Fee tiers based on TTX token holdings
    this.feeTiers = [
      { minTTX: 0, feeMultiplier: 1.0, tierName: 'Standard' },           // 100% fee (no discount)
      { minTTX: 100, feeMultiplier: 0.9, tierName: 'Bronze' },           // 10% discount
      { minTTX: 1000, feeMultiplier: 0.75, tierName: 'Silver' },         // 25% discount
      { minTTX: 10000, feeMultiplier: 0.5, tierName: 'Gold' },           // 50% discount
      { minTTX: 100000, feeMultiplier: 0.25, tierName: 'Platinum' },     // 75% discount
      { minTTX: 1000000, feeMultiplier: 0.1, tierName: 'Diamond' }       // 90% discount
    ];

    // Base fees for different asset types
    this.baseFees = {
      crypto: {
        baseFee: 0.50,      // $0.50
        percentFee: 0.0015   // 0.15%
      },
      stock: {
        baseFee: 0.30,
        percentFee: 0.001    // 0.1%
      },
      forex: {
        baseFee: 0.20,
        percentFee: 0.0005   // 0.05%
      },
      commodity: {
        baseFee: 0.40,
        percentFee: 0.001
      }
    };
  }

  /**
   * Get user's fee tier based on TTX holdings
   * Enhanced with smart contract integration
   */
  async getUserTier(ttxBalance, userEthAddress = null) {
    // Try to get from smart contract if ETH address provided
    if (userEthAddress) {
      try {
        const contractTier = await ttxReserveService.getUserFeeTier(userEthAddress);
        return {
          minTTX: contractTier.tierId >= 0 ? this.feeTiers[contractTier.tierId].minTTX : 0,
          feeMultiplier: 1 - (contractTier.discountBps / 10000),
          tierName: ttxReserveService.getTierName(contractTier.tierId),
          revenueShare: contractTier.revenueShare
        };
      } catch (error) {
        // Fall through to database tier calculation
      }
    }

    // Fallback to database tier calculation
    let tier = this.feeTiers[0];
    
    for (const t of this.feeTiers) {
      if (ttxBalance >= t.minTTX) {
        tier = t;
      } else {
        break;
      }
    }
    
    return tier;
  }

  /**
   * Calculate trading fee for a transaction
   * Enhanced with smart contract integration
   */
  async calculateTradingFee(tradeValue, assetType, ttxBalance, userEthAddress = null) {
    const baseFee = this.baseFees[assetType] || this.baseFees.crypto;
    
    // Try smart contract calculation first
    if (userEthAddress) {
      try {
        const rawFee = baseFee.baseFee + (tradeValue * baseFee.percentFee);
        const finalFee = await ttxReserveService.calculateTradingFee(userEthAddress, rawFee);
        const tier = await this.getUserTier(ttxBalance, userEthAddress);
        
        return {
          rawFee: parseFloat(rawFee.toFixed(4)),
          discount: parseFloat((rawFee - finalFee).toFixed(4)),
          finalFee: parseFloat(finalFee.toFixed(4)),
          tier: tier.tierName,
          feeMultiplier: tier.feeMultiplier,
          savedAmount: parseFloat((rawFee - finalFee).toFixed(4)),
          revenueShare: tier.revenueShare || false
        };
      } catch (error) {
        // Fall through to local calculation
      }
    }
    
    // Fallback to local calculation
    const tier = await this.getUserTier(ttxBalance);
    
    // Calculate raw fee
    const rawFee = baseFee.baseFee + (tradeValue * baseFee.percentFee);
    
    // Apply tier discount
    const finalFee = rawFee * tier.feeMultiplier;
    
    return {
      rawFee: parseFloat(rawFee.toFixed(4)),
      discount: parseFloat(((rawFee - finalFee).toFixed(4))),
      finalFee: parseFloat(finalFee.toFixed(4)),
      tier: tier.tierName,
      feeMultiplier: tier.feeMultiplier,
      savedAmount: parseFloat((rawFee - finalFee).toFixed(4))
    };
  }

  /**
   * Get fee breakdown for display
   */
  getFeeBreakdown(tradeValue, assetType, ttxBalance) {
    const calculation = this.calculateTradingFee(tradeValue, assetType, ttxBalance);
    const tier = this.getUserTier(ttxBalance);
    
    return {
      ...calculation,
      nextTier: this.getNextTier(ttxBalance),
      currentTierInfo: tier,
      allTiers: this.feeTiers
    };
  }

  /**
   * Get next tier information
   */
  getNextTier(ttxBalance) {
    const currentTier = this.getUserTier(ttxBalance);
    const currentIndex = this.feeTiers.findIndex(t => t.tierName === currentTier.tierName);
    
    if (currentIndex < this.feeTiers.length - 1) {
      const nextTier = this.feeTiers[currentIndex + 1];
      return {
        ...nextTier,
        ttxNeeded: nextTier.minTTX - ttxBalance
      };
    }
    
    return null; // Already at highest tier
  }

  /**
   * Calculate annual savings based on trading volume
   */
  calculateAnnualSavings(monthlyVolume, assetType, ttxBalance) {
    const annualVolume = monthlyVolume * 12;
    const withoutDiscount = this.calculateTradingFee(annualVolume, assetType, 0);
    const withDiscount = this.calculateTradingFee(annualVolume, assetType, ttxBalance);
    
    return {
      annualSavings: parseFloat((withoutDiscount.finalFee - withDiscount.finalFee).toFixed(2)),
      monthlySavings: parseFloat(((withoutDiscount.finalFee - withDiscount.finalFee) / 12).toFixed(2)),
      percentageSaved: parseFloat((((withoutDiscount.finalFee - withDiscount.finalFee) / withoutDiscount.finalFee) * 100).toFixed(2))
    };
  }
}

module.exports = new TTXFeeService();
