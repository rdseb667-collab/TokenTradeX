const { Token } = require('../models');

/**
 * Price Simulator Service
 * Simulates realistic price movements for demo/testing
 */
class PriceSimulatorService {
  constructor(io) {
    this.io = io;
    this.isRunning = false;
    this.intervals = {};
    this.priceHistory = {};
  }

  /**
   * Start price simulation for all active tokens
   */
  async start() {
    if (this.isRunning) {
      console.log('Price simulator already running');
      return;
    }

    this.isRunning = true;
    console.log('🎲 Starting price simulator...');

    try {
      const tokens = await Token.findAll({ where: { isActive: true } });
      
      for (const token of tokens) {
        this.startTokenSimulation(token);
      }

      console.log(`✅ Price simulator started for ${tokens.length} tokens`);
    } catch (error) {
      console.error('❌ Failed to start price simulator:', error);
      this.isRunning = false;
    }
  }

  /**
   * Start simulation for a specific token
   */
  startTokenSimulation(token) {
    // Initialize price history
    if (!this.priceHistory[token.symbol]) {
      this.priceHistory[token.symbol] = {
        current: parseFloat(token.currentPrice),
        high24h: parseFloat(token.currentPrice) * 1.05,
        low24h: parseFloat(token.currentPrice) * 0.95,
        volume24h: parseFloat(token.volume24h)
      };
    }

    // Update price every 2-5 seconds (random interval for realism)
    const updateInterval = 2000 + Math.random() * 3000;
    
    this.intervals[token.symbol] = setInterval(async () => {
      try {
        const newPrice = this.simulatePrice(token);
        const priceChange = ((newPrice - parseFloat(token.currentPrice)) / parseFloat(token.currentPrice)) * 100;

        // Update database
        await Token.update(
          {
            currentPrice: newPrice,
            priceChange24h: priceChange,
            volume24h: this.priceHistory[token.symbol].volume24h
          },
          { where: { id: token.id } }
        );

        // Update local reference
        token.currentPrice = newPrice;

        // Broadcast price update via WebSocket
        if (this.io) {
          this.io.emit('price:update', {
            symbol: token.symbol,
            price: newPrice,
            change24h: priceChange,
            volume24h: this.priceHistory[token.symbol].volume24h,
            high24h: this.priceHistory[token.symbol].high24h,
            low24h: this.priceHistory[token.symbol].low24h,
            timestamp: new Date().toISOString()
          });
          console.log(`📡 Broadcasting ${token.symbol}: $${newPrice.toFixed(2)} (${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%)`);
        } else {
          console.log(`⚠️ No WebSocket connection available for ${token.symbol}`);
        }
      } catch (error) {
        console.error(`Error updating price for ${token.symbol}:`, error);
      }
    }, updateInterval);
  }

  /**
   * Simulate realistic price movement
   */
  simulatePrice(token) {
    const history = this.priceHistory[token.symbol];
    const currentPrice = history.current;
    
    // Volatility based on token type
    let volatility;
    if (token.symbol === 'USDT') {
      volatility = 0.0001; // Stablecoin - minimal movement
    } else if (token.symbol === 'BTC' || token.symbol === 'ETH') {
      volatility = 0.002; // Major coins - moderate volatility
    } else {
      volatility = 0.005; // Altcoins - higher volatility
    }

    // Random walk with mean reversion
    const randomChange = (Math.random() - 0.5) * volatility;
    const meanReversion = (parseFloat(token.currentPrice) - currentPrice) * 0.1;
    
    let newPrice = currentPrice * (1 + randomChange - meanReversion);

    // Ensure price stays within reasonable bounds (±10% of starting price)
    const minPrice = parseFloat(token.currentPrice) * 0.90;
    const maxPrice = parseFloat(token.currentPrice) * 1.10;
    newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));

    // Update 24h high/low
    if (newPrice > history.high24h) history.high24h = newPrice;
    if (newPrice < history.low24h) history.low24h = newPrice;

    // Simulate volume changes
    history.volume24h *= (0.98 + Math.random() * 0.04);

    // Update current price in history
    history.current = newPrice;

    return newPrice;
  }

  /**
   * Stop price simulation
   */
  stop() {
    console.log('🛑 Stopping price simulator...');
    
    Object.keys(this.intervals).forEach(symbol => {
      clearInterval(this.intervals[symbol]);
    });
    
    this.intervals = {};
    this.isRunning = false;
    console.log('✅ Price simulator stopped');
  }

  /**
   * Get current simulation status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeTokens: Object.keys(this.intervals).length,
      priceHistory: this.priceHistory
    };
  }
}

module.exports = PriceSimulatorService;
