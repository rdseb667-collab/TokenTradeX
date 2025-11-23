const https = require('https');
const { Token } = require('../models');

// Map token symbols to CoinGecko IDs
const COINGECKO_IDS = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2'
};

class PriceService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  // Fetch current price from CoinGecko or database
  async fetchPrice(symbol) {
    const coinId = COINGECKO_IDS[symbol.toUpperCase()];
    
    // For tokens not on CoinGecko (like TTX), use database price
    if (!coinId) {
      try {
        const token = await Token.findOne({ where: { symbol: symbol.toUpperCase() } });
        if (token) {
          return {
            price: parseFloat(token.currentPrice),
            change24h: parseFloat(token.priceChange24h || 0),
            volume24h: parseFloat(token.volume24h || 0),
            marketCap: parseFloat(token.marketCap || 0)
          };
        }
      } catch (err) {
        console.warn(`Failed to fetch ${symbol} from database:`, err.message);
      }
      // Return simulated price if all else fails
      return {
        price: 0.07,
        change24h: 0.01,
        volume24h: 0,
        marketCap: 0
      };
    }

    // Check cache
    const cached = this.cache.get(coinId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    return new Promise((resolve, reject) => {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const result = {
              price: json[coinId]?.usd || 0,
              change24h: json[coinId]?.usd_24h_change || 0,
              volume24h: json[coinId]?.usd_24h_vol || 0,
              marketCap: json[coinId]?.usd_market_cap || 0
            };
            
            // Cache the result
            this.cache.set(coinId, {
              data: result,
              timestamp: Date.now()
            });
            
            resolve(result);
          } catch (error) {
            reject(new Error('Failed to parse price data'));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  // Fetch historical chart data
  async fetchChartData(symbol, days = 1) {
    const coinId = COINGECKO_IDS[symbol.toUpperCase()];
    
    // For tokens not on CoinGecko (like TTX), generate simulated data
    if (!coinId) {
      try {
        const token = await Token.findOne({ where: { symbol: symbol.toUpperCase() } });
        if (token) {
          const currentPrice = parseFloat(token.currentPrice);
          const now = Date.now();
          const interval = (days * 24 * 60 * 60 * 1000) / 100; // 100 data points
          
          // Generate realistic-looking price data with small variations
          const chartData = [];
          for (let i = 0; i < 100; i++) {
            const timestamp = now - (100 - i) * interval;
            const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
            const price = currentPrice * (1 + variation);
            chartData.push({
              timestamp,
              price: parseFloat(price.toFixed(6)),
              time: new Date(timestamp).toISOString()
            });
          }
          
          return chartData;
        }
      } catch (err) {
        console.warn(`Failed to generate chart for ${symbol}:`, err.message);
      }
      return [];
    }

    return new Promise((resolve, reject) => {
      const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const prices = json.prices || [];
            
            // Format data for frontend
            const chartData = prices.map(([timestamp, price]) => ({
              timestamp,
              price: parseFloat(price.toFixed(2)),
              time: new Date(timestamp).toISOString()
            }));
            
            resolve(chartData);
          } catch (error) {
            reject(new Error('Failed to parse chart data'));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  // Fetch multiple token prices at once
  async fetchMultiplePrices(symbols) {
    const coinIds = symbols
      .map(s => COINGECKO_IDS[s.toUpperCase()])
      .filter(Boolean)
      .join(',');

    if (!coinIds) {
      return {};
    }

    return new Promise((resolve, reject) => {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const result = {};
            
            // Map back to symbols
            Object.entries(COINGECKO_IDS).forEach(([symbol, coinId]) => {
              if (json[coinId]) {
                result[symbol] = {
                  price: json[coinId].usd,
                  change24h: json[coinId].usd_24h_change,
                  volume24h: json[coinId].usd_24h_vol,
                  marketCap: json[coinId].usd_market_cap
                };
              }
            });
            
            resolve(result);
          } catch (error) {
            reject(new Error('Failed to parse price data'));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }
}

module.exports = new PriceService();
