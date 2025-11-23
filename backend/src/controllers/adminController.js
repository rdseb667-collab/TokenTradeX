const { User, Token, Wallet, Trade, Transaction } = require('../models');
const { Op } = require('sequelize');
const auditService = require('../services/auditService');
const revenueDefenseService = require('../services/revenueDefenseService');
const privacyComplianceService = require('../services/privacyComplianceService');

class AdminController {
  constructor() {
    // Bind all methods
    this.getOverviewStats = this.getOverviewStats.bind(this);
    this.getUserStats = this.getUserStats.bind(this);
    this.getTokenStats = this.getTokenStats.bind(this);
    this.getRevenueStats = this.getRevenueStats.bind(this);
    this.getAllUsers = this.getAllUsers.bind(this);
    this.getUserDetails = this.getUserDetails.bind(this);
    this.updateKYCStatus = this.updateKYCStatus.bind(this);
    this.updateUserRole = this.updateUserRole.bind(this);
    this.updateUserStatus = this.updateUserStatus.bind(this);
    this.enableFractionalTrading = this.enableFractionalTrading.bind(this);
    this.updateFractionalSettings = this.updateFractionalSettings.bind(this);
    this.getFractionalHolders = this.getFractionalHolders.bind(this);
    this.getPendingRWAAssets = this.getPendingRWAAssets.bind(this);
    this.approveRWAAsset = this.approveRWAAsset.bind(this);
    this.rejectRWAAsset = this.rejectRWAAsset.bind(this);
    this.deleteRWAAsset = this.deleteRWAAsset.bind(this);
    this.getAllAutomationSchedules = this.getAllAutomationSchedules.bind(this);
    this.manuallyExecutePayment = this.manuallyExecutePayment.bind(this);
    this.deleteAutomationSchedule = this.deleteAutomationSchedule.bind(this);
    this.getAuditLogs = this.getAuditLogs.bind(this);
    this.generateComplianceReport = this.generateComplianceReport.bind(this);
    this.getDividendOverview = this.getDividendOverview.bind(this);
    this.getPendingWithdrawals = this.getPendingWithdrawals.bind(this);
    this.approveWithdrawal = this.approveWithdrawal.bind(this);
    this.rejectWithdrawal = this.rejectWithdrawal.bind(this);
    this.getRevenueDefenseStatus = this.getRevenueDefenseStatus.bind(this);
    this.getRevenueConcentration = this.getRevenueConcentration.bind(this);
    this.getNegativeFlows = this.getNegativeFlows.bind(this);
    this.getMissingRevenueEvents = this.getMissingRevenueEvents.bind(this);
    this.requestParameterChange = this.requestParameterChange.bind(this);
    this.getPendingParameterChanges = this.getPendingParameterChanges.bind(this);
    this.getDataDeletionRequests = this.getDataDeletionRequests.bind(this);
    this.executeDataDeletion = this.executeDataDeletion.bind(this);
    this.getDataAccessLogs = this.getDataAccessLogs.bind(this);
    this.getUserConsents = this.getUserConsents.bind(this);
    this.getPrivacyComplianceReport = this.getPrivacyComplianceReport.bind(this);
  }

  /**
   * GET OVERVIEW STATISTICS
   */
  async getOverviewStats(req, res) {
    try {
      const [totalUsers, totalTokens, totalTrades] = await Promise.all([
        User.count(),
        Token.count({ where: { isActive: true } }),
        Trade.count()
      ]);

      const totalVolume = await Trade.sum('totalValue') || 0;

      res.json({
        success: true,
        stats: {
          totalUsers,
          totalTokens,
          totalTrades,
          totalVolume: parseFloat(totalVolume)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching overview stats',
        error: error.message
      });
    }
  }

  /**
   * GET USER STATISTICS
   */
  async getUserStats(req, res) {
    try {
      const total = await User.count();
      const activeUsers = await User.count({ where: { isActive: true } });
      const pendingKYC = await User.count({ where: { kycStatus: 'pending' } });
      const approvedKYC = await User.count({ where: { kycStatus: 'approved' } });

      res.json({
        success: true,
        total,
        activeUsers,
        pendingKYC,
        approvedKYC,
        stats: {
          total,
          active: activeUsers,
          pendingKYC,
          approvedKYC
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching user stats',
        error: error.message
      });
    }
  }

  /**
   * GET TOKEN STATISTICS
   */
  async getTokenStats(req, res) {
    try {
      const active = await Token.count({ where: { isActive: true } });
      const rwaAssets = await Token.count({
        where: {
          assetCategory: { [Op.ne]: null }
        }
      });

      const totalMarketCap = await Token.sum('marketCap', {
        where: { isActive: true }
      }) || 0;

      const volume = await Trade.sum('totalValue') || 0;

      // Count unique fractional holders
      const fractionalHolders = await Wallet.count({
        distinct: true,
        col: 'userId',
        where: {
          balance: { [Op.gt]: 0 }
        }
      });

      res.json({
        success: true,
        active,
        rwaAssets,
        totalMarketCap: parseFloat(totalMarketCap),
        volume: parseFloat(volume),
        fractionalHolders
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching token stats',
        error: error.message
      });
    }
  }

  /**
   * GET REVENUE STATISTICS
   */
  async getRevenueStats(req, res) {
    try {
      const totalFees = await Trade.sum('buyerFee') || 0;
      const sellerFees = await Trade.sum('sellerFee') || 0;
      const totalRevenue = parseFloat(totalFees) + parseFloat(sellerFees);

      res.json({
        success: true,
        stats: {
          totalRevenue,
          tradingFees: totalRevenue,
          breakdown: {
            buyerFees: parseFloat(totalFees),
            sellerFees: parseFloat(sellerFees)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching revenue stats',
        error: error.message
      });
    }
  }

  /**
   * GET FEE REVENUE METRICS
   */
  async getFeeRevenueMetrics(req, res) {
    try {
      const { days = 30 } = req.query;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Get total fees for different periods
      const totalFees24h = await Trade.sum('buyerFee', {
        where: {
          createdAt: {
            [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }) || 0;
      
      const sellerFees24h = await Trade.sum('sellerFee', {
        where: {
          createdAt: {
            [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }) || 0;

      const totalFees7d = await Trade.sum('buyerFee', {
        where: {
          createdAt: {
            [Op.gt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }) || 0;
      
      const sellerFees7d = await Trade.sum('sellerFee', {
        where: {
          createdAt: {
            [Op.gt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }) || 0;

      const totalFees30d = await Trade.sum('buyerFee', {
        where: {
          createdAt: {
            [Op.gt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }) || 0;
      
      const sellerFees30d = await Trade.sum('sellerFee', {
        where: {
          createdAt: {
            [Op.gt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }) || 0;

      // Breakdown by asset
      const assetBreakdown = await Trade.findAll({
        attributes: [
          'tokenId',
          [sequelize.fn('SUM', sequelize.col('buyerFee')), 'totalBuyerFees'],
          [sequelize.fn('SUM', sequelize.col('sellerFee')), 'totalSellerFees'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'tradeCount']
        ],
        include: [{
          model: Token,
          as: 'token',
          attributes: ['symbol', 'name']
        }],
        group: ['tokenId', 'token.id'],
        order: [[sequelize.fn('SUM', sequelize.col('buyerFee')), 'DESC']],
        limit: 10
      });

      const formattedBreakdown = assetBreakdown.map(item => ({
        tokenId: item.tokenId,
        symbol: item.token ? item.token.symbol : 'Unknown',
        name: item.token ? item.token.name : 'Unknown Token',
        totalBuyerFees: parseFloat(item.dataValues.totalBuyerFees || 0),
        totalSellerFees: parseFloat(item.dataValues.totalSellerFees || 0),
        totalFees: parseFloat(item.dataValues.totalBuyerFees || 0) + parseFloat(item.dataValues.totalSellerFees || 0),
        tradeCount: parseInt(item.dataValues.tradeCount || 0)
      }));

      res.json({
        success: true,
        data: {
          totalFees24h: parseFloat(totalFees24h) + parseFloat(sellerFees24h),
          totalFees7d: parseFloat(totalFees7d) + parseFloat(sellerFees7d),
          totalFees30d: parseFloat(totalFees30d) + parseFloat(sellerFees30d),
          breakdown: formattedBreakdown
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'ERROR_FETCHING_FEE_METRICS',
        error: error.message
      });
    }
  }

  /**
   * GET ALL USERS (with pagination)
   */
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 50, kycStatus, role } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (kycStatus) where.kycStatus = kycStatus;
      if (role) where.role = role;

      const { count, rows: users } = await User.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['password', 'twoFactorSecret'] }
      });

      res.json({
        success: true,
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching users',
        error: error.message
      });
    }
  }

  /**
   * GET USER DETAILS
   */
  async getUserDetails(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password', 'twoFactorSecret'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get user's wallets and trades
      const wallets = await Wallet.findAll({ where: { userId } });
      const trades = await Trade.count({ where: { userId } });

      res.json({
        success: true,
        user,
        wallets,
        tradeCount: trades
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching user details',
        error: error.message
      });
    }
  }

  /**
   * UPDATE KYC STATUS
   */
  async updateKYCStatus(req, res) {
    try {
      const { userId } = req.params;
      const { kycStatus } = req.body;

      if (!['pending', 'approved', 'rejected', 'not_submitted'].includes(kycStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid KYC status'
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      user.kycStatus = kycStatus;
      await user.save();

      res.json({
        success: true,
        message: 'KYC status updated',
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating KYC status',
        error: error.message
      });
    }
  }

  /**
   * UPDATE USER ROLE - WITH AUDIT LOGGING
   */
  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // SECURITY: Prevent assignment of super_admin role through this endpoint
      if (role === 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'CANNOT_ASSIGN_SUPER_ADMIN',
          error: 'Cannot assign super_admin role through this endpoint'
        });
      }

      if (!['user', 'admin', 'trader'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'INVALID_ROLE',
          error: 'Invalid role'
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'USER_NOT_FOUND',
          error: 'User not found'
        });
      }

      // SECURITY: Prevent modifying super_admin accounts
      if (user.role === 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'CANNOT_MODIFY_SUPER_ADMIN',
          error: 'Cannot modify super administrator account'
        });
      }

      const oldRole = user.role;
      user.role = role;
      await user.save();

      // AUDIT: Log role change
      await auditService.log({
        userId: req.user.id,
        action: 'UPDATE_ROLE',
        resourceType: 'User',
        resourceId: userId,
        details: {
          targetUserId: userId,
          oldRole,
          newRole: role,
          changedBy: req.user.email
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: 'User role updated',
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'ERROR_UPDATING_USER_ROLE',
        error: error.message
      });
    }
  }

  /**
   * UPDATE USER STATUS (active/inactive) - WITH AUDIT LOGGING
   */
  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'USER_NOT_FOUND',
          error: 'User not found'
        });
      }

      // SECURITY: Prevent disabling super_admin
      if (user.role === 'super_admin' && !isActive) {
        return res.status(403).json({
          success: false,
          message: 'CANNOT_DEACTIVATE_SUPER_ADMIN',
          error: 'Cannot deactivate super administrator account'
        });
      }

      const oldStatus = user.isActive;
      user.isActive = isActive;
      await user.save();

      // AUDIT: Log status change
      await auditService.log({
        userId: req.user.id,
        action: 'UPDATE_USER_STATUS',
        resourceType: 'User',
        resourceId: userId,
        details: {
          targetUserId: userId,
          oldStatus,
          newStatus: isActive,
          changedBy: req.user.email
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'}`,
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'ERROR_UPDATING_USER_STATUS',
        error: error.message
      });
    }
  }

  /**
   * ENABLE FRACTIONAL TRADING FOR TOKEN
   */
  async enableFractionalTrading(req, res) {
    try {
      const { tokenId } = req.params;

      const token = await Token.findByPk(tokenId);
      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      // Add fractional trading metadata
      const updatedAsset = {
        ...token.underlyingAsset,
        fractionalTradingEnabled: true,
        tokensPerShare: 1000, // BlackRock standard
        minFractionalAmount: 0.001
      };

      token.underlyingAsset = updatedAsset;
      await token.save();

      res.json({
        success: true,
        message: 'Fractional trading enabled',
        token
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error enabling fractional trading',
        error: error.message
      });
    }
  }

  /**
   * UPDATE FRACTIONAL SETTINGS
   */
  async updateFractionalSettings(req, res) {
    try {
      const { tokenId } = req.params;
      const { tokensPerShare, minFractionalAmount, maxFractionalAmount } = req.body;

      const token = await Token.findByPk(tokenId);
      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      const updatedAsset = {
        ...token.underlyingAsset,
        tokensPerShare: tokensPerShare || 1000,
        minFractionalAmount: minFractionalAmount || 0.001,
        maxFractionalAmount: maxFractionalAmount || 1000
      };

      token.underlyingAsset = updatedAsset;
      await token.save();

      res.json({
        success: true,
        message: 'Fractional settings updated',
        token
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating fractional settings',
        error: error.message
      });
    }
  }

  /**
   * GET FRACTIONAL HOLDERS
   */
  async getFractionalHolders(req, res) {
    try {
      const holders = await Wallet.findAll({
        where: {
          balance: { [Op.gt]: 0 }
        },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          },
          {
            model: Token,
            attributes: ['id', 'symbol', 'name']
          }
        ]
      });

      res.json({
        success: true,
        holders
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching fractional holders',
        error: error.message
      });
    }
  }

  /**
   * GET PENDING RWA ASSETS
   */
  async getPendingRWAAssets(req, res) {
    try {
      const pendingAssets = await Token.findAll({
        where: {
          isActive: false,
          assetCategory: { [Op.ne]: null }
        }
      });

      res.json({
        success: true,
        assets: pendingAssets
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching pending RWA assets',
        error: error.message
      });
    }
  }

  /**
   * APPROVE RWA ASSET
   */
  async approveRWAAsset(req, res) {
    try {
      const { tokenId } = req.params;

      const token = await Token.findByPk(tokenId);
      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      token.isActive = true;
      token.isTradingEnabled = true;
      await token.save();

      res.json({
        success: true,
        message: 'RWA asset approved',
        token
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error approving RWA asset',
        error: error.message
      });
    }
  }

  /**
   * REJECT RWA ASSET
   */
  async rejectRWAAsset(req, res) {
    try {
      const { tokenId } = req.params;
      const { reason } = req.body;

      const token = await Token.findByPk(tokenId);
      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      // Store rejection reason in metadata
      token.underlyingAsset = {
        ...token.underlyingAsset,
        rejectionReason: reason,
        rejectedAt: new Date()
      };
      await token.save();

      res.json({
        success: true,
        message: 'RWA asset rejected',
        token
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error rejecting RWA asset',
        error: error.message
      });
    }
  }

  /**
   * DELETE RWA ASSET
   */
  async deleteRWAAsset(req, res) {
    try {
      const { tokenId } = req.params;

      const token = await Token.findByPk(tokenId);
      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      await token.destroy();

      res.json({
        success: true,
        message: 'RWA asset deleted'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting RWA asset',
        error: error.message
      });
    }
  }

  // Placeholder methods for automation, audit, compliance
  async getAllAutomationSchedules(req, res) {
    res.json({ success: true, schedules: [] });
  }

  async manuallyExecutePayment(req, res) {
    res.json({ success: true, message: 'Payment executed' });
  }

  async deleteAutomationSchedule(req, res) {
    res.json({ success: true, message: 'Schedule deleted' });
  }

  async getAuditLogs(req, res) {
    res.json({ success: true, logs: [] });
  }

  async generateComplianceReport(req, res) {
    res.json({ success: true, report: {} });
  }

  /**
   * GET DIVIDEND AUTOMATION OVERVIEW
   */
  async getDividendOverview(req, res) {
    try {
      const dividendStocks = await Token.findAll({
        where: {
          assetCategory: 'stocks',
          dividendsEnabled: true,
          isActive: true
        },
        order: [['symbol', 'ASC']]
      });

      const overview = dividendStocks.map(stock => {
        const schedule = stock.underlyingAsset?.automationSchedule;
        return {
          symbol: stock.symbol,
          name: stock.name,
          totalSupply: stock.totalSupply,
          dividendPerToken: schedule?.amountPerToken || 0,
          frequency: schedule?.frequency || 'quarterly',
          nextPayment: schedule?.nextPaymentDate,
          lastPayment: schedule?.lastPaymentDate,
          totalPaid: schedule?.totalPaid || 0,
          paymentsExecuted: schedule?.paymentsExecuted || 0,
          active: schedule?.active || false,
          annualYield: stock.underlyingAsset?.dividendYield || 0,
          totalDividendPool: (schedule?.amountPerToken || 0) * parseFloat(stock.totalSupply)
        };
      });

      const totalDividendPool = overview.reduce((sum, stock) => sum + stock.totalDividendPool, 0);
      const activeSchedules = overview.filter(s => s.active).length;

      res.json({
        success: true,
        overview,
        summary: {
          totalStocks: dividendStocks.length,
          activeSchedules,
          totalQuarterlyDividendPool: totalDividendPool,
          totalAnnualDividendPool: totalDividendPool * 4
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching dividend overview',
        error: error.message
      });
    }
  }

  /**
   * GET PENDING WITHDRAWALS
   */
  async getPendingWithdrawals(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: withdrawals } = await Transaction.findAndCountAll({
        where: {
          type: 'withdrawal',
          status: 'pending'
        },
        include: [
          { association: 'user', attributes: ['id', 'email', 'username', 'kycStatus'] },
          { association: 'token', attributes: ['id', 'symbol', 'name', 'currentPrice'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      // Calculate USD values and add metadata
      const enrichedWithdrawals = withdrawals.map(w => {
        try {
          // Safely parse amount
          const amount = parseFloat(w.amount) || 0;
          
          // Safely get token price (default to 1 if not available)
          const tokenPrice = w.token?.currentPrice ? parseFloat(w.token.currentPrice) : 1;
          
          // Calculate USD value
          const usdValue = amount * tokenPrice;
          
          return {
            ...w.toJSON(),
            usdValue: isNaN(usdValue) ? 0 : usdValue,
            waitingTime: Math.floor((Date.now() - new Date(w.createdAt).getTime()) / (1000 * 60 * 60)) // hours
          };
        } catch (parseError) {
          console.error('Error parsing withdrawal data:', parseError);
          return {
            ...w.toJSON(),
            usdValue: 0,
            waitingTime: 0
          };
        }
      });

      res.json({
        success: true,
        withdrawals: enrichedWithdrawals,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error in getPendingWithdrawals:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching pending withdrawals',
        error: error.message
      });
    }
  }

  /**
   * APPROVE WITHDRAWAL - 2FA REQUIRED
   */
  async approveWithdrawal(req, res) {
    const { sequelize } = require('../config/database');
    const t = await sequelize.transaction();

    try {
      const { transactionId } = req.params;
      const { txHash, notes } = req.body;

      const withdrawal = await Transaction.findOne({
        where: {
          id: transactionId,
          type: 'withdrawal',
          status: 'pending'
        },
        include: [
          { association: 'user', attributes: ['email', 'username'] },
          { association: 'token' }
        ],
        transaction: t
      });

      if (!withdrawal) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'WITHDRAWAL_NOT_FOUND',
          error: 'Withdrawal not found or already processed'
        });
      }

      // Double-check that the withdrawal is still pending
      if (withdrawal.status !== 'pending') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'ALREADY_PROCESSED',
          error: `Withdrawal already processed (current status: ${withdrawal.status})`
        });
      }

      // Get user's current wallet balance to ensure they still have sufficient funds
      const wallet = await Wallet.findOne({
        where: {
          userId: withdrawal.userId,
          tokenId: withdrawal.tokenId
        },
        transaction: t
      });

      if (!wallet) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'WALLET_NOT_FOUND',
          error: 'User wallet not found'
        });
      }

      // Check if user still has sufficient balance
      const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);
      const withdrawalAmount = parseFloat(withdrawal.amount);
      
      if (availableBalance < withdrawalAmount) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'INSUFFICIENT_FUNDS',
          error: `User balance has dropped below withdrawal amount. Available: ${availableBalance.toFixed(4)} ${withdrawal.token.symbol}, Requested: ${withdrawalAmount.toFixed(4)} ${withdrawal.token.symbol}`
        });
      }

      // Update withdrawal to completed
      await withdrawal.update({
        status: 'completed',
        txHash: txHash || null,
        notes: notes ? `${withdrawal.notes} | Admin approved: ${notes}` : withdrawal.notes
      }, { transaction: t });

      // Log audit trail
      await auditService.log({
        userId: req.user.id,
        action: 'APPROVE_WITHDRAWAL',
        resourceType: 'Transaction',
        resourceId: transactionId,
        details: {
          amount: parseFloat(withdrawal.amount),
          token: withdrawal.token.symbol,
          user: withdrawal.user.email,
          txHash,
          adminNotes: notes
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      await t.commit();

      res.json({
        success: true,
        message: 'Withdrawal approved successfully',
        withdrawal: withdrawal.toJSON()
      });
    } catch (error) {
      await t.rollback();
      res.status(500).json({
        success: false,
        message: 'ERROR_APPROVING_WITHDRAWAL',
        error: error.message
      });
    }
  }

  /**
   * REJECT WITHDRAWAL - 2FA REQUIRED
   */
  async rejectWithdrawal(req, res) {
    const { sequelize } = require('../config/database');
    const t = await sequelize.transaction();

    try {
      const { transactionId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'MISSING_REASON',
          error: 'Rejection reason is required'
        });
      }

      const withdrawal = await Transaction.findOne({
        where: {
          id: transactionId,
          type: 'withdrawal',
          status: 'pending'
        },
        include: [
          { association: 'user', attributes: ['email', 'username'] },
          { association: 'token' }
        ],
        transaction: t
      });

      if (!withdrawal) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'WITHDRAWAL_NOT_FOUND',
          error: 'Withdrawal not found or already processed'
        });
      }

      // Double-check that the withdrawal is still pending
      if (withdrawal.status !== 'pending') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'ALREADY_PROCESSED',
          error: `Withdrawal already processed (current status: ${withdrawal.status})`
        });
      }

      // Get user's wallet to refund the amount
      const wallet = await Wallet.findOne({
        where: {
          userId: withdrawal.userId,
          tokenId: withdrawal.tokenId
        },
        transaction: t
      });

      if (!wallet) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'WALLET_NOT_FOUND',
          error: 'User wallet not found'
        });
      }

      // Refund the amount back to wallet (amount was already deducted)
      const refundAmount = parseFloat(withdrawal.amount);
      await wallet.update({
        balance: sequelize.literal(`balance + ${refundAmount}`)
      }, { transaction: t });

      // Update withdrawal to failed/cancelled
      await withdrawal.update({
        status: 'cancelled',
        notes: `${withdrawal.notes} | Admin rejected: ${reason}`
      }, { transaction: t });

      // Log audit trail
      await auditService.log({
        userId: req.user.id,
        action: 'REJECT_WITHDRAWAL',
        resourceType: 'Transaction',
        resourceId: transactionId,
        details: {
          amount: refundAmount,
          token: withdrawal.token.symbol,
          user: withdrawal.user.email,
          reason,
          refunded: true
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      await t.commit();

      res.json({
        success: true,
        message: 'Withdrawal rejected and amount refunded',
        withdrawal: withdrawal.toJSON(),
        refundedAmount: refundAmount
      });
    } catch (error) {
      await t.rollback();
      res.status(500).json({
        success: false,
        message: 'ERROR_REJECTING_WITHDRAWAL',
        error: error.message
      });
    }
  }

  /**
   * GET REVENUE DEFENSE STATUS
   * Returns comprehensive defense check results
   */
  async getRevenueDefenseStatus(req, res) {
    try {
      const results = await revenueDefenseService.runDefenseChecks();

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting revenue defense status',
        error: error.message
      });
    }
  }

  /**
   * GET REVENUE CONCENTRATION METRICS
   */
  async getRevenueConcentration(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date();
      start.setHours(0, 0, 0, 0);
      
      const end = endDate ? new Date(endDate) : new Date(start);
      end.setDate(end.getDate() + 1);

      const metrics = await revenueDefenseService.calculateRevenueConcentration(start, end);

      res.json({
        success: true,
        period: { start, end },
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error calculating revenue concentration',
        error: error.message
      });
    }
  }

  /**
   * GET NEGATIVE NET FLOWS (wash trading detection)
   */
  async getNegativeFlows(req, res) {
    try {
      const { days = 7 } = req.query;
      const results = await revenueDefenseService.detectNegativeNetFlows(parseInt(days));

      res.json({
        success: true,
        count: results.length,
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error detecting negative flows',
        error: error.message
      });
    }
  }

  /**
   * GET MISSING REVENUE EVENTS
   */
  async getMissingRevenueEvents(req, res) {
    try {
      const results = await revenueDefenseService.detectMissingRevenueEvents();

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error detecting missing revenue events',
        error: error.message
      });
    }
  }

  /**
   * REQUEST PARAMETER CHANGE (with timelock)
   * Requires 2FA
   */
  async requestParameterChange(req, res) {
    try {
      const { key, value } = req.body;

      if (!key || value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Key and value are required'
        });
      }

      // Validate parameter
      const allowedKeys = [
        'TRADING_FEE_MAKER_BPS',
        'TRADING_FEE_TAKER_BPS',
        'MAX_MAKER_REBATE_BPS',
        'MAX_TAKER_FEE_BPS',
        'MAX_COMMISSION_BPS',
        'MIN_TRADING_FEE_USD',
        'MIN_WITHDRAWAL_FEE_USD'
      ];

      if (!allowedKeys.includes(key)) {
        return res.status(400).json({
          success: false,
          message: `Invalid parameter key. Allowed: ${allowedKeys.join(', ')}`
        });
      }

      const result = await revenueDefenseService.requestParameterChange(
        key,
        value,
        req.user.email
      );

      // Log audit trail
      await auditService.log({
        userId: req.user.id,
        action: 'REQUEST_PARAMETER_CHANGE',
        resourceType: 'System',
        resourceId: key,
        details: {
          key,
          newValue: value,
          changeId: result.changeId,
          executeAt: result.executeAt
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: `Parameter change requested. Will execute at ${result.executeAt}`,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET PENDING PARAMETER CHANGES
   */
  async getPendingParameterChanges(req, res) {
    try {
      const { hours = 24 } = req.query;
      const changes = await revenueDefenseService.getRecentParameterChanges(parseInt(hours));

      res.json({
        success: true,
        count: changes.length,
        data: changes
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting pending changes',
        error: error.message
      });
    }
  }

  /**
   * GET DATA DELETION REQUESTS
   */
  async getDataDeletionRequests(req, res) {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (status) where.status = status;

      const { DataDeletionRequest } = require('../models');
      const { count, rows: requests } = await DataDeletionRequest.findAndCountAll({
        where,
        include: [{
          model: require('../models').User,
          as: 'user',
          attributes: ['id', 'email', 'createdAt']
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: requests,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting deletion requests',
        error: error.message
      });
    }
  }

  /**
   * EXECUTE DATA DELETION (requires 2FA)
   */
  async executeDataDeletion(req, res) {
    try {
      const { requestId } = req.params;

      const result = await privacyComplianceService.executeDataDeletion(requestId);

      // Log audit trail
      await auditService.log({
        userId: req.user.id,
        action: 'EXECUTE_DATA_DELETION',
        resourceType: 'DataDeletionRequest',
        resourceId: requestId,
        details: {
          deletedData: result.deletedData
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        success: true,
        message: 'Data deletion executed successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET DATA ACCESS LOGS
   */
  async getDataAccessLogs(req, res) {
    try {
      const { userId, accessType, page = 1, limit = 100 } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (userId) where.userId = userId;
      if (accessType) where.accessType = accessType;

      const { DataAccessLog } = require('../models');
      const { count, rows: logs } = await DataAccessLog.findAndCountAll({
        where,
        include: [
          {
            model: require('../models').User,
            as: 'user',
            attributes: ['id', 'email']
          },
          {
            model: require('../models').User,
            as: 'accessor',
            attributes: ['id', 'email', 'role']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: logs,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting access logs',
        error: error.message
      });
    }
  }

  /**
   * GET USER CONSENTS (for specific user)
   */
  async getUserConsents(req, res) {
    try {
      const { userId } = req.params;
      const consents = await privacyComplianceService.getUserConsents(userId);

      // Log the admin access
      await privacyComplianceService.logDataAccess({
        userId,
        accessedBy: req.user.id,
        accessType: 'admin_lookup',
        resourceType: 'privacy_consents',
        resourceId: userId,
        purpose: 'Admin review of user consents',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        success: true,
        data: consents
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting user consents',
        error: error.message
      });
    }
  }

  /**
   * GET PRIVACY COMPLIANCE REPORT
   */
  async getPrivacyComplianceReport(req, res) {
    try {
      const { PrivacyConsent, DataDeletionRequest, DataAccessLog } = require('../models');

      const [totalConsents, totalDeletions, totalAccessLogs, pendingDeletions] = await Promise.all([
        PrivacyConsent.count(),
        DataDeletionRequest.count(),
        DataAccessLog.count(),
        DataDeletionRequest.count({ where: { status: 'pending' } })
      ]);

      // Consent breakdown
      const consentsByType = await PrivacyConsent.findAll({
        attributes: [
          'consentType',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
          [require('sequelize').fn('SUM', require('sequelize').cast(require('sequelize').col('consent_given'), 'integer')), 'given']
        ],
        where: { revokedAt: null },
        group: ['consentType'],
        raw: true
      });

      res.json({
        success: true,
        data: {
          summary: {
            totalConsents,
            totalDeletions,
            totalAccessLogs,
            pendingDeletions
          },
          consentsByType,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'ERROR_GENERATING_COMPLIANCE_REPORT',
        error: error.message
      });
    }
  }

  /**
   * GET AUDIT LOGS
   */
  async getAuditLogs(req, res) {
    try {
      const { page = 1, limit = 20, action } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (action && action !== 'all') {
        where.action = action;
      }

      const { count, rows: logs } = await AuditLog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: require('../models').User,
            as: 'user',
            attributes: ['id', 'email', 'role']
          }
        ]
      });

      res.json({
        success: true,
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'ERROR_FETCHING_AUDIT_LOGS',
        error: error.message
      });
    }
  }
}

module.exports = new AdminController();
