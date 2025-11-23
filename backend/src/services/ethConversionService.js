const logger = require('./logger');

/**
 * ETH/USD Conversion Service
 * 
 * Provides USD to ETH conversion for on-chain revenue collection.
 * Uses mock rate in staging, real oracle in production.
 */
class EthConversionService {
  constructor() {
    // Mock rate for staging/development
    this.mockEthUsdRate = parseFloat(process.env.MOCK_ETH_USD_RATE || '2000');
  }

  /**
   * Convert USD amount to ETH
   * @param {number} usdAmount - Amount in USD
   * @returns {number} Amount in ETH
   */
  async convertUsdToEth(usdAmount) {
    const mode = process.env.CONTRACT_MODE || 'development';
    
    if (mode === 'production') {
      // TODO: Integrate real oracle (Chainlink, Coinbase, etc.)
      logger.warn('⚠️ Production mode using mock ETH/USD conversion - integrate oracle!');
      return this.useMockConversion(usdAmount);
    } else {
      // Staging/development uses mock conversion
      return this.useMockConversion(usdAmount);
    }
  }

  /**
   * Mock conversion using fixed rate
   */
  useMockConversion(usdAmount) {
    const ethAmount = usdAmount / this.mockEthUsdRate;
    
    logger.info('💱 ETH conversion (mock)', {
      usdAmount,
      ethUsdRate: this.mockEthUsdRate,
      ethAmount,
      mode: process.env.CONTRACT_MODE || 'development'
    });
    
    return ethAmount;
  }

  /**
   * Get current ETH/USD rate
   */
  async getCurrentRate() {
    const mode = process.env.CONTRACT_MODE || 'development';
    
    if (mode === 'production') {
      // TODO: Fetch from oracle
      logger.warn('⚠️ Using mock rate - integrate oracle for production');
      return this.mockEthUsdRate;
    }
    
    return this.mockEthUsdRate;
  }
}

module.exports = new EthConversionService();
