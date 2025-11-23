const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const CopyTradingSubscription = require('../models/CopyTradingSubscription');
const { createOrder } = require('../controllers/orderController');
const revenueStreamService = require('../services/revenueStreamService');
const { Order, Token, User } = require('../models');

/**
 * Mock provider directory (in production, these would be real verified traders)
 */
const providers = [
  { id: 'prov_btc_alpha', name: 'BTC Alpha Trader', performance24h: 2.1, performance30d: 18.4, followers: 1240, performanceFeePercent: 15 },
  { id: 'prov_eth_quant', name: 'ETH Quant Master', performance24h: -0.5, performance30d: 12.7, followers: 860, performanceFeePercent: 15 },
  { id: 'prov_momentum', name: 'MomentumX Pro', performance24h: 1.4, performance30d: 24.3, followers: 1540, performanceFeePercent: 15 }
];

// GET /api/copy-trading/providers
router.get('/providers', protect, (req, res) => {
  res.json({ success: true, providers });
});

// POST /api/copy-trading/subscribe
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { providerId, autoCopy = true } = req.body || {};
    if (!providerId) {
      return res.status(400).json({ success: false, error: 'providerId required' });
    }
    
    const provider = providers.find(p => p.id === providerId);
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    
    // Check if already subscribed
    let subscription = await CopyTradingSubscription.findOne({
      where: { userId: req.user.id, providerId, status: 'active' }
    });
    
    if (subscription) {
      return res.status(400).json({ success: false, error: 'Already subscribed to this provider' });
    }
    
    // Create subscription
    subscription = await CopyTradingSubscription.create({
      userId: req.user.id,
      providerId,
      providerName: provider.name,
      autoCopy,
      status: 'active'
    });
    
    return res.json({
      success: true,
      message: `Subscribed to ${provider.name}! Copy trading enabled.`,
      subscription
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/copy-trading/unsubscribe
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    const { providerId } = req.body || {};
    if (!providerId) {
      return res.status(400).json({ success: false, error: 'providerId required' });
    }
    
    const subscription = await CopyTradingSubscription.findOne({
      where: { userId: req.user.id, providerId, status: 'active' }
    });
    
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No active subscription found' });
    }
    
    await subscription.update({ status: 'cancelled' });
    
    return res.json({
      success: true,
      message: `Unsubscribed from ${subscription.providerName}`,
      subscription
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/copy-trading/copy-order
// Simulates copying a profitable trade and charging 15% performance fee
router.post('/copy-order', protect, async (req, res) => {
  try {
    const { providerId, tokenSymbol, side, amount } = req.body || {};
    if (!providerId || !tokenSymbol || !side || !amount) {
      return res.status(400).json({ success: false, error: 'providerId, tokenSymbol, side, amount required' });
    }
    
    // Check subscription
    const subscription = await CopyTradingSubscription.findOne({
      where: { userId: req.user.id, providerId, status: 'active' }
    });
    
    if (!subscription) {
      return res.status(403).json({ success: false, error: 'Not subscribed to this provider' });
    }
    
    // Get token
    const token = await Token.findOne({ where: { symbol: tokenSymbol } });
    if (!token) {
      return res.status(404).json({ success: false, error: 'Token not found' });
    }
    
    // Simulate order execution (in real system, this would actually place the order)
    const executionPrice = parseFloat(token.currentPrice);
    const quantity = parseFloat(amount);
    const totalValue = executionPrice * quantity;
    
    // Simulate profit (for demo: random 0.5% - 3% profit)
    const profitPercent = (Math.random() * 2.5 + 0.5) / 100; // 0.5% - 3%
    const profit = totalValue * profitPercent;
    
    // Calculate 15% performance fee (Stream #7)
    const performanceFeePercent = parseFloat(process.env.COPY_TRADING_PERFORMANCE_FEE || 15);
    const performanceFee = profit * (performanceFeePercent / 100);
    const netProfit = profit - performanceFee;
    
    // Update subscription stats
    await subscription.update({
      totalProfit: parseFloat(subscription.totalProfit) + netProfit,
      totalFeesPaid: parseFloat(subscription.totalFeesPaid) + performanceFee,
      copiedOrders: subscription.copiedOrders + 1
    });
    
    // Collect copy trading performance fee revenue (Stream #7)
    const revenueCollector = require('../helpers/revenueCollector');
    setImmediate(async () => {
      try {
        await revenueCollector.collectRevenue(
          7, 
          performanceFee, 
          `Copy trading: ${subscription.providerName} - ${performanceFeePercent}% of $${profit.toFixed(2)} profit`
        );
        console.log(`👥 Copy trading fee collected: $${performanceFee.toFixed(2)} (${performanceFeePercent}% of $${profit.toFixed(2)} profit)`);
      } catch (error) {
        console.error('Failed to collect copy trading fee:', error.message);
      }
    });
    
    return res.json({
      success: true,
      message: `Copied ${side} ${amount} ${tokenSymbol} from ${subscription.providerName}`,
      order: {
        id: `copy_${Date.now()}`,
        providerId,
        providerName: subscription.providerName,
        tokenSymbol,
        side,
        amount: quantity,
        executionPrice,
        totalValue,
        grossProfit: profit,
        performanceFee,
        netProfit,
        profitPercent: (profitPercent * 100).toFixed(2) + '%',
        status: 'executed'
      },
      subscription: {
        totalProfit: subscription.totalProfit,
        totalFeesPaid: subscription.totalFeesPaid,
        copiedOrders: subscription.copiedOrders
      }
    });
  } catch (error) {
    console.error('Copy order error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
