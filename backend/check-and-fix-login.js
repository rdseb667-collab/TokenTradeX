const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');

async function checkAndFix() {
  try {
    await sequelize.authenticate();
    console.log('Database connected\n');

    // Find all users
    const users = await User.findAll();
    console.log('=== ALL USERS IN DATABASE ===');
    users.forEach(u => {
      console.log(`Email: ${u.email}`);
      console.log(`Username: ${u.username}`);
      console.log(`Role: ${u.role}`);
      console.log(`Active: ${u.isActive}`);
      console.log(`---`);
    });

    // Find mainelew25@gmail.com
    let user = await User.findOne({ where: { email: 'mainelew25@gmail.com' } });

    if (!user) {
      console.log('\n❌ User not found! Creating...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123!', salt);
      
      user = await User.create({
        email: 'mainelew25@gmail.com',
        username: 'tokentradex',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        kycStatus: 'approved',
        isActive: true
      });
      console.log('✅ User created!');
    } else {
      console.log('\n✅ User found! Resetting password...');
      
      // Reset password directly in database
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123!', salt);
      
      await sequelize.query(
        'UPDATE users SET password = :password, is_active = true WHERE email = :email',
        {
          replacements: { password: hashedPassword, email: 'mainelew25@gmail.com' }
        }
      );
      console.log('✅ Password reset!');
    }

    // Test the password
    const testUser = await User.findOne({ where: { email: 'mainelew25@gmail.com' } });
    const isValid = await testUser.comparePassword('Admin123!');
    
    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Email: mainelew25@gmail.com');
    console.log('Password: Admin123!');
    console.log('Password Valid:', isValid ? '✅ YES' : '❌ NO');
    console.log('Account Active:', testUser.isActive ? '✅ YES' : '❌ NO');
    console.log('Role:', testUser.role);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndFix();
