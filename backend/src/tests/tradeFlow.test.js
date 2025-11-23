const request = require('supertest');
const app = require('../server');
const { User, Token, Wallet, Order, Trade } = require('../models');
const { sequelize } = require('../config/database');

describe('Basic Trade Flow', () => {
  let user1, user2, usdtToken, btcToken, user1USDTWallet, user1BTCWallet, user2USDTWallet, user2BTCWallet;

  beforeAll(async () => {
    // Clean up any existing test data
    await Order.destroy({ where: {} });
    await Trade.destroy({ where: {} });
    await Wallet.destroy({ where: {} });
    await User.destroy({ where: { email: 'test1@example.com' } });
    await User.destroy({ where: { email: 'test2@example.com' } });
    
    // Create test users
    user1 = await User.create({
      email: 'test1@example.com',
      username: 'testuser1',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User1',
      role: 'trader',
      kycStatus: 'approved',
      isActive: true
    });

    user2 = await User.create({
      email: 'test2@example.com',
      username: 'testuser2',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User2',
      role: 'trader',
      kycStatus: 'approved',
      isActive: true
    });

    // Get tokens
    usdtToken = await Token.findOne({ where: { symbol: 'USDT' } });
    btcToken = await Token.findOne({ where: { symbol: 'BTC' } });

    if (!usdtToken || !btcToken) {
      throw new Error('Required tokens (USDT, BTC) not found in database');
    }

    // Create wallets for both users
    user1USDTWallet = await Wallet.create({
      userId: user1.id,
      tokenId: usdtToken.id,
      balance: 100000, // $100,000
      lockedBalance: 0
    });

    user1BTCWallet = await Wallet.create({
      userId: user1.id,
      tokenId: btcToken.id,
      balance: 1, // 1 BTC
      lockedBalance: 0
    });

    user2USDTWallet = await Wallet.create({
      userId: user2.id,
      tokenId: usdtToken.id,
      balance: 100000, // $100,000
      lockedBalance: 0
    });

    user2BTCWallet = await Wallet.create({
      userId: user2.id,
      tokenId: btcToken.id,
      balance: 1, // 1 BTC
      lockedBalance: 0
    });
  });

  afterAll(async () => {
    // Clean up test data
    await Order.destroy({ where: {} });
    await Trade.destroy({ where: {} });
    await Wallet.destroy({ where: {} });
    await User.destroy({ where: { email: 'test1@example.com' } });
    await User.destroy({ where: { email: 'test2@example.com' } });
    await sequelize.close();
  });

  it('should successfully execute a trade between two users', async () => {
    // User 1 places a buy order for 0.1 BTC at $45,000
    const buyOrderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${user1.getJwtToken()}`)
      .send({
        tokenId: btcToken.id,
        orderType: 'limit',
        side: 'buy',
        price: 45000,
        quantity: 0.1
      });

    expect(buyOrderResponse.status).toBe(201);
    expect(buyOrderResponse.body.success).toBe(true);
    expect(buyOrderResponse.body.data.side).toBe('buy');
    expect(buyOrderResponse.body.data.quantity).toBe(0.1);
    expect(buyOrderResponse.body.data.price).toBe(45000);

    // User 2 places a sell order for 0.1 BTC at $45,000
    const sellOrderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${user2.getJwtToken()}`)
      .send({
        tokenId: btcToken.id,
        orderType: 'limit',
        side: 'sell',
        price: 45000,
        quantity: 0.1
      });

    expect(sellOrderResponse.status).toBe(201);
    expect(sellOrderResponse.body.success).toBe(true);
    expect(sellOrderResponse.body.data.side).toBe('sell');
    expect(sellOrderResponse.body.data.quantity).toBe(0.1);
    expect(sellOrderResponse.body.data.price).toBe(45000);

    // Wait a moment for order matching to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check that a trade was created
    const trades = await Trade.findAll({
      where: {
        tokenId: btcToken.id
      }
    });

    expect(trades.length).toBeGreaterThan(0);
    
    const trade = trades[0];
    expect(trade.buyerId).toBe(user1.id);
    expect(trade.sellerId).toBe(user2.id);
    expect(parseFloat(trade.quantity)).toBe(0.1);
    expect(parseFloat(trade.price)).toBe(45000);
    expect(parseFloat(trade.totalValue)).toBe(4500); // 0.1 * 45000

    // Check that balances were updated correctly
    const updatedUser1USDTWallet = await Wallet.findByPk(user1USDTWallet.id);
    const updatedUser1BTCWallet = await Wallet.findByPk(user1BTCWallet.id);
    const updatedUser2USDTWallet = await Wallet.findByPk(user2USDTWallet.id);
    const updatedUser2BTCWallet = await Wallet.findByPk(user2BTCWallet.id);

    // User 1 should have spent ~$4500 USDT (plus fees) and gained 0.1 BTC
    expect(parseFloat(updatedUser1USDTWallet.balance)).toBeLessThan(100000);
    expect(parseFloat(updatedUser1BTCWallet.balance)).toBeGreaterThan(1);

    // User 2 should have gained ~$4500 USDT (minus fees) and lost 0.1 BTC
    expect(parseFloat(updatedUser2USDTWallet.balance)).toBeGreaterThan(100000);
    expect(parseFloat(updatedUser2BTCWallet.balance)).toBeLessThan(1);
  });

  it('should show the trade in trade history', async () => {
    const tradeHistoryResponse = await request(app)
      .get('/api/trades')
      .set('Authorization', `Bearer ${user1.getJwtToken()}`);

    expect(tradeHistoryResponse.status).toBe(200);
    expect(tradeHistoryResponse.body.success).toBe(true);
    expect(tradeHistoryResponse.body.data.length).toBeGreaterThan(0);
    
    const trade = tradeHistoryResponse.body.data[0];
    expect(trade.tokenId).toBe(btcToken.id);
    expect(parseFloat(trade.quantity)).toBe(0.1);
    expect(parseFloat(trade.price)).toBe(45000);
  });
});