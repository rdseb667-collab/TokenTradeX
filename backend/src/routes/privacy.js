const express = require('express');
const router = express.Router();
const privacyComplianceService = require('../services/privacyComplianceService');
const { protect } = require('../middleware/auth');

/**
 * PRIVACY & GDPR/CCPA COMPLIANCE ROUTES
 * User-facing endpoints for data rights
 */

// All privacy routes require authentication
router.use(protect);

/**
 * Get my privacy consents
 */
router.get('/consents', async (req, res, next) => {
  try {
    const consents = await privacyComplianceService.getUserConsents(req.user.id);

    res.json({
      success: true,
      data: consents
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Record privacy consent
 */
router.post('/consents', async (req, res, next) => {
  try {
    const result = await privacyComplianceService.recordConsent(
      req.user.id,
      req.body,
      req.ip,
      req.get('user-agent')
    );

    res.json({
      success: true,
      message: 'Consent recorded successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Revoke consent
 */
router.delete('/consents/:consentType', async (req, res, next) => {
  try {
    const result = await privacyComplianceService.revokeConsent(
      req.user.id,
      req.params.consentType
    );

    res.json({
      success: true,
      message: 'Consent revoked successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Export my data (GDPR Article 15 - Right to Access)
 */
router.get('/export', async (req, res, next) => {
  try {
    const data = await privacyComplianceService.exportUserData(req.user.id);

    // Log the access
    await privacyComplianceService.logDataAccess({
      userId: req.user.id,
      accessedBy: req.user.id,
      accessType: 'export',
      resourceType: 'user_data',
      resourceId: req.user.id,
      purpose: 'User-initiated data export (GDPR Article 15)',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Request account deletion (GDPR Article 17 - Right to be Forgotten)
 */
router.post('/delete-request', async (req, res, next) => {
  try {
    const { reason } = req.body;

    const result = await privacyComplianceService.requestDataDeletion(
      req.user.id,
      reason,
      req.user.email,
      req.ip
    );

    res.json({
      success: result.success,
      message: result.message,
      data: result.deletionRequest
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel pending deletion request
 */
router.delete('/delete-request/:requestId', async (req, res, next) => {
  try {
    const result = await privacyComplianceService.cancelDataDeletion(
      req.params.requestId,
      req.user.id
    );

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get my data access history
 */
router.get('/access-history', async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    const logs = await privacyComplianceService.getUserAccessHistory(
      req.user.id,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Check my required consents status
 */
router.get('/consents/check', async (req, res, next) => {
  try {
    const result = await privacyComplianceService.checkRequiredConsents(req.user.id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
