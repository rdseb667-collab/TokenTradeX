const { User } = require('../src/models');
const { sequelize } = require('../src/config/database');

async function check2FA() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    
    const user = await User.findOne({ where: { email: 'mainelew25@gmail.com' } });
    
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    console.log('User 2FA status:');
    console.log('- 2FA Enabled:', user.twoFactorEnabled);
    console.log('- 2FA Secret:', user.twoFactorSecret ? 'SET' : 'NOT SET');
    console.log('- Role:', user.role);
    
    await sequelize.close();
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    process.exit(1);
  }
}

check2FA();