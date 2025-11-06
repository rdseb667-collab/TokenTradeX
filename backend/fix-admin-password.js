const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');

async function fixAdminPassword() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Find admin account
    const admin = await User.findOne({
      where: { email: 'admin@tokentradex.com' }
    });

    if (admin) {
      // Manually hash password (bypass the model hook issue)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123!', salt);
      
      // Update directly
      await sequelize.query(
        'UPDATE users SET password = :password WHERE email = :email',
        {
          replacements: { password: hashedPassword, email: 'admin@tokentradex.com' }
        }
      );

      console.log('✅ Admin password reset successfully!');
      console.log('Email: admin@tokentradex.com');
      console.log('Password: Admin123!');
    } else {
      console.log('❌ Admin account not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAdminPassword();
