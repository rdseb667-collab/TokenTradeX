const https = require('https');

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

  // Fetch current price from CoinGecko
  async fetchPrice(symbol) {
    const coinId = COINGECKO_IDS[symbol.toUpperCase()];
    if (!coinId) {
      throw new Error(`Unsupported token: ${symbol}`);
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
    if (!coinId) {
      throw new Error(`Unsupported token: ${symbol}`);
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
