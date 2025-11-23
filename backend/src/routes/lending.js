const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const LendingPosition = require('../models/LendingPosition');
const { Token, Wallet, User } = require('../models');
const revenueStreamService = require('../services/revenueStreamService');
const { sequelize } = require('../config/database');

/**
 * LENDING/BORROWING - Stream #5
 * DeFi-style lending with platform interest collection
 */

// GET /api/lending/rates - Get current lending rates
router.get('/rates', async (req, res) => {
  try {
    // Dynamic rates based on utilization (simplified for MVP)
    const rates = [
      {
        tokenSymbol: 'USDT',
        lendingAPR: 8.5,
        borrowingAPR: 12.0,
        collateralRatio: 150,
        available: '50000.00',
        utilization: '35%'
      },
      {
        tokenSymbol: 'BTC',
        lendingAPR: 6.0,
        borrowingAPR: 9.5,
        collateralRatio: 140,
        available: '2.5',
        utilization: '28%'
      },
      {
        tokenSymbol: 'ETH',
        lendingAPR: 7.0,
        borrowingAPR: 10.5,
        collateralRatio: 145,
        available: '150.0',
        utilization: '42%'
      },
      {
        tokenSymbol: 'TTX',
        lendingAPR: 15.0,
        borrowingAPR: 20.0,
        collateralRatio: 200,
        available: '500000.0',
        utilization: '18%'
      }
    ];
    
    res.json({ success: true, rates });
  } catch (error) {
    console.error('Get lending rates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/lending/lend - Lend tokens to earn interest
router.post('/lend', protect, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { tokenId, amount, duration = 30 } = req.body;
    
    if (!tokenId || !amount || amount <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'tokenId and amount required' });
    }
    
    const token = await Token.findByPk(tokenId);
    if (!token) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Token not found' });
    }
    
    // Get user's wallet
    const wallet = await Wallet.findOne({
      where: { userId: req.user.id, tokenId },
      transaction: t
    });
    
    if (!wallet) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }
    
    const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);
    const lendAmount = parseFloat(amount);
    
    if (availableBalance < lendAmount) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }
    
    // Lock the lending amount
    await wallet.update({
      lockedBalance: parseFloat(wallet.lockedBalance) + lendAmount
    }, { transaction: t });
    
    // Get lending rate (simplified - would be dynamic in production)
    const rateMap = {
      'USDT': 8.5,
      'BTC': 6.0,
      'ETH': 7.0,
      'TTX': 15.0
    };
    const annualRate = rateMap[token.symbol] || 5.0;
    
    // Create lending position
    const position = await LendingPosition.create({
      userId: req.user.id,
      type: 'lending',
      tokenId,
      tokenSymbol: token.symbol,
      principal: lendAmount,
      outstanding: lendAmount,
      annualRate,
      duration: parseInt(duration),
      platformFeePercent: 15,
      status: 'active'
    }, { transaction: t });
    
    await t.commit();
    
    // Calculate estimated earnings
    const dailyRate = annualRate / 365;
    const totalInterest = lendAmount * (dailyRate / 100) * duration;
    const platformFee = totalInterest * 0.15;
    const userEarnings = totalInterest - platformFee;
    
    res.json({
      success: true,
      message: `Lending ${lendAmount} ${token.symbol} at ${annualRate}% APR`,
      position,
      projections: {
        principal: lendAmount,
        duration: `${duration} days`,
        annualRate: `${annualRate}%`,
        estimatedInterest: totalInterest.toFixed(4),
        platformFee: platformFee.toFixed(4),
        youWillEarn: userEarnings.toFixed(4),
        totalReturn: (lendAmount + userEarnings).toFixed(4)
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Lending error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/lending/borrow - Borrow tokens with collateral
router.post('/borrow', protect, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { tokenId, amount, collateralTokenId, collateralAmount, duration = 30 } = req.body;
    
    if (!tokenId || !amount || !collateralTokenId || !collateralAmount) {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'tokenId, amount, collateralTokenId, and collateralAmount required' 
      });
    }
    
    const token = await Token.findByPk(tokenId);
    const collateralToken = await Token.findByPk(collateralTokenId);
    
    if (!token || !collateralToken) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Token not found' });
    }
    
    const borrowAmount = parseFloat(amount);
    const collAmount = parseFloat(collateralAmount);
    
    // Check collateral ratio (need 150% collateral)
    const collateralValue = collAmount * parseFloat(collateralToken.currentPrice);
    const borrowValue = borrowAmount * parseFloat(token.currentPrice);
    const collateralRatio = (collateralValue / borrowValue) * 100;
    
    if (collateralRatio < 150) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: `Insufficient collateral. Need 150% ratio. You have: ${collateralRatio.toFixed(2)}%`,
        required: `$${(borrowValue * 1.5).toFixed(2)} worth of collateral`,
        provided: `$${collateralValue.toFixed(2)}`
      });
    }
    
    // Lock collateral
    const collateralWallet = await Wallet.findOne({
      where: { userId: req.user.id, tokenId: collateralTokenId },
      transaction: t
    });
    
    if (!collateralWallet) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Collateral wallet not found' });
    }
    
    const availableCollateral = parseFloat(collateralWallet.balance) - parseFloat(collateralWallet.lockedBalance);
    if (availableCollateral < collAmount) {
      await t.rollback();
      return res.status(400).json({ success: false, error: 'Insufficient collateral balance' });
    }
    
    await collateralWallet.update({
      lockedBalance: parseFloat(collateralWallet.lockedBalance) + collAmount
    }, { transaction: t });
    
    // Give borrowed tokens to user
    let borrowWallet = await Wallet.findOne({
      where: { userId: req.user.id, tokenId },
      transaction: t
    });
    
    if (!borrowWallet) {
      borrowWallet = await Wallet.create({
        userId: req.user.id,
        tokenId,
        balance: 0,
        lockedBalance: 0
      }, { transaction: t });
    }
    
    await borrowWallet.update({
      balance: parseFloat(borrowWallet.balance) + borrowAmount
    }, { transaction: t });
    
    // Get borrowing rate
    const rateMap = {
      'USDT': 12.0,
      'BTC': 9.5,
      'ETH': 10.5,
      'TTX': 20.0
    };
    const annualRate = rateMap[token.symbol] || 10.0;
    
    // Calculate liquidation price
    const liquidationPrice = (borrowValue * 1.3) / collAmount; // Liquidate at 130% ratio
    
    // Create borrowing position
    const position = await LendingPosition.create({
      userId: req.user.id,
      type: 'borrowing',
      tokenId,
      tokenSymbol: token.symbol,
      principal: borrowAmount,
      outstanding: borrowAmount,
      annualRate,
      duration: parseInt(duration),
      platformFeePercent: 15,
      collateralTokenId,
      collateralAmount: collAmount,
      collateralValue,
      liquidationPrice,
      status: 'active'
    }, { transaction: t });
    
    await t.commit();
    
    // Calculate total owed
    const dailyRate = annualRate / 365;
    const totalInterest = borrowAmount * (dailyRate / 100) * duration;
    const totalOwed = borrowAmount + totalInterest;
    
    res.json({
      success: true,
      message: `Borrowed ${borrowAmount} ${token.symbol} against ${collAmount} ${collateralToken.symbol} collateral`,
      position,
      loan: {
        borrowed: `${borrowAmount} ${token.symbol}`,
        collateral: `${collAmount} ${collateralToken.symbol}`,
        collateralRatio: `${collateralRatio.toFixed(2)}%`,
        liquidationPrice: `$${liquidationPrice.toFixed(2)}`,
        currentPrice: `$${parseFloat(collateralToken.currentPrice).toFixed(2)}`,
        interestRate: `${annualRate}% APR`,
        duration: `${duration} days`,
        totalInterest: totalInterest.toFixed(4),
        totalOwed: totalOwed.toFixed(4),
        warning: liquidationPrice < parseFloat(collateralToken.currentPrice) * 1.2 
          ? '⚠️ Close to liquidation! Add more collateral.' 
          : '✓ Healthy collateral ratio'
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Borrowing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/lending/repay/:positionId - Repay borrowed amount
router.post('/repay/:positionId', protect, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const position = await LendingPosition.findOne({
      where: { 
        id: req.params.positionId, 
        userId: req.user.id,
        type: 'borrowing',
        status: 'active'
      },
      transaction: t
    });
    
    if (!position) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Borrowing position not found' });
    }
    
    // Calculate total interest accrued
    const now = new Date();
    const daysElapsed = Math.ceil((now - new Date(position.lastInterestUpdate)) / (1000 * 60 * 60 * 24));
    const dailyRate = parseFloat(position.annualRate) / 365;
    const newInterest = parseFloat(position.principal) * (dailyRate / 100) * daysElapsed;
    
    const totalInterest = parseFloat(position.interestAccrued) + newInterest;
    const totalOwed = parseFloat(position.principal) + totalInterest;
    
    // Platform takes 15% of interest (Stream #5)
    const platformFee = totalInterest * 0.15;
    
    // Check if user has enough to repay
    const wallet = await Wallet.findOne({
      where: { userId: req.user.id, tokenId: position.tokenId },
      transaction: t
    });
    
    const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);
    if (availableBalance < totalOwed) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance to repay',
        required: totalOwed.toFixed(4),
        available: availableBalance.toFixed(4)
      });
    }
    
    // Deduct repayment from wallet
    await wallet.update({
      balance: parseFloat(wallet.balance) - totalOwed
    }, { transaction: t });
    
    // Release collateral
    const collateralWallet = await Wallet.findOne({
      where: { userId: req.user.id, tokenId: position.collateralTokenId },
      transaction: t
    });
    
    await collateralWallet.update({
      lockedBalance: Math.max(0, parseFloat(collateralWallet.lockedBalance) - parseFloat(position.collateralAmount))
    }, { transaction: t });
    
    // Update position
    await position.update({
      status: 'repaid',
      outstanding: 0,
      interestAccrued: totalInterest,
      platformFeesCollected: platformFee,
      repaidAt: now
    }, { transaction: t });
    
    await t.commit();
    
    // Collect lending interest fee (Stream #5)
    const platformFeeUSD = platformFee * parseFloat((await Token.findByPk(position.tokenId)).currentPrice);
    setImmediate(async () => {
      try {
        await require('../helpers/revenueCollector').collectRevenue(
          5,
          platformFeeUSD,
          `Lending interest: ${position.tokenSymbol} - 15% of $${(totalInterest * parseFloat((await Token.findByPk(position.tokenId)).currentPrice)).toFixed(2)}`
        );
        console.log(`💰 Lending interest fee: $${platformFeeUSD.toFixed(2)} (15% of interest)`);
      } catch (error) {
        console.error('Failed to collect lending fee:', error.message);
      }
    });
    
    res.json({
      success: true,
      message: 'Loan repaid successfully! Collateral released.',
      repayment: {
        principal: position.principal,
        interest: totalInterest.toFixed(4),
        platformFee: platformFee.toFixed(4),
        totalPaid: totalOwed.toFixed(4),
        collateralReleased: `${position.collateralAmount} tokens`,
        daysElapsed
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Repay loan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/lending/withdraw/:positionId - Withdraw lent amount + interest
router.post('/withdraw/:positionId', protect, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const position = await LendingPosition.findOne({
      where: { 
        id: req.params.positionId, 
        userId: req.user.id,
        type: 'lending',
        status: 'active'
      },
      transaction: t
    });
    
    if (!position) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Lending position not found' });
    }
    
    // Check if matured
    const now = new Date();
    if (now < new Date(position.dueDate)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Loan not yet matured',
        dueDate: position.dueDate,
        daysRemaining: Math.ceil((new Date(position.dueDate) - now) / (1000 * 60 * 60 * 24))
      });
    }
    
    // Calculate total interest
    const daysElapsed = parseInt(position.duration);
    const dailyRate = parseFloat(position.annualRate) / 365;
    const totalInterest = parseFloat(position.principal) * (dailyRate / 100) * daysElapsed;
    const platformFee = totalInterest * 0.15;
    const userEarnings = totalInterest - platformFee;
    const totalReturn = parseFloat(position.principal) + userEarnings;
    
    // Get wallet
    const wallet = await Wallet.findOne({
      where: { userId: req.user.id, tokenId: position.tokenId },
      transaction: t
    });
    
    // Unlock and credit amount + interest
    await wallet.update({
      balance: parseFloat(wallet.balance) + totalReturn,
      lockedBalance: Math.max(0, parseFloat(wallet.lockedBalance) - parseFloat(position.principal))
    }, { transaction: t });
    
    // Update position
    await position.update({
      status: 'repaid',
      interestAccrued: totalInterest,
      platformFeesCollected: platformFee,
      repaidAt: now
    }, { transaction: t });
    
    await t.commit();
    
    // Collect lending platform fee (Stream #5)
    const platformFeeUSD = platformFee * parseFloat((await Token.findByPk(position.tokenId)).currentPrice);
    setImmediate(async () => {
      try {
        await require('../helpers/revenueCollector').collectRevenue(
          5,
          platformFeeUSD,
          `Lending return: ${position.tokenSymbol} - 15% platform fee`
        );
        console.log(`💰 Lending platform fee: $${platformFeeUSD.toFixed(2)}`);
      } catch (error) {
        console.error('Failed to collect lending fee:', error.message);
      }
    });
    
    res.json({
      success: true,
      message: 'Lending withdrawn successfully!',
      withdrawal: {
        principal: position.principal,
        grossInterest: totalInterest.toFixed(4),
        platformFee: platformFee.toFixed(4),
        netInterest: userEarnings.toFixed(4),
        totalReceived: totalReturn.toFixed(4),
        annualRate: `${position.annualRate}%`,
        daysLent: daysElapsed
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Withdraw lending error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/lending/my-positions - Get user's lending/borrowing positions
router.get('/my-positions', protect, async (req, res) => {
  try {
    const positions = await LendingPosition.findAll({
      where: { userId: req.user.id },
      include: [{ model: Token, as: 'token', attributes: ['symbol', 'name', 'currentPrice'] }],
      order: [['createdAt', 'DESC']]
    });
    
    const lending = positions.filter(p => p.type === 'lending');
    const borrowing = positions.filter(p => p.type === 'borrowing');
    
    res.json({
      success: true,
      positions,
      summary: {
        totalLending: lending.filter(p => p.status === 'active').length,
        totalBorrowing: borrowing.filter(p => p.status === 'active').length,
        totalLent: lending.reduce((sum, p) => sum + parseFloat(p.principal), 0),
        totalBorrowed: borrowing.reduce((sum, p) => sum + parseFloat(p.outstanding), 0)
      }
    });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
