const { ethers } = require('ethers');
const logger = require('./logger');

// Centralized revenue split percentages from environment
const HOLDER_PCT = (() => { const v = parseFloat(process.env.REVENUE_HOLDER_PERCENTAGE ?? '0.15'); return isNaN(v) ? 0.15 : v; })();
const RESERVE_PCT = (() => { const v = parseFloat(process.env.REVENUE_RESERVE_PERCENTAGE ?? '0.85'); return isNaN(v) ? 0.85 : v; })();

/**
 * TTX Reserve Service - Growth-Focused Revenue Sharing
 * Manages 10 revenue streams that benefit ALL TTX holders
 * Early adopters get bonus multipliers
 */
class TTXReserveService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.initialized = false;
    
    // Contract addresses (will be set after deployment)
    this.TTX_TOKEN_ADDRESS = process.env.TTX_TOKEN_ADDRESS || null;
    this.TOKENIZED_POSITION_ADDRESS = process.env.TOKENIZED_POSITION_ADDRESS || null;
    
    // Fee tiers - More generous for growth
    this.feeTiers = [
      { minBalance: 100, discountPercent: 10, discountBps: 1000, revenueMultiplier: 1.1 },
      { minBalance: 1000, discountPercent: 20, discountBps: 2000, revenueMultiplier: 1.25 },
      { minBalance: 10000, discountPercent: 35, discountBps: 3500, revenueMultiplier: 1.5 },
      { minBalance: 100000, discountPercent: 50, discountBps: 5000, revenueMultiplier: 2.0 },
      { minBalance: 1000000, discountPercent: 70, discountBps: 7000, revenueMultiplier: 3.0 }
    ];
    
    // 10 Revenue Streams
    this.revenueStreams = [
      { id: 0, name: 'Trading Fees', active: true },
      { id: 1, name: 'Withdrawal Fees', active: true },
      { id: 2, name: 'Premium Subscriptions', active: true },
      { id: 3, name: 'API Licensing', active: true },
      { id: 4, name: 'Market Making', active: true },
      { id: 5, name: 'Lending Interest', active: true },
      { id: 6, name: 'Staking Commissions', active: true },
      { id: 7, name: 'Copy Trading Fees', active: true },
      { id: 8, name: 'White Label Licensing', active: true },
      { id: 9, name: 'Token Appreciation', active: true }
    ];
  }

  /**
   * Initialize connection to smart contract
   */
  async initialize() {
    try {
      if (!this.TTX_TOKEN_ADDRESS) {
        logger.warn('TTX Token address not configured');
        return;
      }

      // Connect to Ethereum network
      const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      const abi = [
        'function getUserFeeTier(address user) external view returns (uint256 tierId, uint256 discountBps, uint256 revenueMultiplier)',
        'function calculateDiscountedFee(address user, uint256 baseFee) external view returns (uint256)',
        'function balanceOf(address account) external view returns (uint256)',
        'function collectRevenue(uint256 streamId, uint256 amount) external payable',
        'function claimRevenueShare() external',
        'function markEarlyAdopter(address user, uint256 multiplier) external',
        'function distributeReward(address recipient, uint256 amount) external',
        'function totalRevenueCollected() external view returns (uint256)',
        'function revenueSharePercentage() external view returns (uint256)'
      ];

      // Create contract instance
      const wallet = new ethers.Wallet(
        process.env.PLATFORM_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey,
        this.provider
      );
      
      this.contract = new ethers.Contract(this.TTX_TOKEN_ADDRESS, abi, wallet);
      this.initialized = true;
      
      logger.info('TTX Reserve Service initialized', {
        tokenAddress: this.TTX_TOKEN_ADDRESS,
        network: await this.provider.getNetwork()
      });
    } catch (error) {
      logger.error('Failed to initialize TTX Reserve Service', { error: error.message });
    }
  }

  /**
   * Get user's TTX balance (from blockchain or cache)
   */
  async getUserTTXBalance(userAddress) {
    try {
      if (!this.initialized || !this.contract) {
        return 0;
      }

      const balance = await this.contract.balanceOf(userAddress);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      logger.error('Failed to get TTX balance', { userAddress, error: error.message });
      return 0;
    }
  }

  /**
   * Get user's fee tier based on TTX holdings
   */
  async getUserFeeTier(userAddress) {
    try {
      if (!this.initialized || !this.contract) {
        // Fallback to local calculation
        return this.feeTiers[0];
      }

      const [tierId, discountBps, revenueShareEnabled] = await this.contract.getUserFeeTier(userAddress);
      
      return {
        tierId: Number(tierId),
        discountPercent: Number(discountBps) / 100,
        discountBps: Number(discountBps),
        revenueShare: revenueShareEnabled
      };
    } catch (error) {
      logger.error('Failed to get fee tier', { userAddress, error: error.message });
      return this.feeTiers[0];
    }
  }

  /**
   * Calculate discounted trading fee
   */
  async calculateTradingFee(userAddress, baseFee) {
    try {
      const baseFeeWei = ethers.parseEther(baseFee.toString());
      
      if (this.initialized && this.contract) {
        const discountedFeeWei = await this.contract.calculateDiscountedFee(userAddress, baseFeeWei);
        return parseFloat(ethers.formatEther(discountedFeeWei));
      }

      // Fallback calculation
      const tier = await this.getUserFeeTier(userAddress);
      const discount = (baseFee * tier.discountBps) / 10000;
      return baseFee - discount;
    } catch (error) {
      logger.error('Failed to calculate trading fee', { userAddress, error: error.message });
      return baseFee;
    }
  }

  /**
   * Collect revenue from any stream (15% goes to holders, 85% to reserve)
   * 
   * @param {number} streamId - Revenue stream ID (0-9)
   * @param {number} amount - Amount in ETH (already converted from USD if needed)
   * @param {boolean} sendValue - If true, send ETH with transaction (default: false)
   */
  async collectRevenue(streamId, amount, sendValue = false) {
    try {
      if (!this.initialized || !this.contract) {
        throw new Error('Contract not initialized');
      }

      const amountWei = ethers.parseEther(amount.toString());
      const txOptions = sendValue ? { value: amountWei } : { value: 0 };
      
      const tx = await this.contract.collectRevenue(streamId, amountWei, txOptions);
      
      await tx.wait();
      
      logger.info('Revenue collected', {
        stream: this.revenueStreams[streamId].name,
        amount,
        holderShare: amount * HOLDER_PCT,
        reserveShare: amount * RESERVE_PCT,
        ethSent: sendValue
      });
      
      return tx.hash;
    } catch (error) {
      logger.error('Failed to collect revenue', { error: error.message });
      throw error;
    }
  }

  /**
   * Mark early adopters for bonus multipliers
   */
  async markEarlyAdopter(userAddress, multiplier = 200) {
    try {
      if (!this.initialized || !this.contract) {
        throw new Error('Contract not initialized');
      }

      const tx = await this.contract.markEarlyAdopter(userAddress, multiplier);
      await tx.wait();
      
      logger.info('Early adopter marked', { userAddress, multiplier });
      return tx.hash;
    } catch (error) {
      logger.error('Failed to mark early adopter', { error: error.message });
      throw error;
    }
  }

  /**
   * Distribute TTX rewards to user
   */
  async distributeReward(recipientAddress, amount) {
    try {
      if (!this.initialized || !this.contract) {
        throw new Error('Contract not initialized');
      }

      const amountWei = ethers.parseEther(amount.toString());
      const tx = await this.contract.distributeReward(recipientAddress, amountWei);
      await tx.wait();
      
      logger.info('Reward distributed', {
        recipient: recipientAddress,
        amount
      });
      
      return tx.hash;
    } catch (error) {
      logger.error('Failed to distribute reward', { error: error.message });
      throw error;
    }
  }

  /**
   * Get available reserve for new instruments
   */
  async getAvailableReserve() {
    try {
      if (!this.initialized || !this.contract) {
        return 0;
      }

      const available = await this.contract.getAvailableReserve();
      return parseFloat(ethers.formatEther(available));
    } catch (error) {
      logger.error('Failed to get available reserve', { error: error.message });
      return 0;
    }
  }

  /**
   * Check if user qualifies for revenue sharing
   */
  async isRevenueShareEligible(userAddress) {
    const tier = await this.getUserFeeTier(userAddress);
    return tier.revenueShare === true;
  }

  /**
   * Get tier name for display
   */
  getTierName(tierId) {
    const names = ['Standard', 'Bronze', 'Silver', 'Gold', 'Platinum (Whale)'];
    return names[tierId] || 'Standard';
  }
}

module.exports = new TTXReserveService();
