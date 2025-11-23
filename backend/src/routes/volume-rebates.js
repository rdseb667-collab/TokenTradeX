const express = require('express');
const router = express.Router();
const volumeRebateService = require('../services/volumeRebateService');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/volume-rebates/progress
 * @desc    Get current month rebate progress for user
 * @access  Private
 */
router.get('/progress', protect, async (req, res, next) => {
  try {
    const progress = await volumeRebateService.getUserMonthProgress(req.user.id);
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/volume-rebates/stats
 * @desc    Get platform rebate statistics
 * @access  Public
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await volumeRebateService.getRebateStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/volume-rebates/process/:year/:month
 * @desc    Manually trigger monthly rebate processing (admin only)
 * @access  Private/Admin
 */
router.post('/process/:year/:month', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { year, month } = req.params;
    
    const result = await volumeRebateService.processMonthlyRebates(
      parseInt(year),
      parseInt(month)
    );
    
    res.json({
      success: true,
      message: `Processed ${result.successful} rebates`,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/volume-rebates/tiers
 * @desc    Get volume rebate tiers configuration
 * @access  Public
 */
router.get('/tiers', async (req, res, next) => {
  try {
    const tiers = volumeRebateService.tiers;
    
    res.json({
      success: true,
      data: {
        tiers,
        description: 'Monthly fee rebates paid in TTX based on trading volume'
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
