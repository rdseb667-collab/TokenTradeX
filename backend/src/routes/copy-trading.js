const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/**
 * Mock provider directory
 */
const providers = [
  { id: 'prov_btc_alpha', name: 'BTC Alpha', performance24h: 2.1, performance30d: 18.4, followers: 1240, feeMonthlyUSD: 29 },
  { id: 'prov_eth_quant', name: 'ETH Quant', performance24h: -0.5, performance30d: 12.7, followers: 860, feeMonthlyUSD: 19 },
  { id: 'prov_momentum', name: 'MomentumX', performance24h: 1.4, performance30d: 24.3, followers: 1540, feeMonthlyUSD: 39 }
];

// GET /api/copy-trading/providers
router.get('/providers', protect, (req, res) => {
  res.json({ success: true, providers });
});

// POST /api/copy-trading/subscribe
router.post('/subscribe', protect, (req, res) => {
  const { providerId, autoCopy = true } = req.body || {};
  if (!providerId) {
    return res.status(400).json({ success: false, error: 'providerId required' });
  }
  return res.json({
    success: true,
    message: `Subscribed to ${providerId}`,
    subscription: { providerId, autoCopy, status: 'active' }
  });
});

// POST /api/copy-trading/unsubscribe
router.post('/unsubscribe', protect, (req, res) => {
  const { providerId } = req.body || {};
  if (!providerId) {
    return res.status(400).json({ success: false, error: 'providerId required' });
  }
  return res.json({
    success: true,
    message: `Unsubscribed from ${providerId}`,
    subscription: { providerId, status: 'cancelled' }
  });
});

// POST /api/copy-trading/copy-order
router.post('/copy-order', protect, (req, res) => {
  const { providerId, tokenSymbol, side, amount } = req.body || {};
  if (!providerId || !tokenSymbol || !side || !amount) {
    return res.status(400).json({ success: false, error: 'providerId, tokenSymbol, side, amount required' });
  }
  // Mock execution acceptance
  return res.json({
    success: true,
    message: `Copied ${side} ${amount} ${tokenSymbol} from ${providerId}`,
    order: {
      id: `copy_${Date.now()}`,
      providerId,
      tokenSymbol,
      side,
      amount,
      status: 'queued'
    }
  });
});

module.exports = router;
