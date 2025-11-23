const { User, Wallet, Token } = require('./src/models');
const { sequelize } = require('./src/models');

async function addDemoFunds() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Find demo user
    const demoUser = await User.findOne({ where: { email: 'demo@tokentradex.com' } });
    if (!demoUser) {
      console.error('❌ Demo user not found');
      process.exit(1);
    }
    console.log('✅ Found demo user:', demoUser.email);

    // Find USDT token
    const usdtToken = await Token.findOne({ where: { symbol: 'USDT' } });
    if (!usdtToken) {
      console.error('❌ USDT token not found');
      process.exit(1);
    }
    console.log('✅ Found USDT token');

    // Find or create wallet
    let wallet = await Wallet.findOne({
      where: {
        userId: demoUser.id,
        tokenId: usdtToken.id
      }
    });

    if (wallet) {
      // Update existing wallet
      const oldBalance = parseFloat(wallet.balance);
      wallet.balance = '100000.00';
      wallet.lockedBalance = '0.00';
      await wallet.save();
      console.log(`✅ Updated wallet balance: ${oldBalance} → 100,000 USDT`);
    } else {
      // Create new wallet
      wallet = await Wallet.create({
        userId: demoUser.id,
        tokenId: usdtToken.id,
        balance: '100000.00',
        lockedBalance: '0.00',
        availableBalance: '100000.00'
      });
      console.log('✅ Created new wallet with 100,000 USDT');
    }

    console.log('\n🎉 Demo account funded successfully!');
    console.log('   Email: demo@tokentradex.com');
    console.log('   Balance: 100,000 USDT');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addDemoFunds();
