const request = require('supertest');
const { sequelize, User, Transaction, Token, Wallet } = require('./src/models');
const { app } = require('./src/server'); // The Express app is exported from server.js

// Mock the audit service to verify it's called correctly
jest.mock('./src/services/auditService', () => {
  return {
    log: jest.fn().mockResolvedValue({}),
    logAction: jest.fn().mockResolvedValue({})
  };
});

const auditService = require('./src/services/auditService');

describe('Admin Withdrawal Controller', () => {
  let adminUser;
  let testUser;
  let testToken;
  let testWallet;
  let testWithdrawal;
  let valid2FAToken;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
    
    // Create admin user
    adminUser = await User.create({
      email: 'admin@test.com',
      username: 'admin',
      password: 'Admin123!',
      role: 'super_admin',
      twoFactorEnabled: true,
      twoFactorSecret: 'SECRET_FOR_TESTING'
    });
    
    // Create test user
    testUser = await User.create({
      email: 'user@test.com',
      username: 'testuser',
      password: 'User123!',
      role: 'user'
    });
    
    // Create test token
    testToken = await Token.create({
      symbol: 'TEST',
      name: 'Test Token',
      totalSupply: '1000000',
      circulatingSupply: '500000',
      currentPrice: '1.00',
      isActive: true
    });
    
    // Create user wallet
    testWallet = await Wallet.create({
      userId: testUser.id,
      tokenId: testToken.id,
      balance: '1000.00000000',
      lockedBalance: '0.00000000'
    });
    
    // Create test withdrawal
    testWithdrawal = await Transaction.create({
      userId: testUser.id,
      tokenId: testToken.id,
      type: 'withdrawal',
      amount: '100.00000000',
      balanceBefore: '1000.00000000',
      balanceAfter: '900.00000000',
      status: 'pending',
      reference: 'test-withdrawal-reference'
    });
    
    // Generate a valid 2FA token for testing (this would be a mock in real tests)
    valid2FAToken = '123456';
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('approveWithdrawal', () => {
    it('should approve a withdrawal successfully and update status to completed', async () => {
      // Generate JWT token for admin user
      const jwtToken = 'mock-jwt-token'; // In real tests, you'd generate a real JWT
      
      const response = await request(app)
        .post(`/api/admin/withdrawals/${testWithdrawal.id}/approve`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('X-2FA-Token', valid2FAToken)
        .send({})
        .expect(200);
      
      // Assertions
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Withdrawal approved successfully');
      
      // Check that the withdrawal status was updated
      const updatedWithdrawal = await Transaction.findByPk(testWithdrawal.id);
      expect(updatedWithdrawal.status).toBe('completed');
      
      // Check that audit service was called with correct payload
      expect(auditService.log).toHaveBeenCalledWith({
        userId: adminUser.id,
        action: 'APPROVE_WITHDRAWAL',
        resourceType: 'Transaction',
        resourceId: testWithdrawal.id,
        details: {
          amount: parseFloat(testWithdrawal.amount),
          token: testToken.symbol,
          user: testUser.email,
          txHash: null,
          adminNotes: undefined
        },
        ipAddress: expect.any(String),
        userAgent: expect.any(String)
      });
    });
  });

  describe('rejectWithdrawal', () => {
    it('should reject a withdrawal successfully and update status to cancelled', async () => {
      // Create a new withdrawal for rejection test
      const rejectionWithdrawal = await Transaction.create({
        userId: testUser.id,
        tokenId: testToken.id,
        type: 'withdrawal',
        amount: '50.00000000',
        balanceBefore: '900.00000000',
        balanceAfter: '850.00000000',
        status: 'pending',
        reference: 'test-rejection-reference'
      });
      
      // Generate JWT token for admin user
      const jwtToken = 'mock-jwt-token'; // In real tests, you'd generate a real JWT
      
      const response = await request(app)
        .post(`/api/admin/withdrawals/${rejectionWithdrawal.id}/reject`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('X-2FA-Token', valid2FAToken)
        .send({ reason: 'Test rejection reason' })
        .expect(200);
      
      // Assertions
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Withdrawal rejected and amount refunded');
      
      // Check that the withdrawal status was updated
      const updatedWithdrawal = await Transaction.findByPk(rejectionWithdrawal.id);
      expect(updatedWithdrawal.status).toBe('cancelled');
      
      // Check that audit service was called with correct payload
      expect(auditService.log).toHaveBeenCalledWith({
        userId: adminUser.id,
        action: 'REJECT_WITHDRAWAL',
        resourceType: 'Transaction',
        resourceId: rejectionWithdrawal.id,
        details: {
          amount: parseFloat(rejectionWithdrawal.amount),
          token: testToken.symbol,
          user: testUser.email,
          reason: 'Test rejection reason',
          refunded: true
        },
        ipAddress: expect.any(String),
        userAgent: expect.any(String)
      });
    });
  });
});