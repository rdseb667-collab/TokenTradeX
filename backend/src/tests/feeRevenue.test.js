const request = require('supertest');
const app = require('../server');
const { User, Token, Trade } = require('../models');
const { sequelize } = require('../config/database');

describe('Fee Revenue Metrics', () => {
  let adminUser;
  let adminAuthToken;

  beforeAll(async () => {
    // Clean up any existing test data
    await Trade.destroy({ where: {} });
    await User.destroy({ where: { email: 'test_admin_fee@example.com' } });
    
    // Create test admin user
    adminUser = await User.create({
      email: 'test_admin_fee@example.com',
      username: 'testadminfee',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'AdminFee',
      role: 'admin',
      kycStatus: 'approved',
      isActive: true
    });

    // Get admin auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test_admin_fee@example.com',
        password: 'Test123!'
      });

    adminAuthToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await Trade.destroy({ where: {} });
    await User.destroy({ where: { email: 'test_admin_fee@example.com' } });
    await sequelize.close();
  });

  it('should return fee revenue metrics for different time periods', async () => {
    const response = await request(app)
      .get('/api/admin/metrics/fee-revenue')
      .set('Authorization', `Bearer ${adminAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.totalFees24h).toBeDefined();
    expect(response.body.data.totalFees7d).toBeDefined();
    expect(response.body.data.totalFees30d).toBeDefined();
  });

  it('should include breakdown by asset in fee revenue metrics', async () => {
    const response = await request(app)
      .get('/api/admin/metrics/fee-revenue')
      .set('Authorization', `Bearer ${adminAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.breakdown).toBeDefined();
    
    // The breakdown should be an array
    expect(Array.isArray(response.body.data.breakdown)).toBe(true);
  });

  it('should calculate fee revenue correctly', async () => {
    // Create some test trades with known fees
    const btcToken = await Token.findOne({ where: { symbol: 'BTC' } });
    
    if (btcToken) {
      await Trade.create({
        buyOrderId: 'test-buy-order-1',
        sellOrderId: 'test-sell-order-1',
        buyerId: adminUser.id,
        sellerId: adminUser.id,
        tokenId: btcToken.id,
        tokenSymbol: 'BTC',
        price: 45000,
        quantity: 0.1,
        totalValue: 4500,
        buyerFee: 5.4, // 0.12% of 4500
        sellerFee: 5.4, // 0.12% of 4500
        tradeType: 'spot'
      });
    }

    const response = await request(app)
      .get('/api/admin/metrics/fee-revenue')
      .set('Authorization', `Bearer ${adminAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // The total fees should include the test trade fees
    const totalFees = response.body.data.totalFees24h;
    expect(totalFees).toBeGreaterThanOrEqual(10.8); // 5.4 + 5.4
  });

  it('should allow filtering fee revenue by number of days', async () => {
    const response = await request(app)
      .get('/api/admin/metrics/fee-revenue')
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .query({
        days: 7
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });
});