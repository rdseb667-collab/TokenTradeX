const request = require('supertest');
const app = require('../server');
const { User, Token, Wallet, Transaction } = require('../models');
const { sequelize } = require('../config/database');

describe('Deposit History Endpoint', () => {
  let user, usdtToken, userWallet;
  let authToken;

  beforeAll(async () => {
    // Clean up any existing test data
    await Transaction.destroy({ where: {} });
    await Wallet.destroy({ where: {} });
    await User.destroy({ where: { email: 'test_history@example.com' } });
    
    // Create test user
    user = await User.create({
      email: 'test_history@example.com',
      username: 'testhistory',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'History',
      role: 'trader',
      kycStatus: 'approved',
      isActive: true
    });

    // Get USDT token
    usdtToken = await Token.findOne({ where: { symbol: 'USDT' } });

    if (!usdtToken) {
      throw new Error('USDT token not found in database');
    }

    // Create wallet for user
    userWallet = await Wallet.create({
      userId: user.id,
      tokenId: usdtToken.id,
      balance: 10000,
      lockedBalance: 0
    });

    // Create some test transactions
    await Transaction.bulkCreate([
      {
        userId: user.id,
        tokenId: usdtToken.id,
        type: 'deposit',
        amount: 1000,
        balanceBefore: 0,
        balanceAfter: 1000,
        status: 'completed',
        reference: 'test_deposit_1',
        notes: 'Test deposit 1'
      },
      {
        userId: user.id,
        tokenId: usdtToken.id,
        type: 'withdrawal',
        amount: 250,
        balanceBefore: 1000,
        balanceAfter: 750,
        status: 'completed',
        reference: 'test_withdrawal_1',
        notes: 'Test withdrawal 1'
      },
      {
        userId: user.id,
        tokenId: usdtToken.id,
        type: 'deposit',
        amount: 500,
        balanceBefore: 750,
        balanceAfter: 1250,
        status: 'completed',
        reference: 'test_deposit_2',
        notes: 'Test deposit 2'
      }
    ]);

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test_history@example.com',
        password: 'Test123!'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await Transaction.destroy({ where: {} });
    await Wallet.destroy({ where: {} });
    await User.destroy({ where: { email: 'test_history@example.com' } });
    await sequelize.close();
  });

  it('should return user transaction history with pagination', async () => {
    const response = await request(app)
      .get('/api/wallet/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        page: 1,
        limit: 2
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.currentPage).toBe(1);
    expect(response.body.pagination.itemsPerPage).toBe(2);
    expect(response.body.pagination.totalItems).toBe(3);
    expect(response.body.pagination.totalPages).toBe(2);
  });

  it('should filter transactions by type', async () => {
    const response = await request(app)
      .get('/api/wallet/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        type: 'deposit'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    response.body.data.forEach(transaction => {
      expect(transaction.type).toBe('deposit');
    });
  });

  it('should only return transactions for the authenticated user', async () => {
    // Create another user to verify isolation
    const otherUser = await User.create({
      email: 'other_user@example.com',
      username: 'otheruser',
      password: 'Test123!',
      firstName: 'Other',
      lastName: 'User',
      role: 'trader',
      kycStatus: 'approved',
      isActive: true
    });

    const otherLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'other_user@example.com',
        password: 'Test123!'
      });

    const otherAuthToken = otherLoginResponse.body.token;

    const response = await request(app)
      .get('/api/wallet/transactions')
      .set('Authorization', `Bearer ${otherAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(0);

    // Clean up other user
    await User.destroy({ where: { email: 'other_user@example.com' } });
  });

  it('should include token information in transaction data', async () => {
    const response = await request(app)
      .get('/api/wallet/transactions')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0].token).toBeDefined();
    expect(response.body.data[0].token.symbol).toBe('USDT');
  });
});