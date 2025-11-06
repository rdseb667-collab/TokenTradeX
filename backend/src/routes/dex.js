const express = require('express');
const router = express.Router();
const dexService = require('../services/dexIntegrationService');

/**
 * DEX Integration Routes
 * Get TTX listed and tradable on decentralized exchanges
 */

/**
 * @route GET /api/dex/deployment-guide
 * @desc Get step-by-step guide to list TTX on DEX
 */
router.get('/deployment-guide', async (req, res, next) => {
  try {
    const guide = dexService.getDeploymentGuide();
    
    res.json({
      success: true,
      guide,
      nextSteps: [
        'Deploy TTX contract to BSC',
        'Prepare initial liquidity (TTX + BUSD)',
        'Create pool on PancakeSwap',
        'TTX becomes tradable instantly'
      ]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/dex/liquidity-calculator
 * @desc Calculate recommended liquidity amounts
 */
router.get('/liquidity-calculator', async (req, res, next) => {
  try {
    const { 
      targetPrice = 0.10, 
      totalSupply = 500000000 
    } = req.query;

    const recommendation = dexService.calculateRecommendedLiquidity(
      parseFloat(targetPrice),
      parseFloat(totalSupply)
    );

    res.json({
      success: true,
      recommendation,
      explanation: {
        targetPrice: `$${targetPrice} per TTX`,
        circulatingSupply: `${totalSupply.toLocaleString()} TTX`,
        recommendedLiquidity: `${recommendation.ttxAmount.toLocaleString()} TTX + $${recommendation.usdAmount.toLocaleString()}`
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/dex/exchanges
 * @desc List recommended DEX exchanges
 */
router.get('/exchanges', async (req, res, next) => {
  try {
    const exchanges = [
      {
        name: 'PancakeSwap',
        network: 'BSC',
        advantages: [
          'Lowest gas fees ($0.50 per tx)',
          'High liquidity',
          'Easy to use',
          'No listing fees'
        ],
        listingUrl: 'https://pancakeswap.finance/add',
        tradingUrl: 'https://pancakeswap.finance/swap',
        recommended: true,
        estimatedCost: '$20-50 for gas + liquidity'
      },
      {
        name: 'Uniswap V2',
        network: 'Ethereum',
        advantages: [
          'Most popular DEX',
          'Highest credibility',
          'Large user base'
        ],
        listingUrl: 'https://app.uniswap.org/#/add/v2',
        tradingUrl: 'https://app.uniswap.org/',
        recommended: false,
        estimatedCost: '$500-1000 for gas + liquidity',
        note: 'Expensive gas fees - use BSC instead'
      },
      {
        name: 'QuickSwap',
        network: 'Polygon',
        advantages: [
          'Very low fees ($0.01)',
          'Fast transactions',
          'Growing ecosystem'
        ],
        listingUrl: 'https://quickswap.exchange/#/add',
        tradingUrl: 'https://quickswap.exchange/',
        recommended: true,
        estimatedCost: '$10-20 for gas + liquidity'
      }
    ];

    res.json({
      success: true,
      exchanges,
      recommendation: 'Start with PancakeSwap (BSC) for lowest cost and fastest deployment'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/dex/cex-path
 * @desc Path to centralized exchange listing
 */
router.get('/cex-path', async (req, res, next) => {
  try {
    const path = {
      phase1: {
        title: 'Small CEX Listings (No strict requirements)',
        exchanges: [
          {
            name: 'MEXC',
            requirements: ['Provide contract address', 'Small community'],
            listingFee: '$0-5,000',
            timeline: '1-2 weeks',
            application: 'https://www.mexc.com/support/sections/360000663231'
          },
          {
            name: 'Gate.io Startup',
            requirements: ['Community vote', 'Basic documentation'],
            listingFee: 'Free (if voted in)',
            timeline: '2-4 weeks',
            application: 'https://www.gate.io/startup'
          },
          {
            name: 'BitMart',
            requirements: ['Contract audit', 'Marketing plan'],
            listingFee: '$5,000-15,000',
            timeline: '2-3 weeks',
            application: 'https://support.bmtc.io/hc/en-us/articles/360016453314'
          }
        ]
      },
      phase2: {
        title: 'Medium CEX Listings',
        exchanges: [
          {
            name: 'KuCoin',
            requirements: ['Proven volume', 'Active community', 'Audit'],
            listingFee: '$30,000-100,000',
            timeline: '1-2 months',
            volume: 'Need $500K+ daily volume on smaller exchanges first'
          },
          {
            name: 'Crypto.com',
            requirements: ['Legal compliance', 'Strong team', 'Roadmap'],
            listingFee: '$50,000-200,000',
            timeline: '2-3 months'
          }
        ]
      },
      phase3: {
        title: 'Major CEX Listings',
        exchanges: [
          {
            name: 'Binance',
            requirements: [
              'Massive community',
              'High volume on other exchanges',
              'Full legal compliance',
              'Strong use case'
            ],
            listingFee: '$250,000-1,000,000+',
            timeline: '3-6 months',
            note: 'Very selective - need strong fundamentals'
          },
          {
            name: 'Coinbase',
            requirements: [
              'US regulatory compliance',
              'Security audit',
              'Legal opinion',
              'Proven track record'
            ],
            listingFee: 'Variable',
            timeline: '6-12 months',
            note: 'Most strict requirements'
          }
        ]
      },
      recommendedPath: [
        '1. List on PancakeSwap (DEX) - Immediate',
        '2. Build volume for 1-2 months',
        '3. Apply to MEXC/Gate.io - Get first CEX listing',
        '4. Grow to $500K+ daily volume',
        '5. Apply to KuCoin - Major exposure',
        '6. Eventually Binance if fundamentals strong'
      ]
    };

    res.json({
      success: true,
      path,
      costSummary: {
        dex: '$20-50 (immediate)',
        smallCEX: '$0-15,000 (1-2 months)',
        mediumCEX: '$30,000-200,000 (3-6 months)',
        majorCEX: '$250,000+ (6-12 months)'
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
