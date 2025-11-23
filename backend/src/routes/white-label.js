const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const WhiteLabelPartner = require('../models/WhiteLabelPartner');
const ApiKey = require('../models/ApiKey');
const revenueStreamService = require('../services/revenueStreamService');

/**
 * WHITE LABEL LICENSING - Stream #8
 * B2B partnerships with revenue sharing
 */

// GET /api/white-label/tiers - Pricing tiers
router.get('/tiers', (req, res) => {
  const tiers = [
    {
      name: 'Basic',
      tier: 'basic',
      monthlyFee: 4999,
      revenueShare: '70/30',
      features: [
        'Spot trading only',
        'Your branding & colors',
        'Custom domain',
        'API access',
        'Up to 1,000 users',
        'Email support'
      ],
      setup: 'Basic integration',
      recommended: false
    },
    {
      name: 'Professional',
      tier: 'professional',
      monthlyFee: 9999,
      revenueShare: '70/30',
      features: [
        'Full trading suite',
        'Staking & lending',
        'NFT marketplace',
        'Copy trading',
        'Up to 10,000 users',
        'Webhook events',
        'Priority support',
        'Custom features'
      ],
      setup: 'Full integration + training',
      recommended: true
    },
    {
      name: 'Enterprise',
      tier: 'enterprise',
      monthlyFee: 19999,
      revenueShare: '70/30',
      features: [
        'Everything in Pro',
        'Unlimited users',
        'Your own token listing',
        'Dedicated infrastructure',
        '24/7 support',
        'SLA guarantee',
        'Custom development',
        'Revenue optimization consulting'
      ],
      setup: 'White-glove onboarding',
      recommended: false
    }
  ];
  
  res.json({ success: true, tiers });
});

// POST /api/white-label/apply - Apply for partnership (public)
router.post('/apply', async (req, res) => {
  try {
    const { companyName, brandName, contactEmail, contactPhone, tier = 'basic', notes } = req.body;
    
    if (!companyName || !brandName || !contactEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'companyName, brandName, and contactEmail required' 
      });
    }
    
    // Check for duplicate
    const existing = await WhiteLabelPartner.findOne({
      where: { companyName }
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Application already exists for this company'
      });
    }
    
    // Create application (pending admin approval)
    const partner = await WhiteLabelPartner.create({
      userId: null, // Will be assigned admin user later
      companyName,
      brandName,
      contactEmail,
      contactPhone: contactPhone || null,
      tier,
      status: 'pending',
      notes: notes || 'New application'
    });
    
    res.json({
      success: true,
      message: 'White label application submitted! We\'ll contact you within 24 hours.',
      application: {
        id: partner.id,
        companyName: partner.companyName,
        tier: partner.tier,
        monthlyFee: `$${partner.monthlyFee}/month`,
        status: 'pending_review'
      }
    });
  } catch (error) {
    console.error('Apply white label error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/white-label/partners - Get all partners (admin only)
router.get('/partners', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    
    const partners = await WhiteLabelPartner.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    
    const totalRevenue = partners.reduce((sum, p) => sum + parseFloat(p.platformShareCollected), 0);
    
    res.json({
      success: true,
      partners,
      stats: {
        total: partners.length,
        active: partners.filter(p => p.status === 'active').length,
        pending: partners.filter(p => p.status === 'pending').length,
        totalRevenueGenerated: totalRevenue.toFixed(2),
        averagePerPartner: partners.length > 0 ? (totalRevenue / partners.length).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get partners error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/white-label/partners/:partnerId/activate - Activate partner (admin only)
router.post('/partners/:partnerId/activate', protect, adminOnly, async (req, res) => {
  try {
    const { adminUserId, customDomain, primaryColor } = req.body;
    
    const partner = await WhiteLabelPartner.findByPk(req.params.partnerId);
    
    if (!partner) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }
    
    // Create dedicated API key for partner
    const apiKey = await ApiKey.create({
      userId: adminUserId || req.user.id,
      name: `${partner.brandName} White Label`,
      tier: 'white_label',
      status: 'active',
      permissions: {
        read: true,
        trade: true,
        withdraw: false,
        admin: false
      }
    });
    
    // Activate partner
    await partner.update({
      userId: adminUserId || req.user.id,
      status: 'active',
      apiKeyId: apiKey.id,
      customDomain: customDomain || null,
      primaryColor: primaryColor || '#00ff88',
      activatedAt: new Date()
    });
    
    // Collect first month's licensing fee (Stream #8)
    const monthlyFee = parseFloat(partner.monthlyFee);
    setImmediate(async () => {
      try {
        await require('../helpers/revenueCollector').collectRevenue(
          8,
          monthlyFee,
          `White Label: ${partner.brandName} - Monthly license`
        );
        console.log(`🏢 White label license fee: $${monthlyFee} (${partner.tier})`);
      } catch (error) {
        console.error('Failed to collect white label fee:', error.message);
      }
    });
    
    res.json({
      success: true,
      message: `${partner.brandName} activated successfully!`,
      partner,
      apiKey: {
        key: apiKey.key,
        secret: apiKey.secret,
        message: '⚠️ Save these credentials - they will not be shown again!'
      }
    });
  } catch (error) {
    console.error('Activate partner error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/white-label/partners/:partnerId/payout - Process monthly revenue share (admin only)
router.post('/partners/:partnerId/payout', protect, adminOnly, async (req, res) => {
  try {
    const partner = await WhiteLabelPartner.findByPk(req.params.partnerId);
    
    if (!partner) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }
    
    // Calculate payout (70% to partner, 30% to platform)
    const totalRevenue = parseFloat(partner.totalRevenueGenerated);
    const platformShare = totalRevenue * 0.30;
    const partnerShare = totalRevenue * 0.70;
    const unpaidPartnerShare = partnerShare - parseFloat(partner.partnerSharePaid);
    const uncollectedPlatformShare = platformShare - parseFloat(partner.platformShareCollected);
    
    if (unpaidPartnerShare <= 0) {
      return res.status(400).json({
        success: false,
        error: 'No outstanding payout',
        partnerSharePaid: partner.partnerSharePaid,
        partnerShareOwed: partnerShare
      });
    }
    
    // Update partner
    await partner.update({
      partnerSharePaid: partnerShare,
      platformShareCollected: platformShare,
      lastPayoutAt: new Date(),
      nextPayoutDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
    });
    
    // Collect platform's share (Stream #8)
    setImmediate(async () => {
      try {
        await require('../helpers/revenueCollector').collectRevenue(
          8,
          uncollectedPlatformShare,
          `White Label Revenue Share: ${partner.brandName} - 30% platform share`
        );
        console.log(`🏢 White label revenue share: $${uncollectedPlatformShare.toFixed(2)} (30% of $${totalRevenue.toFixed(2)})`);
      } catch (error) {
        console.error('Failed to collect white label share:', error.message);
      }
    });
    
    res.json({
      success: true,
      message: `Payout processed for ${partner.brandName}`,
      payout: {
        totalRevenue: totalRevenue.toFixed(2),
        platformShare: platformShare.toFixed(2),
        partnerShare: partnerShare.toFixed(2),
        paidToPartner: unpaidPartnerShare.toFixed(2),
        nextPayoutDate: partner.nextPayoutDate
      }
    });
  } catch (error) {
    console.error('Process payout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/white-label/partners/:partnerId/record-revenue - Record partner revenue (internal)
router.post('/partners/:partnerId/record-revenue', protect, async (req, res) => {
  try {
    const { amount, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount required' });
    }
    
    const partner = await WhiteLabelPartner.findByPk(req.params.partnerId);
    
    if (!partner) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }
    
    const revenueAmount = parseFloat(amount);
    
    // Update totals
    await partner.update({
      totalRevenueGenerated: parseFloat(partner.totalRevenueGenerated) + revenueAmount,
      totalTrades: partner.totalTrades + 1,
      totalVolume: parseFloat(partner.totalVolume) + revenueAmount
    });
    
    res.json({
      success: true,
      message: 'Revenue recorded',
      revenue: {
        amount: revenueAmount,
        description: description || 'Partner transaction',
        totalRevenue: partner.totalRevenueGenerated,
        platformShare: (parseFloat(partner.totalRevenueGenerated) * 0.30).toFixed(2),
        partnerShare: (parseFloat(partner.totalRevenueGenerated) * 0.70).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Record revenue error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/white-label/my-partnership - Get partnership info (for partner users)
router.get('/my-partnership', protect, async (req, res) => {
  try {
    const partner = await WhiteLabelPartner.findOne({
      where: { userId: req.user.id, status: 'active' },
      include: [{ model: ApiKey, as: 'apiKey', attributes: { exclude: ['secret'] } }]
    });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'No active partnership found for your account'
      });
    }
    
    const platformShare = parseFloat(partner.totalRevenueGenerated) * 0.30;
    const partnerShare = parseFloat(partner.totalRevenueGenerated) * 0.70;
    const unpaidShare = partnerShare - parseFloat(partner.partnerSharePaid);
    
    res.json({
      success: true,
      partnership: partner,
      earnings: {
        totalRevenue: partner.totalRevenueGenerated,
        yourShare: partnerShare.toFixed(2),
        paid: partner.partnerSharePaid,
        pending: unpaidShare.toFixed(2),
        platformShare: platformShare.toFixed(2),
        nextPayout: partner.nextPayoutDate
      },
      stats: {
        users: partner.totalUsers,
        trades: partner.totalTrades,
        volume: partner.totalVolume
      }
    });
  } catch (error) {
    console.error('Get my partnership error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
