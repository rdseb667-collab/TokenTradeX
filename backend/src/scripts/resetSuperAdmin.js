const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { sequelize } = require('../config/database');

/**
 * EMERGENCY RECOVERY SCRIPT
 * Resets super admin password and ensures account is accessible
 * 
 * Usage: node backend/src/scripts/resetSuperAdmin.js
 */

const SUPER_ADMIN_EMAIL = 'mainelew25@gmail.com';
const NEW_PASSWORD = 'Admin123!'; // Change this after login
const RESET_2FA = true; // Set to false to keep 2FA enabled

async function resetSuperAdmin() {
  try {
    console.log('🔐 Starting super admin recovery...\n');

    // Find the user
    const user = await User.findOne({ 
      where: { email: SUPER_ADMIN_EMAIL },
      raw: true 
    });

    if (!user) {
      console.error(`❌ User not found: ${SUPER_ADMIN_EMAIL}`);
      console.log('\n💡 Creating new super admin account...\n');
      
      // Create new super admin
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
      
      const newAdmin = await User.create({
        email: SUPER_ADMIN_EMAIL,
        username: 'superadmin',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        kycStatus: 'approved',
        isActive: true,
        twoFactorEnabled: false
      });

      console.log('✅ Super admin account created successfully!');
      console.log('\n📋 Account Details:');
      console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
      console.log(`   Password: ${NEW_PASSWORD}`);
      console.log(`   Role: super_admin`);
      console.log(`   Active: true`);
      console.log(`   2FA: disabled`);
      console.log('\n⚠️  IMPORTANT: Change the password immediately after login!\n');
      
      process.exit(0);
    }

    console.log('📋 Current Account Status:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   2FA Enabled: ${user.twoFactorEnabled}`);
    console.log(`   Last Login: ${user.lastLogin || 'Never'}\n`);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

    // Update user
    const updateData = {
      password: hashedPassword,
      isActive: true,
      role: 'super_admin' // Ensure role is correct
    };

    if (RESET_2FA) {
      updateData.twoFactorEnabled = false;
      updateData.twoFactorSecret = null;
    }

    await User.update(updateData, {
      where: { email: SUPER_ADMIN_EMAIL },
      individualHooks: false // Skip hooks to avoid re-hashing
    });

    // Verify update
    const updatedUser = await User.findOne({ 
      where: { email: SUPER_ADMIN_EMAIL },
      raw: true 
    });

    console.log('✅ Super admin account reset successfully!\n');
    console.log('📋 Updated Account Details:');
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Password: ${NEW_PASSWORD}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   Active: ${updatedUser.isActive}`);
    console.log(`   2FA Enabled: ${updatedUser.twoFactorEnabled}`);
    console.log('\n⚠️  IMPORTANT: Change the password immediately after login!');
    console.log('⚠️  Re-enable 2FA from Settings after successful login.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting super admin:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
resetSuperAdmin();
