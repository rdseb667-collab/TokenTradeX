const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const referralService = require('../services/referralService');

// Get user's referral stats
router.get('/stats', protect, async (req, res, next) => {
  try {
    const stats = await referralService.getReferralStats(req.user.id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// Get reward information
router.get('/rewards', protect, async (req, res, next) => {
  try {
    const rewards = {
      newUserSignup: referralService.rewards.newUserSignup,
      referrerBonus: referralService.rewards.referrerBonus,
      firstTrade: referralService.rewards.firstTrade,
      milestones: {
        '1k': referralService.rewards.tradingMilestone1k,
        '10k': referralService.rewards.tradingMilestone10k,
        '100k': referralService.rewards.tradingMilestone100k
      }
    };
    
    res.json({
      success: true,
      data: rewards
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
