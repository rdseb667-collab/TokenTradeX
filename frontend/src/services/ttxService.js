import api from './api';

class TTXService {
  /**
   * Get user's TTX fee tier information
   */
  async getFeeInfo() {
    try {
      const response = await api.get('/wallet/ttx/fee-info');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch TTX fee info:', error);
      throw error;
    }
  }

  /**
   * Calculate potential fee savings
   */
  calculateFeeSavings(tradeValue, currentTier, targetTier) {
    const baseFee = tradeValue * 0.0015; // 0.15% base fee
    const currentFee = baseFee * currentTier.feeMultiplier;
    const targetFee = baseFee * targetTier.feeMultiplier;
    const savings = currentFee - targetFee;
    
    return {
      currentFee,
      targetFee,
      savings,
      savingsPercent: ((savings / currentFee) * 100).toFixed(2)
    };
  }

  /**
   * Get TTX token price and market data
   */
  async getTTXMarketData() {
    try {
      const response = await api.get('/tokens');
      const ttxToken = response.data.data.find(token => token.symbol === 'TTX');
      return ttxToken;
    } catch (error) {
      console.error('Failed to fetch TTX market data:', error);
      throw error;
    }
  }

  /**
   * Calculate ROI for holding TTX tokens
   */
  calculateTTXROI(monthlyTradeVolume, ttxPrice, ttxToHold) {
    const annualVolume = monthlyTradeVolume * 12;
    const baseFee = annualVolume * 0.0015; // 0.15%
    
    // Without TTX
    const feesWithoutTTX = baseFee * 1.0;
    
    // Calculate savings with TTX
    const tiers = [
      { minTTX: 0, multiplier: 1.0 },
      { minTTX: 100, multiplier: 0.9 },
      { minTTX: 1000, multiplier: 0.75 },
      { minTTX: 10000, multiplier: 0.5 },
      { minTTX: 100000, multiplier: 0.25 },
      { minTTX: 1000000, multiplier: 0.1 }
    ];
    
    let tier = tiers[0];
    for (const t of tiers) {
      if (ttxToHold >= t.minTTX) {
        tier = t;
      }
    }
    
    const feesWithTTX = baseFee * tier.multiplier;
    const annualSavings = feesWithoutTTX - feesWithTTX;
    const investmentCost = ttxToHold * ttxPrice;
    const roi = ((annualSavings / investmentCost) * 100).toFixed(2);
    const breakEvenMonths = (investmentCost / (annualSavings / 12)).toFixed(1);
    
    return {
      annualSavings,
      investmentCost,
      roi,
      breakEvenMonths,
      tier: tier.minTTX
    };
  }
}

export default new TTXService();
