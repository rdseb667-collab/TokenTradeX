const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { Order, Wallet, Token, User } = require('../models');
const { Op } = require('sequelize');

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

    // Get platform volume today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = await Order.findAll({
      where: {
        status: 'filled',
        updatedAt: { [Op.gte]: today }
      }
    });

    const platformVolumeToday = todayOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.price) * parseFloat(order.filled_quantity || order.quantity));
    }, 0);

    // Calculate fees (0.1% trading fee)
    const feesGeneratedToday = platformVolumeToday * 0.001;
    const holderShareToday = feesGeneratedToday * 0.15; // 15% to holders
    const yourShareToday = holderShareToday * userSharePercent;

    // Get this month's volume
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthOrders = await Order.findAll({
      where: {
        status: 'filled',
        updatedAt: { [Op.gte]: thisMonth }
      }
    });

    const platformVolumeMonth = monthOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.price) * parseFloat(order.filled_quantity || order.quantity));
    }, 0);

    const feesGeneratedMonth = platformVolumeMonth * 0.001;
    const holderShareMonth = feesGeneratedMonth * 0.15;
    const yourShareMonth = holderShareMonth * userSharePercent;

    // All time
    const allOrders = await Order.findAll({
      where: { status: 'filled' }
    });

    const platformVolumeAllTime = allOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.price) * parseFloat(order.filled_quantity || order.quantity));
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

    // Recent earnings (simulated - show daily breakdown)
    const recentEarnings = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayOrders = await Order.findAll({
        where: {
          status: 'filled',
          updatedAt: {
            [Op.gte]: date,
            [Op.lt]: nextDate
          }
        },
        limit: 100 // Performance optimization
      });

      const dayVolume = dayOrders.reduce((sum, order) => {
        return sum + (parseFloat(order.price) * parseFloat(order.filled_quantity || order.quantity));
      }, 0);

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
      totalEarnedThisMonth: yourShareMonth,
      totalEarnedAllTime: yourShareAllTime,
      estimatedMonthly,
      estimatedYearly,
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
      order: [['updatedAt', 'DESC']],
      limit: 10
    });

    const liveActivity = recentTrades.map(order => {
      const tradeVolume = parseFloat(order.price) * parseFloat(order.filled_quantity || order.quantity);
      const tradeFee = tradeVolume * 0.001;
      const holderShare = tradeFee * 0.15;
      const yourEarning = holderShare * userSharePercent;

      return {
        timestamp: order.updatedAt,
        symbol: order.token_symbol,
        volume: tradeVolume,
        yourEarning: yourEarning,
        message: `Someone traded ${order.token_symbol} → You earned $${yourEarning.toFixed(6)}`
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

module.exports = router;
