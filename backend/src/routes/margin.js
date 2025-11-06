const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/**
 * Simple in-memory config to drive UI
 */
const marginConfig = {
  maxLeverage: 3,             // 3x leverage
  baseAPR: 0.12,              // 12% annual
  tiers: [
    { level: 'Basic', apr: 0.14, maxBorrowUSD: 5000 },
    { level: 'Pro', apr: 0.12, maxBorrowUSD: 25000 },
    { level: 'Elite', apr: 0.10, maxBorrowUSD: 100000 }
  ],
  riskNotices: [
    'Borrowing increases exposure; losses may exceed principal.',
    'Liquidation can occur if collateral value falls below maintenance.',
    'Interest accrues daily; unpaid interest increases total liability.'
  ]
};

// GET /api/margin/config
router.get('/config', protect, (req, res) => {
  res.json({ success: true, config: marginConfig });
});

// POST /api/margin/borrow
router.post('/borrow', protect, (req, res) => {
  const { amount, token = 'USDT' } = req.body || {};
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be > 0' });
  }
  
  // Enforce tier-based limits (assume Elite max for MVP)
  const maxBorrowLimit = marginConfig.tiers[2].maxBorrowUSD; // Elite: 100k
  if (amount > maxBorrowLimit) {
    return res.status(400).json({ 
      success: false, 
      error: `Borrow amount exceeds maximum limit of $${maxBorrowLimit.toLocaleString()}. Please upgrade your tier or reduce the amount.` 
    });
  }
  
  return res.json({
    success: true,
    message: `Borrow request accepted for ${amount} ${token}.`,
    loan: {
      id: `loan_${Date.now()}`,
      token,
      principal: amount,
      apr: marginConfig.baseAPR,
      leverageUsed: Math.min(marginConfig.maxLeverage, 3),
      status: 'pending'
    }
  });
});

// POST /api/margin/repay
router.post('/repay', protect, (req, res) => {
  const { amount, loanId } = req.body || {};
  if (!amount || amount <= 0 || !loanId) {
    return res.status(400).json({ success: false, error: 'loanId and amount > 0 required' });
  }
  return res.json({
    success: true,
    message: `Repayment of ${amount} processed for loan ${loanId}.`,
    loanId
  });
});

module.exports = router;
