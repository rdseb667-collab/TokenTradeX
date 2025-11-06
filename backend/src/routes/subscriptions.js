const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const subscriptionService = require('../services/subscriptionService');

/**
 * GET /api/subscriptions/tiers
 * Get all available subscription tiers
 */
router.get('/tiers', (req, res) => {
  try {
    const tiers = subscriptionService.getAllTiers();
    res.json({
      success: true,
      tiers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/subscriptions/my-subscription
 * Get current user's subscription
 */
router.get('/my-subscription', protect, async (req, res) => {
  try {
    const subscription = await subscriptionService.getUserSubscription(req.user.id);
    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/subscriptions/upgrade
 * Upgrade to a new tier
 */
router.post('/upgrade', protect, async (req, res) => {
  try {
    const { tier, paymentMethod } = req.body;

    if (!tier) {
      return res.status(400).json({
        success: false,
        error: 'Tier is required'
      });
    }

    const subscription = await subscriptionService.upgradeTier(
      req.user.id,
      tier,
      paymentMethod
    );

    res.json({
      success: true,
      subscription,
      message: `Successfully upgraded to ${tier} tier`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel current subscription
 */
router.post('/cancel', protect, async (req, res) => {
  try {
    const result = await subscriptionService.cancelSubscription(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/subscriptions/feature-access/:feature
 * Check if user has access to a feature
 */
router.get('/feature-access/:feature', protect, async (req, res) => {
  try {
    const { feature } = req.params;
    const hasAccess = await subscriptionService.checkFeatureAccess(req.user.id, feature);
    
    res.json({
      success: true,
      hasAccess,
      feature
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
