const { User } = require('../src/models');
const { sequelize } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function ensureSuperAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Check if super admin user exists
    const superAdminEmail = 'mainelew25@gmail.com';
    let user = await User.findOne({ where: { email: superAdminEmail } });
    
    if (!user) {
      console.log('Super admin user not found, creating...');
      
      // Create super admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Password123!', salt); // Default password
      
      user = await User.create({
        email: superAdminEmail,
        username: 'superadmin',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        kycStatus: 'approved',
        isActive: true
      });
      
      console.log('Super admin user created successfully');
    } else {
      console.log('Super admin user found');
      
      // Ensure the user has super_admin role
      if (user.role !== 'super_admin') {
        await user.update({ role: 'super_admin' });
        console.log('Updated user role to super_admin');
      } else {
        console.log('User already has super_admin role');
      }
    }
    
    console.log('Super admin user details:');
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Active: ${user.isActive}`);
    
    await sequelize.close();
  } catch (error) {
    console.error('Error ensuring super admin:', error);
    process.exit(1);
  }
}

ensureSuperAdmin();