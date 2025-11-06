const { ethers } = require('ethers');
const logger = require('./logger');

/**
 * DEX Integration Service
 * Makes TTX tradable on Uniswap/PancakeSwap/etc
 * No regulation needed - fully decentralized
 */
class DEXIntegrationService {
  constructor() {
    this.provider = null;
    this.initialized = false;
    
    // Uniswap V2 Router addresses
    this.routers = {
      ethereum: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
      bsc: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap
      polygon: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
    };
    
    // Network configs
    this.networks = {
      ethereum: {
        chainId: 1,
        rpcUrl: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
        name: 'Ethereum Mainnet'
      },
      bsc: {
        chainId: 56,
        rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
        name: 'BSC Mainnet'
      },
      polygon: {
        chainId: 137,
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
        name: 'Polygon Mainnet'
      }
    };
  }

  /**
   * Initialize DEX connection
   */
  async initialize(network = 'bsc') {
    try {
      const config = this.networks[network];
      if (!config) throw new Error('Unsupported network');

      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.currentNetwork = network;
      this.initialized = true;

      logger.info('DEX Integration initialized', {
        network: config.name,
        router: this.routers[network]
      });
    } catch (error) {
      logger.error('Failed to initialize DEX integration', { error: error.message });
    }
  }

  /**
   * Create liquidity pool on DEX
   * This makes TTX tradable!
   */
  async createLiquidityPool(ttxTokenAddress, pairTokenAddress, ttxAmount, pairAmount) {
    try {
      if (!this.initialized) {
        throw new Error('DEX service not initialized');
      }

      const routerAddress = this.routers[this.currentNetwork];
      const wallet = new ethers.Wallet(
        process.env.DEPLOYER_PRIVATE_KEY,
        this.provider
      );

      // Uniswap V2 Router ABI (simplified)
      const routerABI = [
        'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)'
      ];

      const router = new ethers.Contract(routerAddress, routerABI, wallet);

      // Add liquidity (creates pool if doesn't exist)
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      const tx = await router.addLiquidity(
        ttxTokenAddress,
        pairTokenAddress,
        ethers.parseEther(ttxAmount.toString()),
        ethers.parseEther(pairAmount.toString()),
        0, // Accept any amount of TTX
        0, // Accept any amount of pair token
        wallet.address,
        deadline
      );

      await tx.wait();

      logger.info('Liquidity pool created', {
        ttxAmount,
        pairAmount,
        txHash: tx.hash
      });

      return {
        success: true,
        txHash: tx.hash,
        poolAddress: await this.getPairAddress(ttxTokenAddress, pairTokenAddress)
      };
    } catch (error) {
      logger.error('Failed to create liquidity pool', { error: error.message });
      throw error;
    }
  }

  /**
   * Get TTX price from DEX
   */
  async getTTXPrice(ttxTokenAddress, pairTokenAddress) {
    try {
      const pairAddress = await this.getPairAddress(ttxTokenAddress, pairTokenAddress);
      
      // Uniswap V2 Pair ABI
      const pairABI = [
        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
      ];

      const pair = new ethers.Contract(pairAddress, pairABI, this.provider);
      const reserves = await pair.getReserves();

      // Calculate price (simplified - assumes token0 is TTX)
      const price = parseFloat(ethers.formatEther(reserves[1])) / 
                   parseFloat(ethers.formatEther(reserves[0]));

      return price;
    } catch (error) {
      logger.error('Failed to get TTX price from DEX', { error: error.message });
      return 0;
    }
  }

  /**
   * Get pair address (where TTX/USDT pool lives)
   */
  async getPairAddress(tokenA, tokenB) {
    try {
      const factoryABI = [
        'function getPair(address tokenA, address tokenB) external view returns (address pair)'
      ];

      // Uniswap Factory addresses
      const factories = {
        ethereum: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        bsc: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
        polygon: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32'
      };

      const factoryAddress = factories[this.currentNetwork];
      const factory = new ethers.Contract(factoryAddress, factoryABI, this.provider);
      
      return await factory.getPair(tokenA, tokenB);
    } catch (error) {
      logger.error('Failed to get pair address', { error: error.message });
      throw error;
    }
  }

  /**
   * Get step-by-step deployment guide
   */
  getDeploymentGuide() {
    return {
      steps: [
        {
          step: 1,
          title: 'Deploy TTX Contract',
          description: 'Deploy TTXReserveToken.sol to BSC (cheapest gas)',
          estimatedCost: '$5-20 in BNB',
          command: 'npx hardhat run scripts/deploy-ttx-token.js --network bsc'
        },
        {
          step: 2,
          title: 'Get Initial Liquidity',
          description: 'Need TTX + USDT/BUSD for the pool',
          example: '100,000 TTX + $10,000 USDT = $0.10 initial price',
          notes: 'This sets the starting price'
        },
        {
          step: 3,
          title: 'Create Pool on PancakeSwap',
          description: 'Add liquidity through PancakeSwap UI or contract',
          url: 'https://pancakeswap.finance/add',
          alternative: 'Use this service to do it programmatically'
        },
        {
          step: 4,
          title: 'TTX is Now Tradable!',
          description: 'Anyone can buy/sell on PancakeSwap',
          tradingUrl: 'https://pancakeswap.finance/swap',
          notes: 'Share the contract address with users'
        },
        {
          step: 5,
          title: 'List on DexTools/DexScreener',
          description: 'Free listing on DEX aggregators',
          sites: ['dextools.io', 'dexscreener.com'],
          notes: 'Automatic once pool exists'
        }
      ],
      quickStart: {
        network: 'BSC (Binance Smart Chain)',
        reason: 'Cheapest gas fees (~$0.50 per transaction vs $50+ on Ethereum)',
        requirements: [
          'BNB for gas fees ($20-50)',
          'TTX tokens to add to pool',
          'BUSD/USDT for pairing ($5,000-10,000 minimum recommended)'
        ]
      },
      estimatedTimeline: '1-2 days if you have the funds ready'
    };
  }

  /**
   * Calculate recommended liquidity
   */
  calculateRecommendedLiquidity(targetPrice, totalSupply) {
    // Rule of thumb: 2-5% of total supply in initial liquidity
    const recommendedTTX = totalSupply * 0.03; // 3%
    const recommendedUSD = recommendedTTX * targetPrice;

    return {
      ttxAmount: recommendedTTX,
      usdAmount: recommendedUSD,
      startingPrice: targetPrice,
      reasoning: [
        '2-5% of supply prevents massive price swings',
        'Deeper liquidity = better for traders',
        'Can add more liquidity over time'
      ],
      priceImpact: {
        buy1000: this.estimatePriceImpact(recommendedTTX, recommendedUSD, 1000),
        buy10000: this.estimatePriceImpact(recommendedTTX, recommendedUSD, 10000),
        buy100000: this.estimatePriceImpact(recommendedTTX, recommendedUSD, 100000)
      }
    };
  }

  /**
   * Estimate price impact of a trade
   */
  estimatePriceImpact(liquidityTTX, liquidityUSD, tradeSize) {
    // x * y = k (constant product formula)
    const k = liquidityTTX * liquidityUSD;
    const newUSD = liquidityUSD - tradeSize;
    const newTTX = k / newUSD;
    const ttxOut = liquidityTTX - newTTX;
    const effectivePrice = tradeSize / ttxOut;
    const startPrice = liquidityUSD / liquidityTTX;
    const impact = ((effectivePrice - startPrice) / startPrice) * 100;

    return {
      tradeSize: `$${tradeSize}`,
      priceImpact: `${impact.toFixed(2)}%`,
      ttxReceived: ttxOut.toFixed(2),
      recommendation: impact > 5 ? 'High impact - need more liquidity' : 'Acceptable'
    };
  }
}

module.exports = new DEXIntegrationService();
