const express = require('express');
const router = express.Router();
const revenueStreamService = require('../services/revenueStreamService');
const marketComparisonService = require('../services/marketComparisonService');
const { protect } = require('../middleware/auth');
const { calculateUserImpact, generatePersonalInsights } = require('../helpers/flywheelHelper');
const { 
  validateTTXAmount, 
  validateMonthlyVolume, 
  validatePlatformRevenue,
  isTTXTokenSeeded
} = require('../helpers/flywheelInputValidator');
const { Token } = require('../models');

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
    const metrics = await revenueStreamService.getFlywheelMetrics();
    const reserveStatus = await revenueStreamService.getReserveFundStatus();
    
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
router.get('/my-impact', protect, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Check if TTX token is seeded
    const isSeeded = await isTTXTokenSeeded(Token);
    if (!isSeeded) {
      return res.status(503).json({
        success: false,
        message: 'TTX token not available yet. Please try again later.'
      });
    }
    
    // Use centralized helper for consistent calculations
    const impactData = await calculateUserImpact(userId);
    
    res.json({
      success: true,
      yourImpact: {
        ttxHoldings: impactData.ttxHoldings,
        monthlyVolume: impactData.monthlyVolume,
        monthlyEarnings: impactData.monthlyEarnings,
        annualEarnings: impactData.annualEarnings,
        tier: impactData.tier,
        revenueMultiplier: impactData.revenueMultiplier
      },
      vsCompetitors: impactData.vsCompetitors,
      flywheelEffect: {
        message: 'Every trade you make increases your TTX value',
        breakdown: [
          `You earn: $${impactData.monthlyEarnings.toFixed(2)}/month directly`,
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
    const status = await revenueStreamService.getReserveFundStatus();
    
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
    const streams = await revenueStreamService.getAllStreams();
    
    const streamsData = streams.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      collected: parseFloat(s.collected || 0),
      targetMonthly: parseFloat(s.targetMonthly || 0),
      progress: s.targetMonthly > 0 ? ((parseFloat(s.collected || 0) / parseFloat(s.targetMonthly)) * 100).toFixed(1) : 0,
      distributedToHolders: parseFloat(s.distributed || 0)
    }));
    
    const totalTarget = streamsData.reduce((sum, s) => sum + s.targetMonthly, 0);
    const totalCollected = streamsData.reduce((sum, s) => sum + s.collected, 0);
    
    res.json({
      success: true,
      streams: streamsData,
      summary: {
        totalTarget,
        totalCollected,
        overallProgress: totalTarget > 0 ? ((totalCollected / totalTarget) * 100).toFixed(1) : 0,
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
    // Validate inputs
    const ttxAmount = validateTTXAmount(req.query.ttxAmount);
    const monthlyVolume = validateMonthlyVolume(req.query.monthlyVolume);
    
    // Validate platform revenue if provided
    let actualPlatformRevenue = null;
    if (req.query.platformRevenue !== undefined) {
      actualPlatformRevenue = validatePlatformRevenue(req.query.platformRevenue);
    }
    
    // If platformRevenue is not provided or invalid, get actual platform revenue
    if (actualPlatformRevenue === null) {
      const flywheelMetrics = await revenueStreamService.getFlywheelMetrics();
      actualPlatformRevenue = flywheelMetrics.totalPlatformRevenue || 500000; // Fallback to $500K if no revenue yet
    }
    
    const earnings = revenueStreamService.calculateUserMonthlyEarnings(
      ttxAmount,
      actualPlatformRevenue
    );
    
    const benefits = marketComparisonService.getUserBenefits(
      monthlyVolume,
      ttxAmount
    );
    
    const roi = revenueStreamService.calculateTTXInvestmentROI(
      ttxAmount,
      0.10, // Assume $0.10 TTX price
      actualPlatformRevenue
    );
    
    res.json({
      success: true,
      scenario: {
        ttxHoldings: ttxAmount,
        monthlyTradingVolume: monthlyVolume,
        assumedPlatformRevenue: actualPlatformRevenue
      },
      earnings,
      benefits,
      roi,
      recommendation: roi.annualROI > 50 ? 
        'Excellent ROI! Consider increasing holdings.' :
        'Good passive income potential.'
    });
  } catch (error) {
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
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

/**
 * @route GET /api/flywheel/my-impact/export
 * @desc Export user's flywheel impact as CSV
 */
router.get('/my-impact/export', protect, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Check if TTX token is seeded
    const isSeeded = await isTTXTokenSeeded(Token);
    if (!isSeeded) {
      return res.status(503).json({
        success: false,
        message: 'TTX token not available yet. Please try again later.'
      });
    }
    
    // Use centralized helper for consistent calculations
    const impactData = await calculateUserImpact(userId);
    
    // Format as CSV
    const { formatImpactAsCSV } = require('../helpers/flywheelHelper');
    const csvData = formatImpactAsCSV(impactData);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ttx-flywheel-impact.csv"');
    
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/flywheel/my-impact/insights
 * @desc Get personal improvement insights and recommendations
 */
router.get('/my-impact/insights', protect, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Check if TTX token is seeded
    const isSeeded = await isTTXTokenSeeded(Token);
    if (!isSeeded) {
      return res.status(503).json({
        success: false,
        message: 'TTX token not available yet. Please try again later.'
      });
    }
    
    // Use centralized helper for consistent calculations
    const impactData = await calculateUserImpact(userId);
    
    // Generate personal insights
    const insights = generatePersonalInsights(impactData);
    
    res.json({
      success: true,
      insights
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
