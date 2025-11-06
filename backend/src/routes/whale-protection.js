const express = require('express');
const router = express.Router();
const whaleProtectionService = require('../services/whaleProtectionService');

// Get whale wallets (public - no auth required)
router.get('/whales', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const whales = await whaleProtectionService.getWhaleWallets(parseInt(limit));
    
    res.json({
      success: true,
      data: whales
    });
  } catch (error) {
    next(error);
  }
});

// Get platform statistics (public)
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await whaleProtectionService.getPlatformStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// Get circuit breaker status for a token (public)
router.get('/circuit-breaker/:tokenId', async (req, res, next) => {
  try {
    const { tokenId } = req.params;
    const status = await whaleProtectionService.checkCircuitBreaker(tokenId, 0);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
