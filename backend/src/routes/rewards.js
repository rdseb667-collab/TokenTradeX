const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const rewardService = require('../services/rewardService');

/**
 * POST /api/rewards/daily-login
 * Claim daily login reward
 */
router.post('/daily-login', protect, async (req, res) => {
  try {
    const result = await rewardService.giveDailyLoginReward(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/rewards/unclaimed
 * Get all unclaimed rewards
 */
router.get('/unclaimed', protect, async (req, res) => {
  try {
    const result = await rewardService.getUnclaimedRewards(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/rewards/claim-all
 * Claim all pending rewards
 */
router.post('/claim-all', protect, async (req, res) => {
  try {
    const result = await rewardService.claimAllRewards(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/rewards/stats
 * Get reward statistics
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const result = await rewardService.getRewardStats(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
