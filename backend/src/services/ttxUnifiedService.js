const { ethers } = require('ethers');
const logger = require('./logger');

// Centralized revenue split percentages from environment
const HOLDER_PCT = (() => { const v = parseFloat(process.env.REVENUE_HOLDER_PERCENTAGE ?? '0.15'); return isNaN(v) ? 0.15 : v; })();
const RESERVE_PCT = (() => { const v = parseFloat(process.env.REVENUE_RESERVE_PERCENTAGE ?? '0.85'); return isNaN(v) ? 0.85 : v; })();

/**
 * TTX Unified Service
 * Integrates with TTXUnified.sol smart contract
 * Handles all token operations, staking, revenue distribution
 */
class TTXUnifiedService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.initialized = false;
    
    this.contractAddress = process.env.TTX_UNIFIED_ADDRESS || null;
    
    // Simplified ABI for integration
    this.abi = [
      'function stake(uint256 amount) external',
      'function createLock(uint256 amount, uint256 duration) external',
      'function unstake(uint256 amount) external',
      'function collectRevenue(uint256 streamId, uint256 amount) external payable',
      'function getStakeInfo(address account) external view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
      'function getRevenueStats() external view returns (uint256, uint256, uint256, uint256)',
      'function calculateEarned(address account) external view returns (uint256)',
      'function balanceOf(address account) external view returns (uint256)',
      'function totalStaked() external view returns (uint256)',
      'function totalRevenueCollected() external view returns (uint256)',
      'function revenueStreams(uint256) external view returns (string, uint256, uint256, uint256, bool)',
      'function startLiquidityMining(uint256 rewardRate, uint256 duration) external',
      'function stakeLPTokens(uint256 amount) external'
    ];
  }

  async initialize() {
    try {
      if (!this.contractAddress) {
        logger.warn('TTX Unified contract address not configured');
        return false;
      }

      const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.BSC_RPC_URL || 'http://localhost:8545';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      const wallet = new ethers.Wallet(
        process.env.PLATFORM_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey,
        this.provider
      );
      
      this.contract = new ethers.Contract(this.contractAddress, this.abi, wallet);
      this.initialized = true;
      
      logger.info('TTX Unified Service initialized', {
        contractAddress: this.contractAddress
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize TTX Unified Service', { error: error.message });
      return false;
    }
  }

  /**
   * Collect revenue from platform operations
   * Auto-compounding for all stakers!
   * 
   * @param {number} streamId - Revenue stream ID (0-9)
   * @param {number} amount - Amount in ETH (already converted from USD if needed)
   * @param {boolean} sendValue - If true, send ETH with transaction (default: false)
   */
  async collectRevenue(streamId, amount, sendValue = false) {
    try {
      if (!this.initialized) {
        throw new Error('Service not initialized');
      }

      const amountWei = ethers.parseEther(amount.toString());
      const txOptions = sendValue ? { value: amountWei } : { value: 0 };
      
      const tx = await this.contract.collectRevenue(streamId, amountWei, txOptions);
      
      await tx.wait();
      
      logger.info('Revenue collected - 85/15 split active', {
        streamId,
        amount,
        holderShare: amount * HOLDER_PCT,
        platformShare: amount * RESERVE_PCT,
        ethSent: sendValue
      });
      
      return {
        success: true,
        txHash: tx.hash,
        streamId,
        amount
      };
    } catch (error) {
      logger.error('Failed to collect revenue', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user's complete stake information
   */
  async getUserStakeInfo(userAddress) {
    try {
      if (!this.initialized) return null;

      const [stakedAmount, lockedAmount, lockEnd, pendingRewards, totalRewards, votingPower] = 
        await this.contract.getStakeInfo(userAddress);

      return {
        stakedAmount: parseFloat(ethers.formatEther(stakedAmount)),
        lockedAmount: parseFloat(ethers.formatEther(lockedAmount)),
        lockEnd: Number(lockEnd),
        pendingRewards: parseFloat(ethers.formatEther(pendingRewards)),
        totalRewards: parseFloat(ethers.formatEther(totalRewards)),
        votingPower: parseFloat(ethers.formatEther(votingPower)),
        isLocked: Number(lockEnd) > Date.now() / 1000
      };
    } catch (error) {
      logger.error('Failed to get stake info', { error: error.message });
      return null;
    }
  }

  /**
   * Get platform revenue statistics
   */
  async getRevenueStats() {
    try {
      if (!this.initialized) return null;

      const [total, holderShare, reserveShare, backingPerToken] = 
        await this.contract.getRevenueStats();

      return {
        totalRevenue: parseFloat(ethers.formatEther(total)),
        holderShare: parseFloat(ethers.formatEther(holderShare)),
        reserveShare: parseFloat(ethers.formatEther(reserveShare)),
        backingPerToken: parseFloat(ethers.formatEther(backingPerToken))
      };
    } catch (error) {
      logger.error('Failed to get revenue stats', { error: error.message });
      return null;
    }
  }

  /**
   * Get all revenue streams performance
   */
  async getAllRevenueStreams() {
    try {
      if (!this.initialized) return [];

      const streams = [];
      for (let i = 0; i < 10; i++) {
        const [name, totalCollected, holderShare, reserveShare, isActive] = 
          await this.contract.revenueStreams(i);
        
        streams.push({
          id: i,
          name,
          totalCollected: parseFloat(ethers.formatEther(totalCollected)),
          holderShare: parseFloat(ethers.formatEther(holderShare)),
          reserveShare: parseFloat(ethers.formatEther(reserveShare)),
          isActive
        });
      }

      return streams;
    } catch (error) {
      logger.error('Failed to get revenue streams', { error: error.message });
      return [];
    }
  }

  /**
   * Calculate APY based on current revenue
   */
  async calculateAPY() {
    try {
      const stats = await this.getRevenueStats();
      if (!stats) return 0;

      const totalStaked = await this.contract.totalStaked();
      const stakedAmount = parseFloat(ethers.formatEther(totalStaked));
      
      if (stakedAmount === 0) return 0;

      // Annual revenue share / total staked
      const monthlyRevenue = stats.holderShare;
      const annualRevenue = monthlyRevenue * 12;
      const apy = (annualRevenue / stakedAmount) * 100;

      return apy;
    } catch (error) {
      logger.error('Failed to calculate APY', { error: error.message });
      return 0;
    }
  }

  /**
   * Start liquidity mining program
   */
  async startLiquidityMining(rewardRate, durationDays) {
    try {
      if (!this.initialized) {
        throw new Error('Service not initialized');
      }

      const duration = durationDays * 24 * 60 * 60; // Convert to seconds
      const tx = await this.contract.startLiquidityMining(rewardRate, duration);
      await tx.wait();

      logger.info('Liquidity mining program started', {
        rewardRate,
        durationDays
      });

      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      logger.error('Failed to start liquidity mining', { error: error.message });
      throw error;
    }
  }
}

module.exports = new TTXUnifiedService();
