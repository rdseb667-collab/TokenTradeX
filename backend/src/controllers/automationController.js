const automationService = require('../services/smartContractAutomationService');

class AutomationController {
  
  /**
   * POST /api/automation/schedule
   * Create automated payment schedule (dividend, coupon, rental, etc.)
   */
  async createSchedule(req, res, next) {
    try {
      const result = await automationService.createPaymentSchedule(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/automation/execute/:tokenId
   * Execute scheduled payment for specific token
   */
  async executePayment(req, res, next) {
    try {
      const { tokenId } = req.params;
      const result = await automationService.executeScheduledPayment(tokenId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/automation/execute-all
   * Execute all due payments (cron job endpoint)
   */
  async executeAllDue(req, res, next) {
    try {
      const result = await automationService.executeDuePayments();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/automation/one-time
   * Execute one-time manual payment
   */
  async executeOneTime(req, res, next) {
    try {
      const result = await automationService.executeOneTimePayment(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/automation/history/:tokenId
   * Get payment history for token
   */
  async getHistory(req, res, next) {
    try {
      const { tokenId } = req.params;
      const result = await automationService.getPaymentHistory(tokenId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/automation/stats
   * Get automation statistics
   */
  async getStats(req, res, next) {
    try {
      const result = await automationService.getAutomationStats();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AutomationController();
