const express = require('express');
const router = express.Router();
const priceController = require('../controllers/priceController');

router.get('/live', priceController.getAllLivePrices);
router.get('/:symbol/live', priceController.getLivePrice);
router.get('/:symbol/chart', priceController.getChartData);

module.exports = router;
