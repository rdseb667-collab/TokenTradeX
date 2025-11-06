const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const tokenListingService = require('../services/tokenListingService');

/**
 * GET /api/token-listings/tiers
 * Get all listing tiers and pricing
 */
router.get('/tiers', (req, res) => {
  try {
    const tiers = tokenListingService.getAllTiers();
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
 * POST /api/token-listings/submit
 * Submit a new token listing request
 */
router.post('/submit', async (req, res) => {
  try {
    const listing = await tokenListingService.submitListing(req.body);
    res.json({
      success: true,
      listing,
      message: 'Listing submitted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/token-listings
 * Get all listings (admin only)
 */
router.get('/', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { status, paymentStatus } = req.query;
    const listings = await tokenListingService.getAllListings({ status, paymentStatus });
    
    res.json({
      success: true,
      listings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/token-listings/:id
 * Get specific listing
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const listing = await tokenListingService.getListing(req.params.id);
    res.json({
      success: true,
      listing
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/token-listings/:id/approve
 * Approve a listing (admin only)
 */
router.post('/:id/approve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const result = await tokenListingService.approveListing(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/token-listings/:id/reject
 * Reject a listing (admin only)
 */
router.post('/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { reason } = req.body;
    const result = await tokenListingService.rejectListing(req.params.id, reason);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/token-listings/:id/confirm-payment
 * Confirm payment received (admin only)
 */
router.post('/:id/confirm-payment', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { txHash } = req.body;
    const result = await tokenListingService.confirmPayment(req.params.id, txHash);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/token-listings/:id/go-live
 * Make listing go live (admin only)
 */
router.post('/:id/go-live', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const result = await tokenListingService.goLive(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/token-listings/revenue/stats
 * Get listing revenue statistics (admin only)
 */
router.get('/revenue/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = await tokenListingService.getRevenueStats();
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
