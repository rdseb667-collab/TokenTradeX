const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ApiKey = require('../models/ApiKey');
const revenueStreamService = require('../services/revenueStreamService');

/**
 * API LICENSING - Stream #3
 * B2B Revenue through API access tiers
 */

// GET /api/licensing/tiers - Show pricing tiers
router.get('/tiers', (req, res) => {
  const tiers = [
    {
      name: 'Starter',
      tier: 'starter',
      monthlyFee: 99,
      features: [
        '10,000 requests/day',
        '60 requests/minute',
        'Read-only access',
        'Basic support',
        'Standard rate limits'
      ],
      limits: { perMinute: 60, perDay: 10000 }
    },
    {
      name: 'Professional',
      tier: 'professional',
      monthlyFee: 499,
      features: [
        '100,000 requests/day',
        '300 requests/minute',
        'Trading access',
        'Priority support',
        'Webhook notifications',
        'Custom alerts'
      ],
      limits: { perMinute: 300, perDay: 100000 },
      popular: true
    },
    {
      name: 'Enterprise',
      tier: 'enterprise',
      monthlyFee: 2499,
      features: [
        '1M requests/day',
        '1,000 requests/minute',
        'Full trading access',
        'Dedicated support',
        'White-label options',
        'Custom integration',
        'SLA guarantee'
      ],
      limits: { perMinute: 1000, perDay: 1000000 }
    },
    {
      name: 'White Label',
      tier: 'white_label',
      monthlyFee: 9999,
      features: [
        '10M requests/day',
        '5,000 requests/minute',
        'Full platform access',
        '24/7 dedicated support',
        'Revenue sharing (70/30)',
        'Custom branding',
        'Dedicated infrastructure',
        'API partnership program'
      ],
      limits: { perMinute: 5000, perDay: 10000000 }
    }
  ];
  
  res.json({ success: true, tiers });
});

// GET /api/licensing/keys - Get user's API keys
router.get('/keys', protect, async (req, res) => {
  try {
    const keys = await ApiKey.findAll({
      where: { userId: req.user.id },
      attributes: { exclude: ['secret'] }, // Don't expose secrets
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ success: true, keys });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/licensing/keys - Create new API key
router.post('/keys', protect, async (req, res) => {
  try {
    const { name, tier = 'starter', permissions, ipWhitelist } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'API key name required' });
    }
    
    // Check if user already has keys at this tier
    const existingCount = await ApiKey.count({
      where: { userId: req.user.id, tier, status: 'active' }
    });
    
    const maxKeysPerTier = tier === 'white_label' ? 10 : tier === 'enterprise' ? 5 : 3;
    if (existingCount >= maxKeysPerTier) {
      return res.status(400).json({ 
        success: false, 
        error: `Maximum ${maxKeysPerTier} active keys allowed for ${tier} tier` 
      });
    }
    
    const apiKey = await ApiKey.create({
      userId: req.user.id,
      name,
      tier,
      permissions: permissions || { read: true, trade: false, withdraw: false },
      ipWhitelist: ipWhitelist || []
    });
    
    // Collect monthly licensing fee (Stream #3)
    const monthlyFee = parseFloat(apiKey.monthlyFee);
    const revenueCollector = require('../helpers/revenueCollector');
    setImmediate(async () => {
      try {
        await revenueCollector.collectRevenue(
          3,
          monthlyFee,
          `API License: ${tier} tier - ${name}`
        );
        console.log(`🔑 API licensing revenue: $${monthlyFee} (${tier} tier)`);
      } catch (error) {
        console.error('Failed to collect API licensing fee:', error.message);
      }
    });
    
    res.json({
      success: true,
      message: `${tier} API key created! Monthly fee: $${monthlyFee}`,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key,
        secret: apiKey.secret, // Only shown once!
        tier: apiKey.tier,
        monthlyFee: apiKey.monthlyFee,
        rateLimitPerMinute: apiKey.rateLimitPerMinute,
        rateLimitPerDay: apiKey.rateLimitPerDay,
        permissions: apiKey.permissions,
        message: '⚠️ Save your secret key now - it will not be shown again!'
      }
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/licensing/keys/:keyId - Revoke API key
router.delete('/keys/:keyId', protect, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({
      where: { id: req.params.keyId, userId: req.user.id }
    });
    
    if (!apiKey) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }
    
    await apiKey.update({ status: 'revoked' });
    
    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/licensing/upgrade - Upgrade API tier
router.post('/upgrade', protect, async (req, res) => {
  try {
    const { keyId, newTier } = req.body;
    
    const apiKey = await ApiKey.findOne({
      where: { id: keyId, userId: req.user.id }
    });
    
    if (!apiKey) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }
    
    const tierLimits = {
      starter: { perMinute: 60, perDay: 10000, monthlyFee: 99 },
      professional: { perMinute: 300, perDay: 100000, monthlyFee: 499 },
      enterprise: { perMinute: 1000, perDay: 1000000, monthlyFee: 2499 },
      white_label: { perMinute: 5000, perDay: 10000000, monthlyFee: 9999 }
    };
    
    const limits = tierLimits[newTier];
    if (!limits) {
      return res.status(400).json({ success: false, error: 'Invalid tier' });
    }
    
    await apiKey.update({
      tier: newTier,
      rateLimitPerMinute: limits.perMinute,
      rateLimitPerDay: limits.perDay,
      monthlyFee: limits.monthlyFee
    });
    
    // Collect upgrade fee difference
    const upgradeFee = limits.monthlyFee - parseFloat(apiKey.monthlyFee);
    if (upgradeFee > 0) {
      const revenueCollector = require('../helpers/revenueCollector');
      setImmediate(async () => {
        try {
          await revenueCollector.collectRevenue(
            3,
            upgradeFee,
            `API Upgrade: ${apiKey.tier} → ${newTier}`
          );
          console.log(`⬆️ API tier upgrade revenue: $${upgradeFee}`);
        } catch (error) {
          console.error('Failed to collect upgrade fee:', error.message);
        }
      });
    }
    
    res.json({
      success: true,
      message: `Upgraded to ${newTier} tier!`,
      apiKey
    });
  } catch (error) {
    console.error('Upgrade API tier error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/licensing/usage/:keyId - Get API usage stats
router.get('/usage/:keyId', protect, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({
      where: { id: req.params.keyId, userId: req.user.id }
    });
    
    if (!apiKey) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }
    
    res.json({
      success: true,
      usage: {
        today: apiKey.requestsToday,
        thisMonth: apiKey.requestsThisMonth,
        total: apiKey.totalRequests,
        lastUsed: apiKey.lastUsedAt,
        limits: {
          perMinute: apiKey.rateLimitPerMinute,
          perDay: apiKey.rateLimitPerDay
        },
        percentUsed: {
          daily: ((apiKey.requestsToday / apiKey.rateLimitPerDay) * 100).toFixed(2),
          monthly: ((apiKey.requestsThisMonth / (apiKey.rateLimitPerDay * 30)) * 100).toFixed(2)
        },
        revenueGenerated: apiKey.revenueGenerated
      }
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
