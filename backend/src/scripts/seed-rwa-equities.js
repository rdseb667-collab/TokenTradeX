const { Token, User } = require('../models');
const { sequelize } = require('../config/database');

// Top 20 US equities with real dividend data
const TOP_US_EQUITIES = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    description: 'Technology company - iPhone, iPad, Mac, Services',
    pricePerShare: 178.50,
    dividendYield: 0.52,
    annualDividend: 0.96,
    dividendFrequency: 'quarterly',
    sector: 'Technology',
    marketCap: 2800000000000
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    description: 'Technology company - Software, Cloud Computing, Gaming',
    pricePerShare: 378.91,
    dividendYield: 0.78,
    annualDividend: 3.00,
    dividendFrequency: 'quarterly',
    sector: 'Technology',
    marketCap: 2820000000000
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    description: 'Technology company - Google Search, YouTube, Cloud',
    pricePerShare: 141.80,
    dividendYield: 0.45,
    annualDividend: 0.80,
    dividendFrequency: 'quarterly',
    sector: 'Technology',
    marketCap: 1780000000000
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    description: 'E-commerce and cloud computing giant',
    pricePerShare: 178.25,
    dividendYield: 0.00,
    annualDividend: 0.00,
    dividendFrequency: 'none',
    sector: 'Consumer Cyclical',
    marketCap: 1850000000000
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    description: 'Graphics Processing Units and AI chips',
    pricePerShare: 495.22,
    dividendYield: 0.03,
    annualDividend: 0.16,
    dividendFrequency: 'quarterly',
    sector: 'Technology',
    marketCap: 1220000000000
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    description: 'Electric vehicles and clean energy',
    pricePerShare: 242.84,
    dividendYield: 0.00,
    annualDividend: 0.00,
    dividendFrequency: 'none',
    sector: 'Consumer Cyclical',
    marketCap: 770000000000
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    description: 'Social media - Facebook, Instagram, WhatsApp',
    pricePerShare: 497.38,
    dividendYield: 0.35,
    annualDividend: 2.00,
    dividendFrequency: 'quarterly',
    sector: 'Technology',
    marketCap: 1260000000000
  },
  {
    symbol: 'BRK.B',
    name: 'Berkshire Hathaway Inc.',
    description: 'Warren Buffett\'s diversified holding company',
    pricePerShare: 445.12,
    dividendYield: 0.00,
    annualDividend: 0.00,
    dividendFrequency: 'none',
    sector: 'Financial Services',
    marketCap: 960000000000
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    description: 'Largest US bank by assets',
    pricePerShare: 213.15,
    dividendYield: 2.12,
    annualDividend: 4.60,
    dividendFrequency: 'quarterly',
    sector: 'Financial Services',
    marketCap: 620000000000
  },
  {
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    description: 'Pharmaceutical and consumer health products',
    pricePerShare: 158.32,
    dividendYield: 3.02,
    annualDividend: 4.96,
    dividendFrequency: 'quarterly',
    sector: 'Healthcare',
    marketCap: 380000000000
  },
  {
    symbol: 'V',
    name: 'Visa Inc.',
    description: 'Global payments technology company',
    pricePerShare: 285.67,
    dividendYield: 0.74,
    annualDividend: 2.16,
    dividendFrequency: 'quarterly',
    sector: 'Financial Services',
    marketCap: 590000000000
  },
  {
    symbol: 'PG',
    name: 'Procter & Gamble Co.',
    description: 'Consumer goods - Tide, Pampers, Gillette',
    pricePerShare: 168.45,
    dividendYield: 2.41,
    annualDividend: 4.08,
    dividendFrequency: 'quarterly',
    sector: 'Consumer Defensive',
    marketCap: 395000000000
  },
  {
    symbol: 'MA',
    name: 'Mastercard Inc.',
    description: 'Global payments processing',
    pricePerShare: 488.23,
    dividendYield: 0.52,
    annualDividend: 2.56,
    dividendFrequency: 'quarterly',
    sector: 'Financial Services',
    marketCap: 450000000000
  },
  {
    symbol: 'DIS',
    name: 'The Walt Disney Company',
    description: 'Entertainment - Movies, Parks, Streaming',
    pricePerShare: 112.82,
    dividendYield: 0.00,
    annualDividend: 0.00,
    dividendFrequency: 'suspended',
    sector: 'Communication Services',
    marketCap: 205000000000
  },
  {
    symbol: 'KO',
    name: 'The Coca-Cola Company',
    description: 'Beverage manufacturer',
    pricePerShare: 62.85,
    dividendYield: 2.95,
    annualDividend: 1.94,
    dividendFrequency: 'quarterly',
    sector: 'Consumer Defensive',
    marketCap: 272000000000
  },
  {
    symbol: 'PEP',
    name: 'PepsiCo Inc.',
    description: 'Food and beverage company',
    pricePerShare: 168.92,
    dividendYield: 2.98,
    annualDividend: 5.06,
    dividendFrequency: 'quarterly',
    sector: 'Consumer Defensive',
    marketCap: 233000000000
  },
  {
    symbol: 'NFLX',
    name: 'Netflix Inc.',
    description: 'Streaming entertainment service',
    pricePerShare: 725.68,
    dividendYield: 0.00,
    annualDividend: 0.00,
    dividendFrequency: 'none',
    sector: 'Communication Services',
    marketCap: 312000000000
  },
  {
    symbol: 'WMT',
    name: 'Walmart Inc.',
    description: 'Retail corporation',
    pricePerShare: 178.32,
    dividendYield: 1.18,
    annualDividend: 2.28,
    dividendFrequency: 'quarterly',
    sector: 'Consumer Defensive',
    marketCap: 483000000000
  },
  {
    symbol: 'BAC',
    name: 'Bank of America Corp.',
    description: 'Banking and financial services',
    pricePerShare: 38.95,
    dividendYield: 2.26,
    annualDividend: 0.96,
    dividendFrequency: 'quarterly',
    sector: 'Financial Services',
    marketCap: 295000000000
  },
  {
    symbol: 'XOM',
    name: 'Exxon Mobil Corporation',
    description: 'Oil and gas corporation',
    pricePerShare: 118.45,
    dividendYield: 3.12,
    annualDividend: 3.76,
    dividendFrequency: 'quarterly',
    sector: 'Energy',
    marketCap: 485000000000
  }
];

async function seedRWAEquities() {
  console.log('🌱 Starting RWA Equities Seeding...\n');

  try {
    let createdCount = 0;
    let skippedCount = 0;

    for (const equity of TOP_US_EQUITIES) {
      // Check if token already exists
      const existingToken = await Token.findOne({
        where: { symbol: equity.symbol }
      });

      if (existingToken) {
        console.log(`⏭️  ${equity.symbol} - Already exists, skipping...`);
        skippedCount++;
        continue;
      }

      // Calculate token supply (BlackRock model: 1000 tokens per share)
      const tokensPerShare = 1000;
      const sharesAvailable = 1000000; // 1M shares available for tokenization
      const totalSupply = sharesAvailable * tokensPerShare;
      
      // Token price is 1/1000th of stock price
      const tokenPrice = equity.pricePerShare / tokensPerShare;
      
      // Dividend per token (quarterly)
      const quarterlyDividendPerToken = equity.dividendFrequency === 'quarterly' 
        ? (equity.annualDividend / 4) / tokensPerShare 
        : 0;

      // Create RWA token
      const token = await Token.create({
        symbol: equity.symbol,
        name: equity.name,
        description: equity.description,
        totalSupply: totalSupply,
        circulatingSupply: totalSupply,
        currentPrice: tokenPrice.toFixed(8),
        priceChange24h: (Math.random() * 4 - 2).toFixed(2), // Random -2% to +2%
        volume24h: Math.floor(Math.random() * 10000000),
        marketCap: equity.marketCap,
        isActive: true,
        isTradingEnabled: true,
        minTradeAmount: 1, // Minimum 1 token
        maxTradeAmount: totalSupply * 0.01, // Max 1% of supply
        assetCategory: 'stocks',
        requiresKYC: true,
        dividendsEnabled: equity.annualDividend > 0,
        underlyingAsset: {
          assetType: 'stock',
          issuer: equity.name,
          sector: equity.sector,
          pricePerShare: equity.pricePerShare,
          totalShares: sharesAvailable,
          tokensPerShare: tokensPerShare,
          dividendYield: equity.dividendYield,
          annualDividend: equity.annualDividend,
          quarterlyDividend: equity.annualDividend / 4,
          dividendFrequency: equity.dividendFrequency,
          dividendPerToken: quarterlyDividendPerToken,
          fractionalTradingEnabled: true,
          minFractionalAmount: 0.001,
          maxFractionalAmount: 10000,
          instantSettlement: true,
          tradingHours: '24/7',
          description: `Tokenized ${equity.name} stock with ${equity.dividendFrequency} dividend distribution`
        }
      });

      console.log(`✅ ${equity.symbol} - Created successfully`);
      console.log(`   💰 Price: $${tokenPrice.toFixed(4)} per token ($${equity.pricePerShare} per share)`);
      if (equity.annualDividend > 0) {
        console.log(`   💵 Dividend: $${quarterlyDividendPerToken.toFixed(6)} per token/quarter`);
      }
      console.log('');
      
      createdCount++;
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Created: ${createdCount} tokens`);
    console.log(`⏭️  Skipped: ${skippedCount} tokens (already exist)`);
    console.log(`📈 Total: ${TOP_US_EQUITIES.length} equities processed`);
    
    return { createdCount, skippedCount };

  } catch (error) {
    console.error('❌ Error seeding RWA equities:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedRWAEquities()
    .then(() => {
      console.log('\n✅ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedRWAEquities;
