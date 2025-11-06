const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/config/database');
const { User, Token, Wallet, Order, Transaction } = require('./src/models');

async function seedDemoData() {
  try {
    await sequelize.authenticate();
    console.log('🌱 Starting demo data seeding...\n');

    // 1. Create or find demo user account
    console.log('Creating demo user account...');
    let demoUser = await User.findOne({ where: { email: 'demo@tokentradex.com' } });
    
    if (!demoUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Demo123!', salt);

      demoUser = await User.create({
        email: 'demo@tokentradex.com',
        username: 'demouser',
        password: hashedPassword,
        firstName: 'Demo',
        lastName: 'User',
        role: 'user',
        kycStatus: 'approved',
        isActive: true,
        totalTradingVolume: 125000.50
      });
      console.log('✅ Demo user created: demo@tokentradex.com / Demo123!\n');
    } else {
      console.log('✅ Demo user already exists: demo@tokentradex.com / Demo123!\n');
    }

    // 2. Create sample tokens (RWA assets)
    console.log('Creating sample tokens...');
    const tokens = await Token.bulkCreate([
      {
        symbol: 'TTX',
        name: 'TokenTradeX Token',
        description: 'Platform utility token with fee discounts and governance',
        totalSupply: 1000000000,
        circulatingSupply: 250000000,
        currentPrice: 0.50,
        priceChange24h: 5.2,
        volume24h: 1250000,
        marketCap: 125000000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'UTILITY',
        dividendsEnabled: true
      },
      {
        symbol: 'PROP-NYC',
        name: 'Manhattan Office',
        description: 'Prime commercial real estate in downtown Manhattan',
        totalSupply: 10000,
        circulatingSupply: 7500,
        currentPrice: 1000,
        priceChange24h: 2.1,
        volume24h: 150000,
        marketCap: 7500000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'REALESTATE',
        requiresKYC: true,
        dividendsEnabled: true
      },
      {
        symbol: 'GOLD',
        name: 'Gold Reserves',
        description: 'Tokenized gold bullion stored in Swiss vaults',
        totalSupply: 50000,
        circulatingSupply: 42000,
        currentPrice: 65,
        priceChange24h: -0.8,
        volume24h: 380000,
        marketCap: 2730000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'COMMODITY',
        requiresKYC: false,
        dividendsEnabled: false
      },
      {
        symbol: 'ART-01',
        name: 'Picasso Art',
        description: 'Fractional ownership of authenticated Picasso paintings',
        totalSupply: 1000,
        circulatingSupply: 850,
        currentPrice: 5000,
        priceChange24h: 1.5,
        volume24h: 95000,
        marketCap: 4250000,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'ART',
        requiresKYC: true,
        dividendsEnabled: false
      },
      {
        symbol: 'TSLA',
        name: 'Tesla Fractional',
        description: 'Fractional shares of Tesla Inc.',
        totalSupply: 100000,
        circulatingSupply: 89000,
        currentPrice: 2.50,
        priceChange24h: 3.7,
        volume24h: 425000,
        marketCap: 222500,
        isActive: true,
        isTradingEnabled: true,
        assetCategory: 'EQUITY',
        requiresKYC: true,
        dividendsEnabled: false
      }
    ]);
    console.log(`✅ Created ${tokens.length} sample tokens\n`);

    // 3. Create wallets for demo user
    console.log('Creating demo user wallets...');
    const wallets = await Wallet.bulkCreate([
      {
        userId: demoUser.id,
        tokenId: tokens[0].id, // TTX
        balance: 50000,
        lockedBalance: 10000
      },
      {
        userId: demoUser.id,
        tokenId: tokens[1].id, // PROP-NYC-01
        balance: 25,
        lockedBalance: 0
      },
      {
        userId: demoUser.id,
        tokenId: tokens[2].id, // GOLD-VAULT
        balance: 150,
        lockedBalance: 0
      },
      {
        userId: demoUser.id,
        tokenId: tokens[4].id, // TSLA-FRAC
        balance: 500,
        lockedBalance: 0
      }
    ]);
    console.log(`✅ Created ${wallets.length} wallets with balances\n`);

    // 4. Create sample orders
    console.log('Creating sample order history...');
    const orders = await Order.bulkCreate([
      {
        userId: demoUser.id,
        tokenId: tokens[0].id,
        orderType: 'limit',
        side: 'buy',
        price: 0.48,
        quantity: 10000,
        filledQuantity: 10000,
        status: 'filled',
        totalValue: 4800,
        fee: 24,
        filledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        userId: demoUser.id,
        tokenId: tokens[1].id,
        orderType: 'market',
        side: 'buy',
        price: 980,
        quantity: 15,
        filledQuantity: 15,
        status: 'filled',
        totalValue: 14700,
        fee: 73.5,
        filledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        userId: demoUser.id,
        tokenId: tokens[2].id,
        orderType: 'limit',
        side: 'buy',
        price: 64,
        quantity: 150,
        filledQuantity: 150,
        status: 'filled',
        totalValue: 9600,
        fee: 48,
        filledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        userId: demoUser.id,
        tokenId: tokens[4].id,
        orderType: 'market',
        side: 'buy',
        price: 2.45,
        quantity: 500,
        filledQuantity: 500,
        status: 'filled',
        totalValue: 1225,
        fee: 6.13,
        filledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        userId: demoUser.id,
        tokenId: tokens[0].id,
        orderType: 'limit',
        side: 'sell',
        price: 0.52,
        quantity: 5000,
        filledQuantity: 0,
        status: 'pending',
        totalValue: 2600,
        fee: 0
      }
    ]);
    console.log(`✅ Created ${orders.length} sample orders\n`);

    // 5. Create sample transactions
    console.log('Creating sample transaction history...');
    await Transaction.bulkCreate([
      {
        userId: demoUser.id,
        tokenId: tokens[0].id,
        type: 'deposit',
        amount: 60000,
        status: 'completed',
        txHash: '0x' + Math.random().toString(36).substring(2, 66)
      },
      {
        userId: demoUser.id,
        tokenId: tokens[1].id,
        type: 'deposit',
        amount: 25,
        status: 'completed',
        txHash: '0x' + Math.random().toString(36).substring(2, 66)
      },
      {
        userId: demoUser.id,
        tokenId: tokens[2].id,
        type: 'deposit',
        amount: 150,
        status: 'completed',
        txHash: '0x' + Math.random().toString(36).substring(2, 66)
      }
    ]);
    console.log('✅ Created sample transactions\n');

    console.log('═══════════════════════════════════════════════');
    console.log('🎉 Demo data seeded successfully!');
    console.log('═══════════════════════════════════════════════\n');
    console.log('📱 DEMO USER LOGIN:');
    console.log('   Email: demo@tokentradex.com');
    console.log('   Password: Demo123!');
    console.log('\n💼 DEMO USER PORTFOLIO:');
    console.log('   • 50,000 TTX (utility tokens)');
    console.log('   • 25 PROP-NYC-01 (real estate)');
    console.log('   • 150 GOLD-VAULT (commodity)');
    console.log('   • 500 TSLA-FRAC (equity)');
    console.log('\n📊 PLATFORM FEATURES TO EXPLORE:');
    console.log('   ✓ Trading (5 different assets)');
    console.log('   ✓ Wallet (balances & transactions)');
    console.log('   ✓ Order history (filled & open orders)');
    console.log('   ✓ Staking (TTX tokens)');
    console.log('   ✓ Fractional shares (TSLA)');
    console.log('   ✓ RWA marketplace (real estate, gold, art)');
    console.log('═══════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  }
}

seedDemoData();
