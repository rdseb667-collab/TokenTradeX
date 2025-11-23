const { Transaction, User, Token } = require('../src/models');
const { sequelize } = require('../src/config/database');

async function testAssociations() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    
    console.log('Transaction associations:', Object.keys(Transaction.associations));
    console.log('User associations:', Object.keys(User.associations));
    console.log('Token associations:', Object.keys(Token.associations));
    
    // Test the query that's failing
    console.log('\nTesting query...');
    const result = await Transaction.findAndCountAll({
      where: {
        type: 'withdrawal',
        status: 'pending'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'username', 'kycStatus']
        },
        {
          model: Token,
          as: 'token',
          attributes: ['id', 'symbol', 'name', 'currentPrice']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
      offset: 0
    });
    
    console.log('Query successful!');
    console.log('Count:', result.count);
    console.log('Rows:', result.rows.length);
    
    await sequelize.close();
  } catch (error) {
    console.error('Error testing associations:', error);
    process.exit(1);
  }
}

testAssociations();