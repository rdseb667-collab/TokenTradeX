const jwt = require('jsonwebtoken');
const { User } = require('../src/models');
const { sequelize } = require('../src/config/database');

async function generateSuperAdminToken() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Find the super admin user
    const superAdminEmail = 'mainelew25@gmail.com';
    const user = await User.findOne({ where: { email: superAdminEmail } });
    
    if (!user) {
      console.log('Super admin user not found!');
      process.exit(1);
    }
    
    if (user.role !== 'super_admin') {
      console.log('User found but is not a super admin!');
      process.exit(1);
    }
    
    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'dev_secret';
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    
    // Create token that expires in 24 hours
    const token = jwt.sign(payload, secret, { expiresIn: '24h' });
    
    console.log('Super admin token generated successfully!');
    console.log('\nUser Details:');
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`User ID: ${user.id}`);
    
    console.log('\nAuthorization Header:');
    console.log(`Authorization: Bearer ${token}`);
    
    console.log('\nYou can use this token in your API requests by adding it to the Authorization header.');
    
    await sequelize.close();
    
    return token;
  } catch (error) {
    console.error('Error generating super admin token:', error);
    process.exit(1);
  }
}

generateSuperAdminToken();