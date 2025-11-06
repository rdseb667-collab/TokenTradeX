const { User, Token, Wallet, Trade, Transaction } = require('../models');
const { Op } = require('sequelize');
const auditService = require('../services/auditService');

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
          message: 'Cannot assign super_admin role through this endpoint'
        });
      }

      if (!['user', 'admin', 'trader'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role'
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // SECURITY: Prevent modifying super_admin accounts
      if (user.role === 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify super administrator account'
        });
      }

      const oldRole = user.role;
      user.role = role;
      await user.save();

      // AUDIT: Log role change
      await auditService.logRoleChange(req.user, userId, oldRole, role, req);

      res.json({
        success: true,
        message: 'User role updated',
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating user role',
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
          message: 'User not found'
        });
      }

      // SECURITY: Prevent disabling super_admin
      if (user.role === 'super_admin' && !isActive) {
        return res.status(403).json({
          success: false,
          message: 'Cannot deactivate super administrator account'
        });
      }

      const oldStatus = user.isActive;
      user.isActive = isActive;
      await user.save();

      // AUDIT: Log status change
      await auditService.logStatusChange(req.user, userId, oldStatus, isActive, req);

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'}`,
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating user status',
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
}

module.exports = new AdminController();
