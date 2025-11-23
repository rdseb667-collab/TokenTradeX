const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { validateRequest, createOrderSchema } = require('../middleware/validation');
const orderMatchingService = require('../services/orderMatchingService');
const { tradingLimiter, cancelLimiter } = require('../middleware/rateLimiter');

// Debug middleware for PATCH requests
router.use('/:id', (req, res, next) => {
  if (req.method === 'PATCH') {
    console.log('📍 PATCH ROUTE HIT:', {
      method: req.method,
      path: req.path,
      params: req.params,
      url: req.url
    });
  }
  next();
});

router.post('/', protect, tradingLimiter, validateRequest(createOrderSchema), orderController.createOrder);
router.get('/', protect, orderController.getUserOrders);
router.get('/:id', protect, orderController.getOrderById);
router.patch('/:id', protect, tradingLimiter, orderController.updateOrder);
router.delete('/:id', protect, cancelLimiter, orderController.cancelOrder);

// Order book endpoint
router.get('/book/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { depth = 20 } = req.query;
    
    const orderBook = await orderMatchingService.getOrderBookSnapshot(symbol, parseInt(depth));
    
    res.json({
      success: true,
      data: orderBook || { bids: [], asks: [], spread: 0 }
    });
  } catch (error) {
    console.log('Order book fetch error (non-critical):', error.message);
    // Return empty order book instead of 500 error
    res.json({
      success: true,
      data: { bids: [], asks: [], spread: 0 },
      message: 'No orders in the book yet'
    });
  }
});

module.exports = router;
