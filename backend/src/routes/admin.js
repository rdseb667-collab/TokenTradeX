const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
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
router.get('/stats/revenue', adminController.getRevenueStats);

/**
 * USER MANAGEMENT - 2FA required for role/status changes
 */
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId/kyc', adminController.updateKYCStatus);
router.put('/users/:userId/role', require2FA, adminController.updateUserRole);
router.put('/users/:userId/status', require2FA, adminController.updateUserStatus);

/**
 * FRACTIONAL SHARE ADMIN CONTROLS
 */
router.post('/fractional/:tokenId/enable', adminController.enableFractionalTrading);
router.put('/fractional/:tokenId/settings', adminController.updateFractionalSettings);
router.get('/fractional/holders', adminController.getFractionalHolders);

/**
 * RWA ASSET MANAGEMENT
 */
router.get('/rwa/pending', adminController.getPendingRWAAssets);
router.put('/rwa/:tokenId/approve', adminController.approveRWAAsset);
router.put('/rwa/:tokenId/reject', adminController.rejectRWAAsset);
router.delete('/rwa/:tokenId', adminController.deleteRWAAsset);

/**
 * AUTOMATION MANAGEMENT - 2FA required for config changes
 */
router.get('/automation/schedules', adminController.getAllAutomationSchedules);
router.post('/automation/execute-manually', require2FA, adminController.manuallyExecutePayment);
router.delete('/automation/:scheduleId', require2FA, adminController.deleteAutomationSchedule);

/**
 * COMPLIANCE & AUDIT
 */
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/compliance/report', adminController.generateComplianceReport);

/**
 * DIVIDEND AUTOMATION OVERVIEW
 */
router.get('/dividends/overview', adminController.getDividendOverview);

module.exports = router;
