const { User, Wallet, Token } = require('../models');
const { sequelize } = require('../config/database');

/**
 * Fund super admin wallet with USDT for testing
 * 
 * Usage: node backend/src/scripts/fundSuperAdmin.js
 */

const SUPER_ADMIN_EMAIL = 'mainelew25@gmail.com';
const FUNDING_AMOUNT = 100000; // $100,000 USDT for testing

async function fundSuperAdmin() {
  try {
    console.log('💰 Funding super admin wallet...\n');

    // Find the super admin user
    const user = await User.findOne({ 
      where: { email: SUPER_ADMIN_EMAIL }
    });

    if (!user) {
      console.error(`❌ User not found: ${SUPER_ADMIN_EMAIL}`);
      process.exit(1);
    }

    console.log('✅ User found:', {
      email: user.email,
      role: user.role,
      id: user.id
    });

    // Find USDT token
    const usdtToken = await Token.findOne({ 
      where: { symbol: 'USDT' }
    });

    if (!usdtToken) {
      console.error('❌ USDT token not found in database');
      process.exit(1);
    }

    console.log('✅ USDT token found:', {
      symbol: usdtToken.symbol,
      id: usdtToken.id
    });

    // Check if wallet exists
    let wallet = await Wallet.findOne({
      where: { 
        userId: user.id, 
        tokenId: usdtToken.id 
      }
    });

    if (wallet) {
      // Update existing wallet
      const oldBalance = parseFloat(wallet.balance);
      await wallet.update({
        balance: parseFloat(wallet.balance) + FUNDING_AMOUNT
      });
      
      console.log('\n✅ Wallet updated!');
      console.log(`   Old Balance: $${oldBalance.toFixed(2)}`);
      console.log(`   Added: $${FUNDING_AMOUNT.toFixed(2)}`);
      console.log(`   New Balance: $${(oldBalance + FUNDING_AMOUNT).toFixed(2)}`);
    } else {
      // Create new wallet
      wallet = await Wallet.create({
        userId: user.id,
        tokenId: usdtToken.id,
        balance: FUNDING_AMOUNT,
        lockedBalance: 0
      });
      
      console.log('\n✅ Wallet created!');
      console.log(`   Balance: $${FUNDING_AMOUNT.toFixed(2)}`);
    }

    // Also create wallets for all other tokens with 0 balance (for display)
    const allTokens = await Token.findAll();
    
    for (const token of allTokens) {
      if (token.id === usdtToken.id) continue; // Skip USDT, already done
      
      const existingWallet = await Wallet.findOne({
        where: { userId: user.id, tokenId: token.id }
      });
      
      if (!existingWallet) {
        await Wallet.create({
          userId: user.id,
          tokenId: token.id,
          balance: 0,
          lockedBalance: 0
        });
        console.log(`   Created ${token.symbol} wallet (0 balance)`);
      }
    }

    console.log('\n🎉 Super admin is ready to trade!');
    console.log('   You can now place buy orders with your USDT balance.');
    console.log('   Login at: http://localhost:5174/login');
    console.log('   Go to Trading page to start trading.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error funding wallet:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
fundSuperAdmin();
