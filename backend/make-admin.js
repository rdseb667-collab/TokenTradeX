const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');

async function makeAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Find all users first
    const users = await User.findAll();
    console.log('\nFound users:');
    users.forEach(u => {
      console.log(`- ${u.username} (${u.email}) - Role: ${u.role}`);
    });

    // Find Sebastian Martinez user by username
    let user = await User.findOne({
      where: { username: 'sebastianmartinez26' }
    });

    if (!user) {
      user = await User.findOne({
        where: { email: 'sebastianmartinez26work@gmail.com' }
      });
    }

    if (!user && users.length > 0) {
      // Use the first user if no specific match
      user = users[0];
      console.log('\nUsing first user found...');
    }

    if (user) {
      // Update to admin
      await user.update({
        role: 'admin',
        kycStatus: 'approved',
        isActive: true
      });

      console.log('✅ User updated to admin successfully!');
      console.log('Email:', user.email);
      console.log('Username:', user.username);
      console.log('Role:', user.role);
      console.log('KYC Status:', user.kycStatus);
    } else {
      console.log('❌ User not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

makeAdmin();
