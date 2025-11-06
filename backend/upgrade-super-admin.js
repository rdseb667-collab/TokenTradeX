const { User } = require('./src/models');
const { sequelize } = require('./src/config/database');

async function upgradeSuperAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connected\n');

    // Find the super admin account
    const superAdmin = await User.findOne({ 
      where: { email: 'mainelew25@gmail.com' } 
    });

    if (!superAdmin) {
      console.log('❌ Super admin account not found!');
      console.log('Please run: node check-and-fix-login.js first');
      process.exit(1);
    }

    console.log('=== CURRENT STATUS ===');
    console.log('Email:', superAdmin.email);
    console.log('Current Role:', superAdmin.role);
    console.log('2FA Enabled:', superAdmin.twoFactorEnabled);
    console.log('Active:', superAdmin.isActive);

    // Upgrade to super_admin role if needed
    if (superAdmin.role !== 'super_admin') {
      console.log('\n📝 Upgrading role to super_admin...');
      await superAdmin.update({ role: 'super_admin' });
      console.log('✅ Role upgraded to super_admin!');
    } else {
      console.log('\n✅ Already has super_admin role');
    }

    console.log('\n=== UPDATED STATUS ===');
    console.log('Email:', superAdmin.email);
    console.log('Role:', superAdmin.role);
    console.log('2FA Enabled:', superAdmin.twoFactorEnabled);
    console.log('Active:', superAdmin.isActive);

    if (!superAdmin.twoFactorEnabled) {
      console.log('\n⚠️  IMPORTANT: 2FA is NOT enabled!');
      console.log('To enable 2FA:');
      console.log('1. Login to the frontend with mainelew25@gmail.com');
      console.log('2. Go to Settings → Security');
      console.log('3. Enable Two-Factor Authentication');
      console.log('4. Scan QR code with Google Authenticator');
      console.log('\n🔒 2FA is REQUIRED for creating admin accounts!');
    } else {
      console.log('\n✅ 2FA is enabled - account fully secured!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

upgradeSuperAdmin();
