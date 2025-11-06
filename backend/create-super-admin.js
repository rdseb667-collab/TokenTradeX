const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');

async function createSuperAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin123!', salt);

    // Create super admin
    const superAdmin = await User.create({
      email: 'mainelew25@gmail.com',
      username: 'tokentradex',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'admin',
      kycStatus: 'approved',
      isActive: true
    });

    console.log('✅ Super Admin account created successfully!');
    console.log('Email: mainelew25@gmail.com');
    console.log('Password: Admin123!');
    console.log('Role:', superAdmin.role);
    console.log('\n🔒 This is the ONLY account that can create other admins!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();
