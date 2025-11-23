const express = require('express');
const router = express.Router();
const prometheusMetrics = require('../services/prometheusMetrics');

/**
 * GET /metrics
 * Prometheus metrics endpoint
 * 
 * Returns metrics in Prometheus text-based exposition format
 * Can be scraped by Prometheus, Grafana, or other monitoring tools
 */
router.get('/', async (req, res) => {
  try {
    res.set('Content-Type', prometheusMetrics.getContentType());
    const metrics = await prometheusMetrics.getMetrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate metrics'
    });
  }
});

module.exports = router;
