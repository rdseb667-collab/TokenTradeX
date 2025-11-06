const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');
const { protect } = require('../middleware/auth');

router.get('/history', protect, tradeController.getUserTrades);
router.get('/analytics', protect, tradeController.getTradeAnalytics);
router.get('/market/:symbol', tradeController.getMarketTrades);
router.get('/:id', protect, tradeController.getTradeById);

module.exports = router;
