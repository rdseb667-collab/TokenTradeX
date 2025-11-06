const express = require('express');
const router = express.Router();
const activityFeedService = require('../services/activityFeedService');

// Get recent trading activity
router.get('/recent', async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const activities = activityFeedService.getRecentActivities(parseInt(limit));
    
    res.json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    next(error);
  }
});

// Get trading statistics
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await activityFeedService.getTradingStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res, next) => {
  try {
    const { timeframe = '24h', limit = 10 } = req.query;
    const leaderboard = await activityFeedService.getLeaderboard(timeframe, parseInt(limit));
    
    res.json({
      success: true,
      timeframe,
      data: leaderboard
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
