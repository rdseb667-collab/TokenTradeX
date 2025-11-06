const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin123!', salt);

    // Create admin user
    const admin = await User.create({
      email: 'admin@tokentradex.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      kycStatus: 'approved',
      isActive: true
    });

    console.log('✅ Admin account created successfully!');
    console.log('Email: admin@tokentradex.com');
    console.log('Password: Admin123!');
    console.log('Role:', admin.role);

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
