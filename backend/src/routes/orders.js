const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { validateRequest, createOrderSchema } = require('../middleware/validation');
const orderMatchingService = require('../services/orderMatchingService');

router.post('/', protect, validateRequest(createOrderSchema), orderController.createOrder);
router.get('/', protect, orderController.getUserOrders);
router.get('/:id', protect, orderController.getOrderById);
router.delete('/:id', protect, orderController.cancelOrder);

// Order book endpoint
router.get('/book/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { depth = 20 } = req.query;
    
    const orderBook = await orderMatchingService.getOrderBookSnapshot(symbol, parseInt(depth));
    
    res.json({
      success: true,
      data: orderBook
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
