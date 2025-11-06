const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const apiKeyService = require('../services/apiKeyService');

/**
 * GET /api/api-keys/tiers
 * Get all API tiers and pricing
 */
router.get('/tiers', (req, res) => {
  try {
    const tiers = apiKeyService.getAllTiers();
    res.json({
      success: true,
      tiers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/api-keys/my-keys
 * Get user's API keys
 */
router.get('/my-keys', protect, async (req, res) => {
  try {
    const keys = await apiKeyService.getUserKeys(req.user.id);
    res.json({
      success: true,
      keys
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/api-keys/create
 * Create new API key
 */
router.post('/create', protect, async (req, res) => {
  try {
    const { name, tier, permissions } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const apiKey = await apiKeyService.createApiKey(
      req.user.id,
      name,
      tier || 'free',
      permissions
    );

    res.json({
      success: true,
      apiKey,
      warning: 'Save your secret key now - it will not be shown again!'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/api-keys/:keyId
 * Revoke an API key
 */
router.delete('/:keyId', protect, async (req, res) => {
  try {
    const { keyId } = req.params;
    const result = await apiKeyService.revokeKey(req.user.id, keyId);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/api-keys/usage
 * Get API usage statistics
 */
router.get('/usage', protect, async (req, res) => {
  try {
    const stats = await apiKeyService.getUsageStats(req.user.id);
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
