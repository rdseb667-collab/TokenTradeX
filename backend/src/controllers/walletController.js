const { Wallet, Token, Transaction } = require('../models');
const { sequelize } = require('../config/database');
const whaleProtectionService = require('../services/whaleProtectionService');

class WalletController {
  // Get user wallet
  async getWallet(req, res, next) {
    try {
      const wallets = await Wallet.findAll({
        where: { userId: req.user.id },
        include: [{ model: Token, as: 'token' }],
        order: [['balance', 'DESC']]
      });

      // Calculate total portfolio value
      const totalValue = wallets.reduce((sum, wallet) => {
        return sum + (parseFloat(wallet.balance) * parseFloat(wallet.token.currentPrice));
      }, 0);

      res.json({
        success: true,
        data: {
          wallets,
          totalValue
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get wallet by token
  async getWalletByToken(req, res, next) {
    try {
      const { tokenId } = req.params;

      let wallet = await Wallet.findOne({
        where: {
          userId: req.user.id,
          tokenId
        },
        include: [{ model: Token, as: 'token' }]
      });

      // Create wallet if it doesn't exist
      if (!wallet) {
        const token = await Token.findByPk(tokenId);
        if (!token) {
          return res.status(404).json({
            success: false,
            message: 'Token not found'
          });
        }

        wallet = await Wallet.create({
          userId: req.user.id,
          tokenId,
          balance: 0,
          lockedBalance: 0
        });

        wallet.token = token;
      }

      res.json({
        success: true,
        data: wallet
      });
    } catch (error) {
      next(error);
    }
  }

  // Deposit tokens
  async deposit(req, res, next) {
    const t = await sequelize.transaction();
    
    try {
      const { tokenId, amount, txHash } = req.body;
      const userId = req.user.id;

      // Validate token
      const token = await Token.findByPk(tokenId);
      if (!token) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      // Get or create wallet
      let wallet = await Wallet.findOne({
        where: { userId, tokenId },
        transaction: t
      });

      if (!wallet) {
        wallet = await Wallet.create({
          userId,
          tokenId,
          balance: 0,
          lockedBalance: 0
        }, { transaction: t });
      }

      const balanceBefore = parseFloat(wallet.balance);
      const newBalance = balanceBefore + parseFloat(amount);

      // Update wallet
      await wallet.update({
        balance: newBalance
      }, { transaction: t });

      // Create transaction record
      const transaction = await Transaction.create({
        userId,
        tokenId,
        type: 'deposit',
        amount: parseFloat(amount),
        balanceBefore,
        balanceAfter: newBalance,
        status: 'completed',
        txHash,
        notes: 'Token deposit'
      }, { transaction: t });

      await t.commit();

      res.json({
        success: true,
        message: 'Deposit successful',
        data: {
          wallet,
          transaction
        }
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }

  // Withdraw tokens
  async withdraw(req, res, next) {
    const t = await sequelize.transaction();
    
    try {
      const { tokenId, amount, address } = req.body;
      const userId = req.user.id;

      // Get token to calculate USD value
      const token = await Token.findByPk(tokenId);
      if (!token) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Token not found' });
      }

      const amountUSD = parseFloat(amount) * parseFloat(token.currentPrice);

      // WHALE PROTECTION: Check withdrawal limits
      const withdrawalCheck = await whaleProtectionService.checkWithdrawalLimit(
        userId, 
        amountUSD, 
        req.user.kycStatus === 'approved'
      );

      if (!withdrawalCheck.allowed) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: withdrawalCheck.reason,
          remaining: withdrawalCheck.remaining
        });
      }

      // Get wallet
      const wallet = await Wallet.findOne({
        where: { userId, tokenId },
        transaction: t
      });

      if (!wallet) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);

      if (availableBalance < parseFloat(amount)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }

      const balanceBefore = parseFloat(wallet.balance);
      const newBalance = balanceBefore - parseFloat(amount);

      // Update wallet
      await wallet.update({
        balance: newBalance
      }, { transaction: t });

      // Calculate processing time based on delay
      const processAt = withdrawalCheck.delayHours > 0
        ? new Date(Date.now() + withdrawalCheck.delayHours * 60 * 60 * 1000)
        : new Date();

      // Create transaction record
      const transaction = await Transaction.create({
        userId,
        tokenId,
        type: 'withdrawal',
        amount: parseFloat(amount),
        balanceBefore,
        balanceAfter: newBalance,
        status: withdrawalCheck.delayHours > 0 ? 'pending' : 'pending',
        reference: address,
        notes: withdrawalCheck.message
      }, { transaction: t });

      await t.commit();

      res.json({
        success: true,
        message: withdrawalCheck.message,
        delayHours: withdrawalCheck.delayHours,
        processAt: processAt,
        data: {
          wallet,
          transaction
        }
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }

  // Get transaction history
  async getTransactions(req, res, next) {
    try {
      const { type, tokenId, limit = 50 } = req.query;
      
      const where = { userId: req.user.id };
      
      if (type) {
        where.type = type;
      }
      
      if (tokenId) {
        where.tokenId = tokenId;
      }

      const transactions = await Transaction.findAll({
        where,
        include: [{ model: Token, as: 'token' }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        count: transactions.length,
        data: transactions || []
      });
    } catch (error) {
      console.error('Transaction history error:', error);
      res.json({
        success: true,
        count: 0,
        data: []
      });
    }
  }

  // Get TTX fee tier information
  async getTTXFeeInfo(req, res, next) {
    try {
      const userId = req.user.id;
      const ttxFeeService = require('../services/ttxFeeService');
      
      // Get TTX token and user's TTX balance
      const ttxToken = await Token.findOne({ where: { symbol: 'TTX' } });
      let ttxBalance = 0;
      
      if (ttxToken) {
        const ttxWallet = await Wallet.findOne({
          where: { userId, tokenId: ttxToken.id }
        });
        
        if (ttxWallet) {
          ttxBalance = parseFloat(ttxWallet.balance);
        }
      }
      
      // Get fee tier information
      const currentTierRaw = await ttxFeeService.getUserTier(ttxBalance);
      const currentTier = {
        ...currentTierRaw,
        name: currentTierRaw.tierName || currentTierRaw.name || 'Standard'
      };
      const nextTier = ttxFeeService.getNextTier(ttxBalance);
      const allTiers = ttxFeeService.feeTiers;
      
      const feeMultiplier = typeof currentTier.feeMultiplier === 'number' ? currentTier.feeMultiplier : 1.0;
      const discountPercent = (1 - feeMultiplier) * 100;
      
      res.json({
        success: true,
        data: {
          ttxBalance,
          currentTier,
          nextTier,
          allTiers,
          feeMultiplier,
          discountPercent
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Pre-check withdrawal limits and delay
  async checkWithdrawal(req, res, next) {
    try {
      const { tokenId, amount } = req.query;
      const userId = req.user.id;

      const token = await Token.findByPk(tokenId);
      if (!token) {
        return res.status(404).json({ success: false, message: 'Token not found' });
      }

      const amountUSD = parseFloat(amount) * parseFloat(token.currentPrice);

      const check = await whaleProtectionService.checkWithdrawalLimit(
        userId,
        amountUSD,
        req.user.kycStatus === 'approved'
      );

      // Calculate recommended max if not allowed
      let recommendedMax = null;
      if (!check.allowed && typeof check.remaining === 'number' && check.remaining > 0) {
        // Recommend 90% of remaining to ensure it goes through
        recommendedMax = check.remaining * 0.9;
      }

      return res.json({
        success: true,
        data: { ...check, amountUSD, recommendedMax }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WalletController();
