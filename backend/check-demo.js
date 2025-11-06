const { sequelize } = require('./src/config/database');
const { User, Token, Wallet } = require('./src/models');

async function checkDemoData() {
  try {
    await sequelize.authenticate();
    
    const demoUser = await User.findOne({ where: { email: 'demo@tokentradex.com' } });
    const tokens = await Token.findAll();
    const wallets = demoUser ? await Wallet.findAll({ where: { userId: demoUser.id } }) : [];
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('🎮 DEMO ACCOUNT STATUS');
    console.log('═══════════════════════════════════════════════\n');
    
    if (demoUser) {
      console.log('✅ Demo User EXISTS');
      console.log('   Email: demo@tokentradex.com');
      console.log('   Password: Demo123!');
      console.log('   Role:', demoUser.role);
      console.log('   KYC:', demoUser.kycStatus);
    } else {
      console.log('❌ Demo user NOT found\n');
    }
    
    console.log(`\n📊 Tokens Available: ${tokens.length}`);
    tokens.forEach(t => {
      console.log(`   • ${t.symbol} - ${t.name} ($${t.currentPrice})`);
    });
    
    if (wallets.length > 0) {
      console.log(`\n💰 Demo User Wallets: ${wallets.length}`);
      for (const w of wallets) {
        const token = await Token.findByPk(w.tokenId);
        if (token) {
          console.log(`   • ${w.balance} ${token.symbol}`);
        }
      }
    } else {
      console.log('\n❌ No wallets for demo user');
    }
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('🚀 LOGIN NOW:');
    console.log('   http://localhost:5173/login');
    console.log('   demo@tokentradex.com / Demo123!');
    console.log('═══════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDemoData();
