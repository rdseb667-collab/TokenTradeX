const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automationController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

/**
 * CREATE AUTOMATED PAYMENT SCHEDULE
 * POST /api/automation/schedule
 * 
 * Body: {
 *   tokenId: "uuid",
 *   paymentType: "dividend" | "coupon" | "rental" | "royalty" | "platform_fee",
 *   frequency: "monthly" | "quarterly" | "semi_annual" | "annual",
 *   amountPerToken: 0.25,
 *   startDate: "2025-01-01",
 *   endDate: null,  // null = runs forever
 *   metadata: {}
 * }
 * 
 * Example: Quarterly dividend of $0.25 per token
 * {
 *   "tokenId": "123",
 *   "paymentType": "dividend",
 *   "frequency": "quarterly",
 *   "amountPerToken": 0.25
 * }
 */
router.post('/schedule', automationController.createSchedule);

/**
 * EXECUTE SCHEDULED PAYMENT
 * POST /api/automation/execute/:tokenId
 * Manually trigger scheduled payment (normally runs via cron)
 */
router.post('/execute/:tokenId', automationController.executePayment);

/**
 * EXECUTE ALL DUE PAYMENTS
 * POST /api/automation/execute-all
 * Batch execute all payments that are due (cron job endpoint)
 */
router.post('/execute-all', automationController.executeAllDue);

/**
 * ONE-TIME PAYMENT
 * POST /api/automation/one-time
 * 
 * Body: {
 *   tokenId: "uuid",
 *   paymentType: "dividend" | "bonus" | "custom",
 *   totalAmount: 10000,
 *   description: "Special dividend"
 * }
 */
router.post('/one-time', automationController.executeOneTime);

/**
 * GET PAYMENT HISTORY
 * GET /api/automation/history/:tokenId
 */
router.get('/history/:tokenId', automationController.getHistory);

/**
 * GET AUTOMATION STATS
 * GET /api/automation/stats
 */
router.get('/stats', automationController.getStats);

module.exports = router;
