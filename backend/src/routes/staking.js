const express = require('express');
const router = express.Router();
const stakingController = require('../controllers/stakingController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

/**
 * STAKING ROUTES
 */

// Get APY rates (public for authenticated users)
router.get('/apy-rates', stakingController.getApyRates);

// Get user's staking positions
router.get('/positions', stakingController.getPositions);

// Get staking stats
router.get('/stats', stakingController.getStats);

// Create new stake
router.post('/stake', stakingController.stake);

// Unstake (after lock period)
router.post('/unstake/:positionId', stakingController.unstake);

// Emergency withdrawal (with penalty)
router.post('/emergency-withdraw/:positionId', stakingController.emergencyWithdraw);

module.exports = router;
