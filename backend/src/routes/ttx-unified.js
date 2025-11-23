const express = require('express');
const router = express.Router();
const ttxUnifiedService = require('../services/ttxUnifiedService');
const revenueStreamService = require('../services/revenueStreamService');

/**
 * GET /api/ttx-unified/stats
 * Get current TTX statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalSupply: 1000000000,
      circulatingSupply: 500000000,
      platformReserve: 150000000,
      liquidityMining: 200000000,
      currentPrice: 0.10, // Will be from DEX once deployed
      marketCap: 50000000, // circulating * price
      holders: 0, // Will track on deployment
    };

    // Get revenue stats if unified service is available
    let revenueStats = null;
    if (ttxUnifiedService.initialized) {
      revenueStats = await ttxUnifiedService.getRevenueStats();
    }

    res.json({
      success: true,
      stats,
      revenueStats,
      flywheel: await revenueStreamService.getFlywheelMetrics(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ttx-unified/calculator
 * Calculate potential earnings
 */
router.get('/calculator', async (req, res) => {
  try {
    const { ttxAmount, lockDays, monthlyRevenue } = req.query;

    const amount = parseFloat(ttxAmount) || 10000;
    const lock = parseInt(lockDays) || 365;
    const revenue = parseFloat(monthlyRevenue) || 500000;

    const circulatingSupply = 500000000;
    const userShare = amount / circulatingSupply;
    const holderRevenue = revenue * 0.15;  // 15% to holders
    const reserveGrowth = revenue * 0.30;

    // Lock boost: 1x to 4x based on duration (max 4 years)
    const maxLockDays = 1460; // 4 years
    const lockBoost = 1 + (lock / maxLockDays) * 3;

    const monthlyEarnings = holderRevenue * userShare * lockBoost;
    const yearlyEarnings = monthlyEarnings * 12;
    const investment = amount * 0.10; // Assuming $0.10 price
    const roi = (yearlyEarnings / investment) * 100;

    const reservePerToken = reserveGrowth / circulatingSupply;
    const yearlyReserveBacking = reservePerToken * 12;

    res.json({
      success: true,
      input: {
        ttxAmount: amount,
        lockDays: lock,
        monthlyRevenue: revenue,
      },
      results: {
        monthlyEarnings: monthlyEarnings.toFixed(2),
        yearlyEarnings: yearlyEarnings.toFixed(2),
        roi: roi.toFixed(1),
        lockBoost: lockBoost.toFixed(2),
        userShare: (userShare * 100).toFixed(4),
        reserveBacking: yearlyReserveBacking.toFixed(6),
        investment: investment.toFixed(2),
      },
      breakdown: {
        circulatingSupply,
        yourPercentage: `${(userShare * 100).toFixed(4)}%`,
        platformRevenue: `$${revenue.toLocaleString()}/month`,
        holderShare: '15%',   // Clear: 15% to holders
        platformShare: '85%',  // Clear: 85% to platform/owner
        yourMultiplier: `${lockBoost.toFixed(2)}x`,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ttx-unified/revenue-streams
 * Get all 10 revenue streams performance
 */
router.get('/revenue-streams', async (req, res) => {
  try {
    let streams = [];

    // Try to get from smart contract first
    if (ttxUnifiedService.initialized) {
      streams = await ttxUnifiedService.getAllRevenueStreams();
    }

    // Fallback to backend tracking
    if (streams.length === 0) {
      const dbStreams = await revenueStreamService.getAllStreams();
      streams = dbStreams.map((stream) => ({
        id: stream.id,
        name: stream.name,
        description: stream.description,
        totalCollected: parseFloat(stream.collected || 0),
        holderShare: parseFloat(stream.collected || 0) * 0.15,  // 15% to holders
        reserveShare: parseFloat(stream.collected || 0) * 0.85,  // 85% to platform
        targetMonthly: parseFloat(stream.targetMonthly || 0),
        progress: parseFloat(stream.targetMonthly || 0) > 0 ? (parseFloat(stream.collected || 0) / parseFloat(stream.targetMonthly || 0)) * 100 : 0,
      }));
    }

    res.json({
      success: true,
      streams,
      total: streams.reduce((sum, s) => sum + s.totalCollected, 0),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ttx-unified/apy
 * Calculate current APY
 */
router.get('/apy', async (req, res) => {
  try {
    let apy = 0;

    if (ttxUnifiedService.initialized) {
      apy = await ttxUnifiedService.calculateAPY();
    } else {
      // Estimate based on current revenue
      const monthlyRevenue = 500000; // Default estimate
      const circulatingSupply = 500000000;
      const price = 0.10;
      const totalStaked = circulatingSupply * 0.30; // Assume 30% staked
      const stakedValue = totalStaked * price;

      const annualRevenue = monthlyRevenue * 12 * 0.15; // 15% to holders (clean split)
      apy = (annualRevenue / stakedValue) * 100;
    }

    res.json({
      success: true,
      apy: apy.toFixed(2),
      note: 'APY varies based on platform revenue and total staked amount',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
