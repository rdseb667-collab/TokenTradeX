const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const postTradeQueueService = require('../services/postTradeQueueService');
const onChainRevenueRetryWorker = require('../services/onChainRevenueRetryWorker');
const marketIntegrityService = require('../services/marketIntegrityService');
const { protect, authorize, require2FA } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(protect);
router.use(authorize('admin', 'super_admin'));

/**
 * ADMIN STATISTICS & ANALYTICS
 */
router.get('/stats/overview', adminController.getOverviewStats);
router.get('/stats/users', adminController.getUserStats);
router.get('/stats/tokens', adminController.getTokenStats);
/**
 * REVENUE & FEE METRICS
 */
router.get('/stats/revenue', adminController.getRevenueStats);
router.get('/metrics/fee-revenue', adminController.getFeeRevenueMetrics);

/**
 * USER MANAGEMENT - 2FA required for role/status changes
 */
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId/kyc', adminController.updateKYCStatus);
router.put('/users/:userId/role', require2FA, adminController.updateUserRole);
router.put('/users/:userId/status', require2FA, adminController.updateUserStatus);

/**
 * FRACTIONAL SHARE ADMIN CONTROLS - 2FA required for enabling fractional trading
 */
router.post('/fractional/:tokenId/enable', require2FA, adminController.enableFractionalTrading);
router.put('/fractional/:tokenId/settings', require2FA, adminController.updateFractionalSettings);
router.get('/fractional/holders', adminController.getFractionalHolders);

/**
 * RWA ASSET MANAGEMENT - 2FA required for approval/rejection
 */
router.get('/rwa/pending', adminController.getPendingRWAAssets);
router.put('/rwa/:tokenId/approve', require2FA, adminController.approveRWAAsset);
router.put('/rwa/:tokenId/reject', require2FA, adminController.rejectRWAAsset);
router.delete('/rwa/:tokenId', require2FA, adminController.deleteRWAAsset);

/**
 * AUTOMATION MANAGEMENT - 2FA required for config changes
 */
router.get('/automation/schedules', adminController.getAllAutomationSchedules);
router.post('/automation/execute-manually', require2FA, adminController.manuallyExecutePayment);
router.delete('/automation/:scheduleId', require2FA, adminController.deleteAutomationSchedule);

/**
 * WITHDRAWAL APPROVAL MANAGEMENT - 2FA required
 */
router.get('/withdrawals/pending', adminController.getPendingWithdrawals);
router.post('/withdrawals/:transactionId/approve', require2FA, adminController.approveWithdrawal);
router.post('/withdrawals/:transactionId/reject', require2FA, adminController.rejectWithdrawal);

/**
 * COMPLIANCE & AUDIT
 */
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/compliance/report', adminController.generateComplianceReport);

/**
 * DIVIDEND AUTOMATION OVERVIEW
 */
router.get('/dividends/overview', adminController.getDividendOverview);

/**
 * POST-TRADE JOB QUEUE MONITORING
 */
router.get('/queue-stats', async (req, res, next) => {
  try {
    const stats = await postTradeQueueService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * REVENUE DEFENSE & MONITORING - 2FA required for parameter changes
 */
router.get('/revenue/defense-status', adminController.getRevenueDefenseStatus);
router.get('/revenue/concentration', adminController.getRevenueConcentration);
router.get('/revenue/negative-flows', adminController.getNegativeFlows);
router.get('/revenue/missing-events', adminController.getMissingRevenueEvents);
router.post('/revenue/parameter-change', require2FA, adminController.requestParameterChange);
router.get('/revenue/pending-changes', adminController.getPendingParameterChanges);

/**
 * ON-CHAIN REVENUE DELIVERY MONITORING
 */
router.get('/revenue/onchain-failures', async (req, res, next) => {
  try {
    const { streamId, hours } = req.query;
    const report = await onChainRevenueRetryWorker.getFailureReport(
      streamId ? parseInt(streamId, 10) : null,
      hours ? parseInt(hours, 10) : 24
    );
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
});

router.get('/revenue/onchain-worker-status', async (req, res, next) => {
  try {
    const status = onChainRevenueRetryWorker.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * MARKET INTEGRITY MONITORING
 */
router.get('/market/blocked-trades', async (req, res, next) => {
  try {
    const { limit } = req.query;
    const events = marketIntegrityService.getBlockedTradeEvents(
      limit ? parseInt(limit, 10) : 50
    );
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
});

router.get('/market/blocked-trade-stats', async (req, res, next) => {
  try {
    const stats = marketIntegrityService.getBlockedTradeStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GDPR/CCPA COMPLIANCE MANAGEMENT
 */
router.get('/privacy/deletion-requests', adminController.getDataDeletionRequests);
router.post('/privacy/deletion-requests/:requestId/execute', require2FA, adminController.executeDataDeletion);
router.get('/privacy/access-logs', adminController.getDataAccessLogs);
router.get('/privacy/users/:userId/consents', adminController.getUserConsents);
router.get('/privacy/compliance-report', adminController.getPrivacyComplianceReport);

module.exports = router;
