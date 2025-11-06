const express = require('express');
const router = express.Router();
const fractionalShareController = require('../controllers/fractionalShareController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

/**
 * Create new fractional stock token
 * POST /api/fractional-shares/create
 * Body: { ticker, companyName, pricePerShare, totalShares, exchange, dividendYield, sector }
 */
router.post('/create', fractionalShareController.createFractionalStock);

/**
 * Quick create popular stocks (AAPL, TSLA, NVDA, MSFT, GOOGL)
 * POST /api/fractional-shares/quick-create/popular
 */
router.post('/quick-create/popular', fractionalShareController.quickCreatePopularStocks);

/**
 * Buy fractional shares
 * POST /api/fractional-shares/buy
 * Body: { tokenId, fractionalAmount, paymentMethod }
 * Example: { tokenId: '123', fractionalAmount: 0.5, paymentMethod: 'USD' }
 * Result: Buy 0.5 shares instead of full $1,000 share
 */
router.post('/buy', fractionalShareController.buyFractionalShares);

/**
 * Distribute dividends
 * POST /api/fractional-shares/:tokenId/dividends
 * Body: { dividendPerShare, paymentDate }
 */
router.post('/:tokenId/dividends', fractionalShareController.distributeDividends);

/**
 * Update real-time valuation
 * PUT /api/fractional-shares/:tokenId/valuation
 * Body: { newPricePerShare, source }
 */
router.put('/:tokenId/valuation', fractionalShareController.updateValuation);

/**
 * Get user's fractional holdings
 * GET /api/fractional-shares/holdings
 */
router.get('/holdings', fractionalShareController.getUserHoldings);

/**
 * Compare traditional vs tokenized investing
 * GET /api/fractional-shares/compare/:pricePerShare
 * Example: /api/fractional-shares/compare/180
 */
router.get('/compare/:pricePerShare', fractionalShareController.getComparison);

module.exports = router;
