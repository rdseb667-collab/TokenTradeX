const express = require('express');
const router = express.Router();
const rwaController = require('../controllers/rwaController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/tokens', rwaController.getAllRWATokens);
router.get('/tokens/category/:category', rwaController.getTokensByCategory);
router.get('/stats', rwaController.getMarketStats);

// Admin routes (requires authentication)
router.post('/tokens', protect, rwaController.createRWAToken);
router.post('/tokens/stock', protect, rwaController.createStockToken);
router.post('/tokens/commodity', protect, rwaController.createCommodityToken);
router.post('/tokens/real-estate', protect, rwaController.createRealEstateToken);
router.put('/tokens/:tokenId/valuation', protect, rwaController.updateValuation);
router.post('/tokens/:tokenId/dividends', protect, rwaController.distributeDividends);

module.exports = router;
