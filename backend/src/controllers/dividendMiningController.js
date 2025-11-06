const dividendMiningService = require('../services/dividendMiningService');

class DividendMiningController {
  constructor() {
    // Bind all methods
    this.createSyntheticPosition = this.createSyntheticPosition.bind(this);
    this.getSyntheticPositions = this.getSyntheticPositions.bind(this);
    this.rebalanceSynthetic = this.rebalanceSynthetic.bind(this);
    this.stakeSynthetic = this.stakeSynthetic.bind(this);
    this.getLotteryHistory = this.getLotteryHistory.bind(this);
    this.getStats = this.getStats.bind(this);
  }

  /**
   * POST /api/dividend-mining/synthetic
   * Create a custom basket/portfolio
   */
  async createSyntheticPosition(req, res) {
    try {
      const { name, description, composition, stakingEnabled } = req.body;
      const userId = req.user.id;

      const result = await dividendMiningService.createSyntheticPosition({
        userId,
        name,
        description,
        composition, // [{tokenId, percentage}, ...]
        stakingEnabled: stakingEnabled || false
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/dividend-mining/synthetic
   * Get user's synthetic positions
   */
  async getSyntheticPositions(req, res) {
    try {
      const userId = req.user.id;
      const positions = await dividendMiningService.getUserSyntheticPositions(userId);

      res.json({
        success: true,
        positions: positions || []
      });
    } catch (error) {
      console.error('Synthetic positions error:', error);
      res.json({
        success: true,
        positions: []
      });
    }
  }

  /**
   * POST /api/dividend-mining/synthetic/:positionId/rebalance
   * Rebalance synthetic position to target allocations
   */
  async rebalanceSynthetic(req, res) {
    try {
      const { positionId } = req.params;

      const result = await dividendMiningService.rebalancePosition(positionId);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/dividend-mining/synthetic/:positionId/stake
   * Stake entire synthetic position
   */
  async stakeSynthetic(req, res) {
    try {
      const { positionId } = req.params;
      const { lockPeriod } = req.body;
      const userId = req.user.id;

      const result = await dividendMiningService.stakeSyntheticPosition(userId, positionId, lockPeriod);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/dividend-mining/lottery
   * Get dividend lottery history
   */
  async getLotteryHistory(req, res) {
    try {
      const { tokenId, limit = 10 } = req.query;
      const history = await dividendMiningService.getLotteryHistory(tokenId, parseInt(limit));

      res.json({
        success: true,
        history
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/dividend-mining/stats
   * Get dividend mining statistics
   */
  async getStats(req, res) {
    try {
      const stats = await dividendMiningService.getDividendMiningStats();

      res.json({
        success: true,
        stats: stats || {}
      });
    } catch (error) {
      console.error('Dividend mining stats error:', error);
      res.json({
        success: true,
        stats: { totalDividends: 0, lotteryWinnings: 0, syntheticPositions: 0 }
      });
    }
  }
}

module.exports = new DividendMiningController();
