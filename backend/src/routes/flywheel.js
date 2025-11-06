const express = require('express');
const router = express.Router();
const revenueStreamService = require('../services/revenueStreamService');
const marketComparisonService = require('../services/marketComparisonService');
const auth = require('../middleware/auth');

/**
 * Revenue & Flywheel API
 * Shows users how their usage drives value
 */

/**
 * @route GET /api/flywheel/metrics
 * @desc Get flywheel effect metrics (public)
 */
router.get('/metrics', async (req, res, next) => {
  try {
    const metrics = revenueStreamService.getFlywheelMetrics();
    const reserveStatus = revenueStreamService.getReserveFundStatus();
    
    res.json({
      success: true,
      flywheel: metrics,
      reserve: reserveStatus,
      message: 'Your usage directly increases TTX value'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/flywheel/my-impact
 * @desc Show user how their personal usage impacts their holdings
 */
router.get('/my-impact', async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user's TTX balance (simplified - would query from wallet)
    const userTTXBalance = 10000; // TODO: Get from wallet
    const userMonthlyVolume = 50000; // TODO: Get from trade history
    
    const earnings = revenueStreamService.calculateUserMonthlyEarnings(
      userTTXBalance,
      500000 // Assume $500K monthly platform revenue
    );
    
    const benefits = marketComparisonService.getUserBenefits(
      userMonthlyVolume,
      userTTXBalance
    );
    
    res.json({
      success: true,
      yourImpact: {
        ttxHoldings: userTTXBalance,
        monthlyVolume: userMonthlyVolume,
        monthlyEarnings: earnings.monthlyEarnings,
        annualEarnings: earnings.annualEarnings,
        tier: earnings.tier,
        revenueMultiplier: earnings.revenueMultiplier
      },
      vsCompetitors: benefits,
      flywheelEffect: {
        message: 'Every trade you make increases your TTX value',
        breakdown: [
          `You earn: $${earnings.monthlyEarnings.toFixed(2)}/month directly`,
          'Reserve backing increases from your fees',
          'TTX price supported by growing reserve',
          'Your holdings appreciate without selling'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/flywheel/reserve-status
 * @desc Get current reserve backing status
 */
router.get('/reserve-status', async (req, res, next) => {
  try {
    const status = revenueStreamService.getReserveFundStatus();
    
    res.json({
      success: true,
      reserve: status,
      implications: {
        minPrice: status.impliedMinPrice,
        backingStrength: `Each TTX has $${status.ttxBackingPerToken.toFixed(6)} in reserve`,
        growth: 'Reserve grows with every platform transaction'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/flywheel/revenue-streams
 * @desc Show all 10 revenue streams and their performance
 */
router.get('/revenue-streams', async (req, res, next) => {
  try {
    const streams = revenueStreamService.revenueStreams.map(s => ({
      name: s.name,
      description: s.description,
      collected: s.collected,
      targetMonthly: s.targetMonthly,
      progress: s.targetMonthly > 0 ? ((s.collected / s.targetMonthly) * 100).toFixed(1) : 0,
      distributedToHolders: s.distributed
    }));
    
    const totalTarget = revenueStreamService.revenueStreams.reduce((sum, s) => sum + s.targetMonthly, 0);
    const totalCollected = revenueStreamService.revenueStreams.reduce((sum, s) => sum + s.collected, 0);
    
    res.json({
      success: true,
      streams,
      summary: {
        totalTarget,
        totalCollected,
        overallProgress: ((totalCollected / totalTarget) * 100).toFixed(1),
        message: '10 revenue streams working for TTX holders'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/flywheel/calculator
 * @desc Calculate potential earnings based on TTX holdings
 */
router.get('/calculator', async (req, res, next) => {
  try {
    const { ttxAmount = 1000, monthlyVolume = 10000, platformRevenue = 500000 } = req.query;
    
    const earnings = revenueStreamService.calculateUserMonthlyEarnings(
      parseFloat(ttxAmount),
      parseFloat(platformRevenue)
    );
    
    const benefits = marketComparisonService.getUserBenefits(
      parseFloat(monthlyVolume),
      parseFloat(ttxAmount)
    );
    
    const roi = revenueStreamService.calculateTTXInvestmentROI(
      parseFloat(ttxAmount),
      0.10, // Assume $0.10 TTX price
      parseFloat(platformRevenue)
    );
    
    res.json({
      success: true,
      scenario: {
        ttxHoldings: parseFloat(ttxAmount),
        monthlyTradingVolume: parseFloat(monthlyVolume),
        assumedPlatformRevenue: parseFloat(platformRevenue)
      },
      earnings,
      benefits,
      roi,
      recommendation: roi.annualROI > 50 ? 
        'Excellent ROI! Consider increasing holdings.' :
        'Good passive income potential.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/flywheel/comparison
 * @desc Compare TTX to major competitors
 */
router.get('/comparison/:competitor', async (req, res, next) => {
  try {
    const { competitor } = req.params;
    const comparison = marketComparisonService.compareToCompetitor(competitor);
    
    if (!comparison) {
      return res.status(404).json({
        success: false,
        message: 'Competitor not found. Try: binance, uniswap, cryptocom'
      });
    }
    
    res.json({
      success: true,
      comparison,
      platformFeatures: [
        'Multiple revenue streams (10 sources)',
        'Revenue sharing model with token holders',
        'Early adopter incentive program',
        'Reserve-backed token structure',
        'Cross-platform utility'
      ],
      disclaimer: 'This comparison is for educational purposes. Token values and features may vary.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
