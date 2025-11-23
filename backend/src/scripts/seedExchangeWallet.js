/**
 * Seed Exchange Wallet with Initial Liquidity
 * Run this script to enable auto-fill functionality
 */

const { User, Token, Wallet } = require('../models');
const bcrypt = require('bcryptjs');

async function seedExchangeWallet() {
  try {
    console.log('🏦 Seeding exchange wallet...\n');
    
    const exchangeEmail = process.env.EXCHANGE_WALLET_EMAIL || 'exchange@tokentradex.internal';
    
    // Create or get exchange user
    let exchangeUser = await User.findOne({ where: { email: exchangeEmail } });
    
    if (!exchangeUser) {
      console.log('Creating exchange user...');
      exchangeUser = await User.create({
        email: exchangeEmail,
        username: 'TokenTradeX_Exchange',
        password: await bcrypt.hash('SECURE_EXCHANGE_PASSWORD_' + Date.now(), 10),
        firstName: 'TokenTradeX',
        lastName: 'Exchange',
        role: 'admin',
        kycStatus: 'approved',
        isActive: true,
        twoFactorEnabled: false,
        totalTradingVolume: 0,
        firstTradeCompleted: false
      });
      console.log('✅ Exchange user created\n');
    } else {
      console.log('✅ Exchange user already exists\n');
    }
    
    // Get all active tokens
    const tokens = await Token.findAll({ where: { isActive: true } });
    
    console.log(`Found ${tokens.length} active tokens\n`);
    
    // Seed balances for each token
    const seedBalances = {
      'TTX': 1000000,    // 1M TTX for internal liquidity
      'BTC': 10,         // 10 BTC
      'ETH': 100,        // 100 ETH
      'SOL': 1000,       // 1K SOL
      'BNB': 500,        // 500 BNB
      'USDT': 100000     // 100K USDT for buying
    };
    
    // Set realistic prices for tokens (for auto-fill pricing)
    const tokenPrices = {
      'BTC': 43250.00,
      'ETH': 2280.50,
      'SOL': 98.75,
      'BNB': 310.20,
      'USDT': 1.00,
      'TTX': 0.05
    };
    
    for (const token of tokens) {
      const seedAmount = seedBalances[token.symbol] || 0;
      const tokenPrice = tokenPrices[token.symbol];
      
      // Update token price if defined
      if (tokenPrice && parseFloat(token.currentPrice) === 0) {
        await token.update({ currentPrice: tokenPrice });
        console.log(`💰 ${token.symbol}: Set price to $${tokenPrice.toLocaleString()}`);
      }
      
      if (seedAmount === 0) {
        console.log(`⏭️  Skipping ${token.symbol} (no seed amount defined)`);
        continue;
      }
      
      // Check if wallet exists
      let wallet = await Wallet.findOne({
        where: {
          userId: exchangeUser.id,
          tokenId: token.id
        }
      });
      
      if (!wallet) {
        // Create new wallet with seed balance
        wallet = await Wallet.create({
          userId: exchangeUser.id,
          tokenId: token.id,
          balance: seedAmount,
          lockedBalance: 0
        });
        console.log(`✅ ${token.symbol}: ${seedAmount.toLocaleString()} (new wallet)`);
      } else {
        // Update existing wallet
        const currentBalance = parseFloat(wallet.balance);
        if (currentBalance < seedAmount) {
          await wallet.update({
            balance: seedAmount
          });
          console.log(`✅ ${token.symbol}: ${currentBalance.toLocaleString()} → ${seedAmount.toLocaleString()} (topped up)`);
        } else {
          console.log(`✅ ${token.symbol}: ${currentBalance.toLocaleString()} (sufficient)`);
        }
      }
    }
    
    console.log('\n🎉 Exchange wallet seeded successfully!');
    console.log('\n📊 Auto-fill is now enabled for orders up to $' + (process.env.MAX_AUTO_FILL_USD || 500));
    
  } catch (error) {
    console.error('❌ Error seeding exchange wallet:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const { sequelize } = require('../config/database');
  
  sequelize.authenticate()
    .then(() => seedExchangeWallet())
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = seedExchangeWallet;
