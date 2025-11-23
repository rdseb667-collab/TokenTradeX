const speakeasy = require('speakeasy');
const { User } = require('../src/models');
const { sequelize } = require('../src/config/database');

async function generate2FAToken() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    
    const user = await User.findOne({ where: { email: 'mainelew25@gmail.com' } });
    
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      console.log('2FA is not enabled for this user!');
      return;
    }
    
    // Generate a 2FA token
    const token = speakeasy.totp({
      secret: user.twoFactorSecret,
      encoding: 'base32'
    });
    
    console.log('Generated 2FA Token:', token);
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    
    // Verify the token works
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    console.log('Token verification:', verified ? 'VALID' : 'INVALID');
    
    await sequelize.close();
    
    return token;
  } catch (error) {
    console.error('Error generating 2FA token:', error);
    process.exit(1);
  }
}

generate2FAToken();