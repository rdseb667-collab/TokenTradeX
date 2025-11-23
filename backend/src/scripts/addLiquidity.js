const bcrypt = require('bcryptjs');
const { User, Wallet, Token, Order } = require('../models');
const { sequelize } = require('../config/database');

/**
 * Add Liquidity to Order Book
 * Creates a market maker account and places buy/sell orders at various price levels
 * 
 * Usage: node backend/src/scripts/addLiquidity.js
 */

const MARKET_MAKER_EMAIL = 'marketmaker@tokentradex.com';
const MARKET_MAKER_PASSWORD = 'MarketMaker123!';

async function addLiquidity() {
  try {
    console.log('💧 Adding liquidity to order book...\n');

    // Find or create market maker user
    let marketMaker = await User.findOne({ where: { email: MARKET_MAKER_EMAIL } });
    
    if (!marketMaker) {
      console.log('📝 Creating market maker account...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(MARKET_MAKER_PASSWORD, salt);
      
      marketMaker = await User.create({
        email: MARKET_MAKER_EMAIL,
        username: 'marketmaker',
        password: hashedPassword,
        role: 'user',
        isActive: true,
        twoFactorEnabled: false
      });
      console.log('✅ Market maker account created');
    } else {
      console.log('✅ Market maker account found');
    }

    // Fund the market maker with USDT and tokens
    console.log('\n💰 Funding market maker wallets...');
    
    const tokens = await Token.findAll();
    
    for (const token of tokens) {
      let wallet = await Wallet.findOne({
        where: { userId: marketMaker.id, tokenId: token.id }
      });
      
      if (!wallet) {
        wallet = await Wallet.create({
          userId: marketMaker.id,
          tokenId: token.id,
          balance: 0,
          lockedBalance: 0
        });
      }
      
      // Fund with tokens and USDT
      if (token.symbol === 'USDT') {
        // Give 500k USDT for buying
        await wallet.update({ balance: 500000 });
        console.log(`  💵 USDT: $500,000`);
      } else {
        // Give tokens for selling
        const currentPrice = parseFloat(token.currentPrice || 0);
        let tokenAmount;
        
        if (currentPrice > 10000) {
          tokenAmount = 10; // BTC
        } else if (currentPrice > 1000) {
          tokenAmount = 100; // ETH
        } else if (currentPrice > 100) {
          tokenAmount = 1000; // BNB
        } else if (currentPrice > 1) {
          tokenAmount = 10000; // SOL
        } else {
          tokenAmount = 1000000; // TTX and others
        }
        
        await wallet.update({ balance: tokenAmount });
        console.log(`  🪙 ${token.symbol}: ${tokenAmount} tokens`);
      }
    }

    // Place buy orders at various price levels for each token
    console.log('\n📊 Placing buy orders at multiple price levels...\n');
    
    for (const token of tokens) {
      if (token.symbol === 'USDT') continue; // Skip USDT
      
      const currentPrice = parseFloat(token.currentPrice || 0);
      if (currentPrice === 0) continue;
      
      console.log(`${token.symbol} (Current: $${currentPrice.toFixed(2)})`);
      
      // Place buy orders at: -10%, -5%, -2%, current, +2%, +5%, +10%
      const priceOffsets = [-0.10, -0.05, -0.02, 0, 0.02, 0.05, 0.10];
      
      for (const offset of priceOffsets) {
        const orderPrice = currentPrice * (1 + offset);
        const quantity = calculateQuantity(token.symbol, orderPrice);
        
        try {
          await Order.create({
            userId: marketMaker.id,
            tokenId: token.id,
            orderType: 'limit',
            side: 'buy',
            price: orderPrice,
            quantity: quantity,
            stopPrice: null,
            totalValue: orderPrice * quantity,
            fee: 0, // No fees for market maker
            status: 'pending',
            filledQuantity: 0
          });
          
          const offsetPercent = (offset * 100).toFixed(0);
          const sign = offset >= 0 ? '+' : '';
          console.log(`  ✅ BUY at $${orderPrice.toFixed(2)} (${sign}${offsetPercent}%) - ${quantity} ${token.symbol}`);
        } catch (error) {
          console.error(`  ❌ Failed to create order:`, error.message);
        }
      }
      
      console.log('');
    }

    console.log('🎉 Liquidity added successfully!');
    console.log('\n📈 Your sell orders should now start matching and filling!');
    console.log('\n💡 Market Maker Account:');
    console.log(`   Email: ${MARKET_MAKER_EMAIL}`);
    console.log(`   Password: ${MARKET_MAKER_PASSWORD}`);
    
  } catch (error) {
    console.error('❌ Error adding liquidity:', error);
    throw error;
  }
}

function calculateQuantity(symbol, price) {
  // Calculate appropriate quantity based on token and price
  if (price > 50000) return 0.01; // BTC
  if (price > 1000) return 0.1; // ETH
  if (price > 100) return 1; // BNB
  if (price > 10) return 10; // SOL
  if (price > 1) return 100; // Mid-range
  return 1000; // Low-price tokens
}

// Run the script
addLiquidity()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
