const axios = require('axios');
const { Token } = require('../models');

/**
 * Real Price Service
 * Fetches live market prices from CoinGecko's free API
 * No API key required!
 */
class RealPriceService {
  constructor(io) {
    this.io = io;
    this.isRunning = false;
    this.intervals = {};
    
    // Map token symbols to CoinGecko IDs
    this.coinGeckoMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'USDT': 'tether',
      'TTX': null // Custom token - will use simulated price
    };
    
    // Track initial prices for TTX simulation
    this.ttxPrice = 0.07;
    
    // Forex pair base prices (for simulation)
    this.forexPrices = {
      'EUR/USD': 1.08,
      'GBP/USD': 1.26,
      'USD/JPY': 115.25,
      'USD/CHF': 0.92,
      'AUD/USD': 0.67,
      'USD/CAD': 1.37,
      'NZD/USD': 0.61,
      'EUR/GBP': 0.85,
      'EUR/JPY': 124.35
    };
  }

  /**
   * Start fetching real prices for all tokens
   */
  async start() {
    if (this.isRunning) {
      console.log('Real price service already running');
      return;
    }

    this.isRunning = true;
    console.log('🌐 Starting real price service...');

    try {
      // Fetch prices immediately
      await this.updateAllPrices();
      
      // Then update every 30 seconds (CoinGecko free tier allows 10-50 calls/min)
      this.intervals['main'] = setInterval(() => {
        this.updateAllPrices();
      }, 30000);

      console.log('✅ Real price service started');
    } catch (error) {
      console.error('❌ Failed to start real price service:', error);
      this.isRunning = false;
    }
  }

  /**
   * Fetch and update all token prices
   */
  async updateAllPrices() {
    try {
      const tokens = await Token.findAll({ where: { isActive: true } });
      
      // Get all CoinGecko IDs for batch request
      const coinIds = tokens
        .map(t => this.coinGeckoMap[t.symbol])
        .filter(id => id !== null);
      
      if (coinIds.length > 0) {
        // Fetch prices from CoinGecko (free API, no key needed!)
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
          params: {
            ids: coinIds.join(','),
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_24hr_vol: true
          },
          timeout: 10000
        });

        // Update cryptocurrency tokens
        for (const token of tokens) {
          const coinId = this.coinGeckoMap[token.symbol];
          
          if (coinId && response.data[coinId]) {
            const data = response.data[coinId];
            const price = data.usd;
            const change24h = data.usd_24h_change || 0;
            const volume24h = data.usd_24h_vol || parseFloat(token.volume24h);

            await this.updateTokenPrice(token, price, change24h, volume24h);
          } else if (token.symbol === 'TTX') {
            // Simulate TTX price with small variations
            const variation = (Math.random() - 0.5) * 0.001;
            this.ttxPrice = this.ttxPrice * (1 + variation);
            const change24h = ((this.ttxPrice - 0.07) / 0.07) * 100;
            
            await this.updateTokenPrice(token, this.ttxPrice, change24h, parseFloat(token.volume24h));
          }
        }
      }

      // Update forex pairs with simulated prices
      for (const token of tokens) {
        if (token.assetCategory === 'FOREX' && this.forexPrices[token.symbol]) {
          // Simulate small price movements for forex pairs
          const currentPrice = this.forexPrices[token.symbol];
          const variation = (Math.random() - 0.5) * 0.002; // ±0.1% variation
          const newPrice = currentPrice * (1 + variation);
          this.forexPrices[token.symbol] = newPrice;
          
          // Simulate 24h change and volume
          const change24h = (Math.random() - 0.5) * 0.5; // ±0.25% change
          const volume24h = Math.random() * 10000000000; // Random volume up to 10B
          
          await this.updateTokenPrice(token, newPrice, change24h, volume24h);
        }
      }

      console.log(`✅ Updated prices for ${tokens.length} tokens`);
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn('⚠️ CoinGecko rate limit reached, will retry in 30s');
      } else {
        console.error('Error fetching real prices:', error.message);
      }
    }
  }

  /**
   * Update a specific token's price
   */
  async updateTokenPrice(token, price, change24h, volume24h) {
    try {
      // Update database
      await Token.update(
        {
          currentPrice: price,
          priceChange24h: change24h,
          volume24h: volume24h
        },
        { where: { id: token.id } }
      );

      // Broadcast price update via WebSocket
      if (this.io) {
        this.io.emit('price:update', {
          symbol: token.symbol,
          price: price,
          change24h: change24h,
          volume24h: volume24h,
          high24h: price * 1.02, // Approximate
          low24h: price * 0.98,  // Approximate
          timestamp: new Date().toISOString()
        });
        
        console.log(`📡 Broadcasting ${token.symbol}: $${price.toFixed(2)} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)`);
      }
    } catch (error) {
      console.error(`Error updating ${token.symbol}:`, error.message);
    }
  }

  /**
   * Stop the service
   */
  stop() {
    console.log('🛑 Stopping real price service...');
    
    Object.keys(this.intervals).forEach(key => {
      clearInterval(this.intervals[key]);
    });
    
    this.intervals = {};
    this.isRunning = false;
    console.log('✅ Real price service stopped');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      provider: 'CoinGecko Free API',
      updateInterval: '30 seconds'
    };
  }
}

module.exports = RealPriceService;
