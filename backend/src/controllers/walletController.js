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

      // Validate input data
      if (!tokenId || !amount || !address) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'MISSING_FIELDS',
          error: 'Missing required fields: tokenId, amount, and address are all required'
        });
      }

      // Validate amount is a positive number
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'INVALID_AMOUNT',
          error: 'Amount must be a positive number'
        });
      }

      // Validate address is not empty
      if (!address.trim()) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'INVALID_ADDRESS',
          error: 'Withdrawal address is required'
        });
      }

      // Get token to calculate USD value
      const token = await Token.findByPk(tokenId);
      if (!token) {
        await t.rollback();
        return res.status(404).json({ 
          success: false, 
          message: 'TOKEN_NOT_FOUND', 
          error: 'Token not found' 
        });
      }

      const amountUSD = amountFloat * parseFloat(token.currentPrice);

      // Check daily withdrawal limit
      const maxDailyWithdrawalUSD = parseFloat(process.env.MAX_DAILY_WITHDRAWAL_USD || 10000); // $10,000 default
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const todayWithdrawals = await Transaction.findAll({
        where: {
          userId,
          type: 'withdrawal',
          status: { [Op.in]: ['completed', 'pending'] }, // Include pending as they count toward limit
          createdAt: {
            [Op.between]: [todayStart, todayEnd]
          }
        }
      });
      
      const todayTotalUSD = todayWithdrawals.reduce((sum, withdrawal) => {
        // Get the token for this withdrawal to calculate USD value
        const withdrawalToken = withdrawal.token || token; // Use current token if not populated
        const withdrawalUSD = parseFloat(withdrawal.amount) * parseFloat(withdrawalToken.currentPrice || token.currentPrice);
        return sum + withdrawalUSD;
      }, 0);
      
      const remainingLimit = maxDailyWithdrawalUSD - todayTotalUSD;
      
      if (amountUSD > remainingLimit) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'DAILY_WITHDRAWAL_LIMIT_REACHED',
          error: `Daily withdrawal limit would be exceeded. Remaining limit: $${remainingLimit.toFixed(2)}`,
          remainingLimit: remainingLimit
        });
      }

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
          message: 'WITHDRAWAL_LIMIT_EXCEEDED',
          error: withdrawalCheck.reason,
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
          message: 'WALLET_NOT_FOUND',
          error: 'Wallet not found'
        });
      }

      const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);

      if (availableBalance < amountFloat) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'INSUFFICIENT_FUNDS',
          error: `Insufficient balance. Available: ${availableBalance.toFixed(4)} ${token.symbol}, Requested: ${amountFloat.toFixed(4)} ${token.symbol}`
        });
      }

      // Calculate withdrawal fee (Stream #1: Withdrawal Fees)
      const withdrawalFeePercent = parseFloat(process.env.WITHDRAWAL_FEE_PERCENT || 0.5); // 0.5% default
      const minWithdrawalFee = parseFloat(process.env.MIN_WITHDRAWAL_FEE_USD || 1); // $1 minimum
      let withdrawalFee = amountFloat * (withdrawalFeePercent / 100);
      
      // Convert min fee to token amount
      const minFeeInTokens = minWithdrawalFee / parseFloat(token.currentPrice);
      if (withdrawalFee < minFeeInTokens) {
        withdrawalFee = minFeeInTokens;
      }
      
      const totalDeduction = amountFloat + withdrawalFee;
      
      if (availableBalance < totalDeduction) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'INSUFFICIENT_FUNDS',
          error: `Insufficient balance. Need ${totalDeduction.toFixed(4)} ${token.symbol} (${amountFloat} + ${withdrawalFee.toFixed(4)} fee)`
        });
      }

      const balanceBefore = parseFloat(wallet.balance);
      const newBalance = balanceBefore - totalDeduction;

      // Update wallet (deduct amount + fee)
      await wallet.update({
        balance: newBalance
      }, { transaction: t });

      // Collect withdrawal fee revenue (Stream #1)
      const withdrawalFeeUSD = withdrawalFee * parseFloat(token.currentPrice);
      const revenueCollector = require('../helpers/revenueCollector');
      setImmediate(async () => {
        try {
          await revenueCollector.collectRevenue(
            1, 
            withdrawalFeeUSD, 
            `Withdrawal: ${amountFloat} ${token.symbol} to ${address}`
          );
          console.log(`💸 Withdrawal fee collected: $${withdrawalFeeUSD.toFixed(2)} (${withdrawalFee.toFixed(4)} ${token.symbol})`);
        } catch (error) {
          console.error('Failed to collect withdrawal fee:', error.message);
        }
      });

      // Calculate processing time based on delay
      const processAt = withdrawalCheck.delayHours > 0
        ? new Date(Date.now() + withdrawalCheck.delayHours * 60 * 60 * 1000)
        : new Date();

      // Create transaction record
      const transaction = await Transaction.create({
        userId,
        tokenId,
        type: 'withdrawal',
        amount: amountFloat,
        balanceBefore,
        balanceAfter: newBalance,
        status: withdrawalCheck.delayHours > 0 ? 'pending' : 'pending',
        reference: address,
        notes: `${withdrawalCheck.message} | Fee: ${withdrawalFee.toFixed(4)} ${token.symbol}`
      }, { transaction: t });

      await t.commit();

      res.json({
        success: true,
        message: withdrawalCheck.message,
        delayHours: withdrawalCheck.delayHours,
        processAt: processAt,
        data: {
          wallet,
          transaction,
          withdrawalDetails: {
            requestedAmount: amountFloat,
            withdrawalFee: withdrawalFee,
            totalDeducted: totalDeduction,
            youReceive: amountFloat,
            feePercent: withdrawalFeePercent
          }
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
      const { type, tokenId, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      
      const where = { userId: req.user.id };
      
      if (type) {
        where.type = type;
      }
      
      if (tokenId) {
        where.tokenId = tokenId;
      }

      const { count, rows: transactions } = await Transaction.findAndCountAll({
        where,
        include: [{ model: Token, as: 'token' }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        count: transactions.length,
        data: transactions || [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Transaction history error:', error);
      res.status(500).json({
        success: false,
        message: 'ERROR_FETCHING_TRANSACTIONS',
        error: error.message
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
