const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', tokenController.getAllTokens);
router.get('/:id', tokenController.getTokenById);
router.get('/:id/orderbook', tokenController.getOrderBook);

// Admin routes
router.post('/', protect, authorize('admin'), tokenController.createToken);
router.put('/:id', protect, authorize('admin'), tokenController.updateToken);
router.delete('/:id', protect, authorize('admin'), tokenController.deleteToken);

module.exports = router;
