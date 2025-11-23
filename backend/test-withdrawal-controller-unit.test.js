const { approveWithdrawal, rejectWithdrawal } = require('./src/controllers/adminController');
const { sequelize, User, Transaction, Token, Wallet } = require('./src/models');
const auditService = require('./src/services/auditService');

// Mock the request and response objects
const mockRequest = (params = {}, body = {}, user = {}, headers = {}) => ({
  params,
  body,
  user,
  headers,
  ip: '127.0.0.1',
  get: (header) => headers[header] || null
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock sequelize transaction
jest.mock('./src/config/database', () => {
  return {
    sequelize: {
      transaction: jest.fn().mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn()
      })
    }
  };
});

// Mock audit service
jest.mock('./src/services/auditService', () => {
  return {
    log: jest.fn().mockResolvedValue({}),
    logAction: jest.fn().mockResolvedValue({})
  };
});

describe('Admin Withdrawal Controller - Unit Tests', () => {
  let testUser;
  let testToken;
  let testWallet;
  let testWithdrawal;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
    
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
      // Mock the Transaction.findOne to return our test withdrawal with associations
      const mockWithdrawal = {
        ...testWithdrawal.toJSON(),
        user: {
          email: testUser.email,
          username: testUser.username
        },
        token: testToken.toJSON(),
        update: jest.fn().mockResolvedValue()
      };
      
      // Mock the Transaction model
      jest.spyOn(Transaction, 'findOne').mockResolvedValue(mockWithdrawal);
      
      const req = mockRequest(
        { transactionId: testWithdrawal.id },
        { txHash: null, notes: 'Test approval' },
        { id: 'admin-user-id', email: 'admin@test.com', role: 'super_admin' },
        { 'user-agent': 'test-agent' }
      );
      
      const res = mockResponse();
      
      await approveWithdrawal(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Withdrawal approved successfully',
        withdrawal: expect.any(Object)
      });
      
      // Check that the withdrawal update method was called
      expect(mockWithdrawal.update).toHaveBeenCalled();
      
      // Check that audit service was called with correct payload
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 'admin-user-id',
        action: 'APPROVE_WITHDRAWAL',
        resourceType: 'Transaction',
        resourceId: testWithdrawal.id,
        details: {
          amount: parseFloat(testWithdrawal.amount),
          token: testToken.symbol,
          user: testUser.email,
          txHash: null,
          adminNotes: 'Test approval'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
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
      
      // Mock the Transaction.findOne to return our test withdrawal with associations
      const mockWithdrawal = {
        ...rejectionWithdrawal.toJSON(),
        user: {
          email: testUser.email,
          username: testUser.username
        },
        token: testToken.toJSON(),
        update: jest.fn().mockResolvedValue()
      };
      
      // Mock the Wallet.findOne to return our test wallet
      const mockWallet = {
        ...testWallet.toJSON(),
        update: jest.fn().mockResolvedValue()
      };
      
      // Mock the models
      jest.spyOn(Transaction, 'findOne').mockResolvedValue(mockWithdrawal);
      jest.spyOn(Wallet, 'findOne').mockResolvedValue(mockWallet);
      
      const req = mockRequest(
        { transactionId: rejectionWithdrawal.id },
        { reason: 'Test rejection reason' },
        { id: 'admin-user-id', email: 'admin@test.com', role: 'super_admin' },
        { 'user-agent': 'test-agent' }
      );
      
      const res = mockResponse();
      
      await rejectWithdrawal(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Withdrawal rejected and amount refunded',
        withdrawal: expect.any(Object),
        refundedAmount: parseFloat(rejectionWithdrawal.amount)
      });
      
      // Check that the withdrawal update method was called
      expect(mockWithdrawal.update).toHaveBeenCalled();
      
      // Check that the wallet update method was called
      expect(mockWallet.update).toHaveBeenCalled();
      
      // Check that audit service was called with correct payload
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 'admin-user-id',
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
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      });
    });
  });
});