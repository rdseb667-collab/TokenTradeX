const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { Order, Wallet, Token, User, UserReward } = require('../models');
const { Op } = require('sequelize');
const tradingMiningService = require('../services/tradingMiningService');

// Shared query definitions for consistency
const ORDER_ATTRIBUTES = ['price', 'filledQuantity', 'quantity'];
const TOKEN_INCLUDE = {
  model: Token,
  as: 'token',
  attributes: ['symbol', 'name']
};
const TOKEN_SYMBOL_INCLUDE = {
  model: Token,
  as: 'token',
  attributes: ['symbol']
};

/**
 * GET /api/earnings/summary
 * Get user's complete earnings summary
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's TTX holdings
    const ttxToken = await Token.findOne({ where: { symbol: 'TTX' } });
    const ttxWallet = await Wallet.findOne({
      where: { userId, tokenId: ttxToken?.id }
    });
    const ttxHoldings = ttxWallet ? parseFloat(ttxWallet.balance) : 0;

    // Calculate user's share of supply (500M circulating)
    const circulatingSupply = 500000000;
    const userSharePercent = ttxHoldings / circulatingSupply;

    // Get all filled orders in one query for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const allRecentOrders = await Order.findAll({
      where: {
        status: 'filled',
        updatedAt: { [Op.gte]: sevenDaysAgo }
      },
      include: [TOKEN_INCLUDE],
      order: [['updatedAt', 'DESC']]
    });

    // Date boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    // Calculate volumes by filtering the cached result set
    let platformVolumeToday = 0;
    let platformVolumeMonth = 0;
    const dailyVolumes = {};

    allRecentOrders.forEach(order => {
      const orderDate = new Date(order.updatedAt);
      const volume = parseFloat(order.price) * parseFloat(order.filledQuantity || order.quantity);
      
      // Today's volume
      if (orderDate >= today) {
        platformVolumeToday += volume;
      }
      
      // This month's volume
      if (orderDate >= thisMonth) {
        platformVolumeMonth += volume;
      }
      
      // Daily breakdown for recent earnings
      const dayKey = new Date(orderDate);
      dayKey.setHours(0, 0, 0, 0);
      const dayStr = dayKey.toISOString().split('T')[0];
      dailyVolumes[dayStr] = (dailyVolumes[dayStr] || 0) + volume;
    });

    // Calculate fees and shares for today
    const feesGeneratedToday = platformVolumeToday * 0.001;
    const holderShareToday = feesGeneratedToday * 0.15;
    const yourShareToday = holderShareToday * userSharePercent;

    // Calculate fees and shares for this month
    const feesGeneratedMonth = platformVolumeMonth * 0.001;
    const holderShareMonth = feesGeneratedMonth * 0.15;
    const yourShareMonth = holderShareMonth * userSharePercent;

    // Get all-time volume (separate query only if needed)
    const allOrders = await Order.findAll({
      where: { status: 'filled' },
      attributes: ORDER_ATTRIBUTES
    });

    const platformVolumeAllTime = allOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.price) * parseFloat(order.filledQuantity || order.quantity));
    }, 0);

    const feesAllTime = platformVolumeAllTime * 0.001;
    const holderShareAllTime = feesAllTime * 0.15;
    const yourShareAllTime = holderShareAllTime * userSharePercent;

    // Projections (assume current daily volume continues)
    const estimatedMonthly = yourShareToday * 30;
    const estimatedYearly = estimatedMonthly * 12;
    
    // Calculate APY (annual earnings / investment)
    const ttxPrice = 0.10; // $0.10 per TTX
    const investment = ttxHoldings * ttxPrice;
    const apy = investment > 0 ? (estimatedYearly / investment) * 100 : 0;

    // Apply minimum display threshold to avoid demotivating zeros
    const MIN_DISPLAY_THRESHOLD = 0.01; // $0.01
    const formatDisplayValue = (value) => {
      if (value === 0) return value;
      return value < MIN_DISPLAY_THRESHOLD ? '< $0.01' : value;
    };

    // Recent earnings from cached daily volumes
    const recentEarnings = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dayStr = date.toISOString().split('T')[0];

      const dayVolume = dailyVolumes[dayStr] || 0;
      const dayFees = dayVolume * 0.001;
      const dayHolderShare = dayFees * 0.15;
      const dayYourShare = dayHolderShare * userSharePercent;

      if (dayVolume > 0) {
        recentEarnings.push({
          date: date.toISOString(),
          source: 'Trading Fees',
          platformVolume: dayVolume,
          totalFees: dayFees,
          yourShare: dayYourShare
        });
      }
    }

    res.json({
      success: true,
      ttxHoldings,
      userSharePercent: (userSharePercent * 100).toFixed(4),
      platformVolumeToday,
      yourShareToday,
      yourShareTodayDisplay: formatDisplayValue(yourShareToday),
      totalEarnedThisMonth: yourShareMonth,
      totalEarnedAllTime: yourShareAllTime,
      estimatedMonthly,
      estimatedMonthlyDisplay: formatDisplayValue(estimatedMonthly),
      estimatedYearly,
      estimatedYearlyDisplay: formatDisplayValue(estimatedYearly),
      apy,
      recentEarnings
    });

  } catch (error) {
    console.error('Error calculating earnings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate earnings'
    });
  }
});

/**
 * GET /api/earnings/live
 * Get live earnings ticker (updates every second)
 */
router.get('/live', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get TTX holdings
    const ttxToken = await Token.findOne({ where: { symbol: 'TTX' } });
    const ttxWallet = await Wallet.findOne({
      where: { userId, tokenId: ttxToken?.id }
    });
    const ttxHoldings = ttxWallet ? parseFloat(ttxWallet.balance) : 0;
    const userSharePercent = ttxHoldings / 500000000;

    // Get last 10 filled orders (live activity)
    const recentTrades = await Order.findAll({
      where: { status: 'filled' },
      include: [TOKEN_SYMBOL_INCLUDE],
      order: [['updatedAt', 'DESC']],
      limit: 10
    });

    const liveActivity = recentTrades.map(order => {
      const tradeVolume = parseFloat(order.price) * parseFloat(order.filledQuantity || order.quantity);
      const tradeFee = tradeVolume * 0.001;
      const holderShare = tradeFee * 0.15;
      const yourEarning = holderShare * userSharePercent;

      return {
        timestamp: order.updatedAt,
        symbol: order.token?.symbol || 'Unknown',
        volume: tradeVolume,
        yourEarning: yourEarning,
        message: `Someone traded ${order.token?.symbol || 'Unknown'} → You earned $${yourEarning.toFixed(6)}`
      };
    });

    res.json({
      success: true,
      liveActivity,
      totalEarnedFromThese: liveActivity.reduce((sum, a) => sum + a.yourEarning, 0)
    });

  } catch (error) {
    console.error('Error getting live earnings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live earnings'
    });
  }
});

/**
 * GET /api/earnings/mining
 * Get user's trading mining summary
 */
router.get('/mining', protect, async (req, res) => {
  try {
    const summary = await tradingMiningService.getUserSummary(req.user.id);
    
    res.json({
      success: true,
      mining: summary
    });
  } catch (error) {
    console.error('Error getting mining summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mining summary'
    });
  }
});

/**
 * GET /api/earnings/platform
 * Get platform-wide earnings stats for the dashboard banner
 */
router.get('/platform', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's filled orders
    const todayOrders = await Order.findAll({
      where: {
        status: 'filled',
        updatedAt: { [Op.gte]: today }
      },
      attributes: ORDER_ATTRIBUTES
    });

    const platformVolumeToday = todayOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.price) * parseFloat(order.filledQuantity || order.quantity));
    }, 0);

    const feesGeneratedToday = platformVolumeToday * 0.001; // 0.1% fee
    const holderShareToday = feesGeneratedToday * 0.15; // 15% to holders
    const platformShareToday = feesGeneratedToday * 0.85; // 85% to platform

    // Get total mining rewards distributed today
    const { UserReward } = require('../models');
    const miningToday = await UserReward.sum('amount', {
      where: {
        rewardType: 'trading_volume',
        createdAt: { [Op.gte]: today }
      }
    }) || 0;

    res.json({
      success: true,
      platform: {
        volumeToday: platformVolumeToday,
        feesGenerated: feesGeneratedToday,
        holderShare: holderShareToday,
        platformShare: platformShareToday,
        miningDistributed: miningToday
      }
    });
  } catch (error) {
    console.error('Error getting platform stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform stats'
    });
  }
});

module.exports = router;
