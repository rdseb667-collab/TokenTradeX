const { User } = require('./src/models');
const { sequelize } = require('./src/config/database');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('\n🔍 Testing Admin Login...\n');

    const admin = await User.findOne({ where: { email: 'admin@tokentradex.com' } });

    if (!admin) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   Email:', admin.email);
    console.log('   Username:', admin.username);
    console.log('   Role:', admin.role);
    console.log('   Active:', admin.isActive);
    console.log('   KYC:', admin.kycStatus);

    const valid = await admin.comparePassword('Admin123!');
    console.log('\n🔐 Testing password "Admin123!"...');
    console.log('   Result:', valid ? '✅ VALID' : '❌ INVALID');

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📝 LOGIN CREDENTIALS:');
    console.log('   Email: admin@tokentradex.com');
    console.log('   Password: Admin123!');
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
