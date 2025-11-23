const { User, Token, Wallet } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

async function seedForexPairs() {
  try {
    console.log('🌱 Starting forex pairs seeding...');

    // Forex pairs data
    const forexPairs = [
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

    // Add forex pairs to database
    for (const pairData of forexPairs) {
      const existingPair = await Token.findOne({ where: { symbol: pairData.symbol } });
      if (!existingPair) {
        await Token.create(pairData);
        console.log(`✅ Forex pair created: ${pairData.symbol}`);
      } else {
        console.log(`ℹ️  Forex pair already exists: ${pairData.symbol}`);
      }
    }

    // Add wallets for existing users
    const users = await User.findAll();
    const forexSymbols = forexPairs.map(pair => pair.symbol);
    const forexTokens = await Token.findAll({ 
      where: { 
        symbol: {
          [Op.in]: forexSymbols
        }
      } 
    });

    for (const user of users) {
      for (const token of forexTokens) {
        const existingWallet = await Wallet.findOne({
          where: {
            userId: user.id,
            tokenId: token.id
          }
        });
        
        if (!existingWallet) {
          await Wallet.create({
            userId: user.id,
            tokenId: token.id,
            balance: 10000, // Default balance for forex pairs
            lockedBalance: 0
          });
          console.log(`✅ Wallet created for ${user.username} - ${token.symbol}`);
        }
      }
    }

    console.log('🎉 Forex pairs seeding completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Forex pairs seeding failed:', error);
    process.exit(1);
  }
}

seedForexPairs();