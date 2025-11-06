const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');

async function testLogin() {
  try {
    await sequelize.authenticate();
    console.log('\n🔍 Testing Demo Login...\n');

    // Find user
    const user = await User.findOne({ where: { email: 'demo@tokentradex.com' } });

    if (!user) {
      console.log('❌ User NOT found!\n');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   Email:', user.email);
    console.log('   Username:', user.username);
    console.log('   Role:', user.role);
    console.log('   Active:', user.isActive);
    console.log('   KYC:', user.kycStatus);
    console.log('   Password Hash:', user.password.substring(0, 20) + '...');

    // Test password
    console.log('\n🔐 Testing password "Demo123!"...');
    const isValid = await user.comparePassword('Demo123!');
    console.log('   Result:', isValid ? '✅ VALID' : '❌ INVALID');

    if (!isValid) {
      console.log('\n🔧 Resetting password...');
      // Reset directly in database
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Demo123!', salt);
      
      await sequelize.query(
        'UPDATE users SET password = :password WHERE email = :email',
        {
          replacements: { password: hashedPassword, email: 'demo@tokentradex.com' }
        }
      );

      console.log('✅ Password reset complete');

      // Test again
      const updatedUser = await User.findOne({ where: { email: 'demo@tokentradex.com' } });
      const isValidNow = await updatedUser.comparePassword('Demo123!');
      console.log('   New test result:', isValidNow ? '✅ VALID' : '❌ INVALID');
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('📝 LOGIN CREDENTIALS:');
    console.log('   Email: demo@tokentradex.com');
    console.log('   Password: Demo123!');
    console.log('═══════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testLogin();
