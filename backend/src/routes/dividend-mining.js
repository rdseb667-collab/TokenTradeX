const express = require('express');
const router = express.Router();
const dividendMiningController = require('../controllers/dividendMiningController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

/**
 * SYNTHETIC POSITIONS (Custom Baskets)
 */
router.post('/synthetic', dividendMiningController.createSyntheticPosition);
router.get('/synthetic', dividendMiningController.getSyntheticPositions);
router.post('/synthetic/:positionId/rebalance', dividendMiningController.rebalanceSynthetic);
router.post('/synthetic/:positionId/stake', dividendMiningController.stakeSynthetic);

/**
 * DIVIDEND LOTTERY
 */
router.get('/lottery', dividendMiningController.getLotteryHistory);

/**
 * STATS
 */
router.get('/stats', dividendMiningController.getStats);

module.exports = router;
