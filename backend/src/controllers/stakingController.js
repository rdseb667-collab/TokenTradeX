const stakingService = require('../services/stakingService');

class StakingController {
  constructor() {
    this.stake = this.stake.bind(this);
    this.unstake = this.unstake.bind(this);
    this.emergencyWithdraw = this.emergencyWithdraw.bind(this);
    this.getPositions = this.getPositions.bind(this);
    this.getStats = this.getStats.bind(this);
    this.getApyRates = this.getApyRates.bind(this);
  }

  /**
   * POST /api/staking/stake
   * Create new staking position
   */
  async stake(req, res) {
    try {
      const { tokenId, amount, lockPeriod, autoCompound } = req.body;
      const userId = req.user.id;

      const result = await stakingService.stake(
        userId,
        tokenId,
        parseFloat(amount),
        lockPeriod,
        autoCompound !== false // default true
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/staking/unstake/:positionId
   * Unstake after lock period
   */
  async unstake(req, res) {
    try {
      const { positionId } = req.params;
      const userId = req.user.id;

      const result = await stakingService.unstake(userId, positionId);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/staking/emergency-withdraw/:positionId
   * Emergency withdrawal with penalty
   */
  async emergencyWithdraw(req, res) {
    try {
      const { positionId } = req.params;
      const userId = req.user.id;

      const result = await stakingService.emergencyWithdraw(userId, positionId);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/staking/positions
   * Get user's staking positions
   */
  async getPositions(req, res) {
    try {
      const userId = req.user.id;
      const positions = await stakingService.getUserPositions(userId);

      res.json({
        success: true,
        positions: positions || []
      });
    } catch (error) {
      console.error('Staking positions error:', error);
      res.json({
        success: true,
        positions: []
      });
    }
  }

  /**
   * GET /api/staking/stats
   * Get staking statistics
   */
  async getStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await stakingService.getStats(userId);

      res.json({
        success: true,
        stats: stats || {}
      });
    } catch (error) {
      console.error('Staking stats error:', error);
      res.json({
        success: true,
        stats: { totalStaked: 0, totalRewards: 0, activePositions: 0 }
      });
    }
  }

  /**
   * GET /api/staking/apy-rates
   * Get APY rates for different lock periods
   */
  async getApyRates(req, res) {
    const StakingService = require('../services/stakingService');
    res.json({
      success: true,
      rates: StakingService.APY_RATES,
      penaltyRate: StakingService.EARLY_WITHDRAWAL_PENALTY
    });
  }
}

module.exports = new StakingController();
