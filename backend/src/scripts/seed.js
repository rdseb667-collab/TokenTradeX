const { User, Token, Wallet } = require('../models');
const { sequelize } = require('../config/database');

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create admin user
    const admin = await User.findOne({ where: { email: 'admin@tokentradex.com' } });
    if (!admin) {
      await User.create({
        email: 'admin@tokentradex.com',
        username: 'admin',
        password: 'Admin123!',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        kycStatus: 'approved',
        isActive: true
      });
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create demo tokens
    const tokens = [
      {
        symbol: 'TTX',
        name: 'TokenTradeX Token',
        description: 'Platform token with fee discounts and staking rewards',
        totalSupply: 1000000000,
        circulatingSupply: 500000000,
        currentPrice: 0.1,
        priceChange24h: 5.0,
        volume24h: 5000000,
        marketCap: 50000000,
        minTradeAmount: 1,
        maxTradeAmount: 1000000,
        isActive: true,
        isTradingEnabled: true
      },
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        description: 'The first and most popular cryptocurrency',
        totalSupply: 21000000,
        circulatingSupply: 19500000,
        currentPrice: 45000,
        priceChange24h: 2.5,
        volume24h: 25000000000,
        marketCap: 877500000000,
        minTradeAmount: 0.0001,
        maxTradeAmount: 100,
        isActive: true,
        isTradingEnabled: true
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        description: 'Decentralized platform for smart contracts',
        totalSupply: 120000000,
        circulatingSupply: 118000000,
        currentPrice: 2500,
        priceChange24h: 3.2,
        volume24h: 12000000000,
        marketCap: 295000000000,
        minTradeAmount: 0.001,
        maxTradeAmount: 1000,
        isActive: true,
        isTradingEnabled: true
      },
      {
        symbol: 'USDT',
        name: 'Tether',
        description: 'Stablecoin pegged to USD',
        totalSupply: 85000000000,
        circulatingSupply: 85000000000,
        currentPrice: 1,
        priceChange24h: 0.01,
        volume24h: 45000000000,
        marketCap: 85000000000,
        minTradeAmount: 1,
        maxTradeAmount: 1000000,
        isActive: true,
        isTradingEnabled: true
      },
      {
        symbol: 'BNB',
        name: 'Binance Coin',
        description: 'Native token of Binance ecosystem',
        totalSupply: 200000000,
        circulatingSupply: 155000000,
        currentPrice: 320,
        priceChange24h: 1.8,
        volume24h: 850000000,
        marketCap: 49600000000,
        minTradeAmount: 0.01,
        maxTradeAmount: 10000,
        isActive: true,
        isTradingEnabled: true
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        description: 'High-performance blockchain platform',
        totalSupply: 511000000,
        circulatingSupply: 400000000,
        currentPrice: 105,
        priceChange24h: 5.3,
        volume24h: 1200000000,
        marketCap: 42000000000,
        minTradeAmount: 0.1,
        maxTradeAmount: 10000,
        isActive: true,
        isTradingEnabled: true
      },
      // Forex pairs
      {
        symbol: 'EUR/USD',
        name: 'Euro / US Dollar',
        description: 'Euro / US Dollar Forex Pair',
        totalSupply: 1000000000,
        circulatingSupply: 1000000000,
        currentPrice: 1.08,
        priceChange24h: 0.25,
        volume24h: 25000000000,
        marketCap: 1080000000,
        minTradeAmount: 100,
        maxTradeAmount: 1000000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'FOREX'
      },
      {
        symbol: 'GBP/USD',
        name: 'British Pound / US Dollar',
        description: 'British Pound / US Dollar Forex Pair',
        totalSupply: 1000000000,
        circulatingSupply: 1000000000,
        currentPrice: 1.26,
        priceChange24h: -0.15,
        volume24h: 18000000000,
        marketCap: 1260000000,
        minTradeAmount: 100,
        maxTradeAmount: 1000000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'FOREX'
      },
      {
        symbol: 'USD/JPY',
        name: 'US Dollar / Japanese Yen',
        description: 'US Dollar / Japanese Yen Forex Pair',
        totalSupply: 1000000000,
        circulatingSupply: 1000000000,
        currentPrice: 115.25,
        priceChange24h: 0.35,
        volume24h: 22000000000,
        marketCap: 115250000000,
        minTradeAmount: 1000,
        maxTradeAmount: 10000000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'FOREX'
      },
      {
        symbol: 'USD/CHF',
        name: 'US Dollar / Swiss Franc',
        description: 'US Dollar / Swiss Franc Forex Pair',
        totalSupply: 1000000000,
        circulatingSupply: 1000000000,
        currentPrice: 0.92,
        priceChange24h: 0.12,
        volume24h: 15000000000,
        marketCap: 920000000,
        minTradeAmount: 100,
        maxTradeAmount: 1000000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'FOREX'
      },
      {
        symbol: 'AUD/USD',
        name: 'Australian Dollar / US Dollar',
        description: 'Australian Dollar / US Dollar Forex Pair',
        totalSupply: 1000000000,
        circulatingSupply: 1000000000,
        currentPrice: 0.67,
        priceChange24h: -0.22,
        volume24h: 12000000000,
        marketCap: 670000000,
        minTradeAmount: 100,
        maxTradeAmount: 1000000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'FOREX'
      },
      {
        symbol: 'USD/CAD',
        name: 'US Dollar / Canadian Dollar',
        description: 'US Dollar / Canadian Dollar Forex Pair',
        totalSupply: 1000000000,
        circulatingSupply: 1000000000,
        currentPrice: 1.37,
        priceChange24h: 0.08,
        volume24h: 14000000000,
        marketCap: 1370000000,
        minTradeAmount: 100,
        maxTradeAmount: 1000000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'FOREX'
      },
      {
        symbol: 'NZD/USD',
        name: 'New Zealand Dollar / US Dollar',
        description: 'New Zealand Dollar / US Dollar Forex Pair',
        totalSupply: 1000000000,
        circulatingSupply: 1000000000,
        currentPrice: 0.61,
        priceChange24h: -0.18,
        volume24h: 8000000000,
        marketCap: 610000000,
        minTradeAmount: 100,
        maxTradeAmount: 1000000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'FOREX'
      },
      {
        symbol: 'EUR/GBP',
        name: 'Euro / British Pound',
        description: 'Euro / British Pound Forex Pair',
        totalSupply: 1000000000,
        circulatingSupply: 1000000000,
        currentPrice: 0.85,
        priceChange24h: 0.15,
        volume24h: 11000000000,
        marketCap: 850000000,
        minTradeAmount: 100,
        maxTradeAmount: 1000000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'FOREX'
      },
      {
        symbol: 'EUR/JPY',
        name: 'Euro / Japanese Yen',
        description: 'Euro / Japanese Yen Forex Pair',
        totalSupply: 1000000000,
        circulatingSupply: 1000000000,
        currentPrice: 124.35,
        priceChange24h: 0.45,
        volume24h: 16000000000,
        marketCap: 124350000000,
        minTradeAmount: 1000,
        maxTradeAmount: 10000000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'FOREX'
      }
    ];

    for (const tokenData of tokens) {
      const existingToken = await Token.findOne({ where: { symbol: tokenData.symbol } });
      if (!existingToken) {
        await Token.create(tokenData);
        console.log(`✅ Token created: ${tokenData.symbol}`);
      } else {
        console.log(`ℹ️  Token already exists: ${tokenData.symbol}`);
      }
    }

    // Create demo user
    const demoUser = await User.findOne({ where: { email: 'demo@tokentradex.com' } });
    if (!demoUser) {
      const user = await User.create({
        email: 'demo@tokentradex.com',
        username: 'demo',
        password: 'Demo123!',
        firstName: 'Demo',
        lastName: 'User',
        role: 'trader',
        kycStatus: 'approved',
        isActive: true
      });
      console.log('✅ Demo user created');

      // Create wallets for demo user with initial balance
      const allTokens = await Token.findAll();
      for (const token of allTokens) {
        let initialBalance = 0;
        if (token.symbol === 'USDT') {
          initialBalance = 100000;
        } else if (token.symbol === 'BTC') {
          initialBalance = 1;
        } else if (token.symbol === 'TTX') {
          initialBalance = 5000; // Give demo user 5000 TTX tokens for fee discounts
        } else if (token.symbol.includes('/')) {
          // For forex pairs, give a reasonable amount
          initialBalance = 10000;
        } else {
          initialBalance = 10;
        }
        
        await Wallet.create({
          userId: user.id,
          tokenId: token.id,
          balance: initialBalance,
          lockedBalance: 0
        });
      }
      console.log('✅ Demo wallets created with initial balance');
    } else {
      console.log('ℹ️  Demo user already exists');
    }

    console.log('🎉 Database seeding completed!');
    console.log('\n📝 Login credentials:');
    console.log('   Admin: admin@tokentradex.com / Admin123!');
    console.log('   Demo:  demo@tokentradex.com / Demo123!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();