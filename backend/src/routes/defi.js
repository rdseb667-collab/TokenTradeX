const express = require('express');
const router = express.Router();
const cdpSwapService = require('../services/cdpSwapService');
const { protect } = require('../middleware/auth');

/**
 * CDP Swap API Routes - Base Network Integration
 * Provides on-chain token swap price estimates and quotes
 */

/**
 * @route POST /api/defi/swap/price
 * @desc Get swap price estimate with liquidity and fee breakdown
 * @access Private
 */
router.post('/swap/price', protect, async (req, res, next) => {
  try {
    const {
      fromToken,
      toToken,
      fromAmount,
      taker,
      gasPrice,
      slippageBps
    } = req.body;

    // Validate required fields
    if (!fromToken || !toToken || !fromAmount || !taker) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromToken, toToken, fromAmount, taker'
      });
    }

    // Validate addresses (0x-prefixed)
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    const isNative = (addr) => addr.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    
    if (!addressRegex.test(fromToken) && !isNative(fromToken)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid fromToken address'
      });
    }

    if (!addressRegex.test(toToken) && !isNative(toToken)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid toToken address'
      });
    }

    if (!addressRegex.test(taker)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid taker address'
      });
    }

    // Get price estimate from CDP
    const quote = await cdpSwapService.getPriceEstimate({
      fromToken,
      toToken,
      fromAmount,
      taker,
      gasPrice,
      slippageBps
    });

    // Process and validate quote
    const result = await cdpSwapService.processSwapQuote(quote, req.user.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.quote,
      fees: result.fees,
      revenueRecorded: result.revenueRecorded ? true : false,
      network: cdpSwapService.network
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/defi/swap/quote
 * @desc Create executable swap quote with transaction data
 * @access Private
 */
router.post('/swap/quote', protect, async (req, res, next) => {
  try {
    const {
      fromToken,
      toToken,
      fromAmount,
      taker,
      gasPrice,
      slippageBps
    } = req.body;

    // Validate required fields
    if (!fromToken || !toToken || !fromAmount || !taker) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromToken, toToken, fromAmount, taker'
      });
    }

    // Validate addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    const isNative = (addr) => addr.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    
    if (!addressRegex.test(fromToken) && !isNative(fromToken)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid fromToken address'
      });
    }

    if (!addressRegex.test(toToken) && !isNative(toToken)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid toToken address'
      });
    }

    if (!addressRegex.test(taker)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid taker address'
      });
    }

    // Create swap quote from CDP
    const quoteResponse = await cdpSwapService.createSwapQuote({
      fromToken,
      toToken,
      fromAmount,
      taker,
      gasPrice,
      slippageBps
    });

    // Process and record revenue
    const result = await cdpSwapService.processSwapQuote(quoteResponse, req.user.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: {
        ...result.quote,
        transactionData: quoteResponse.transaction, // Full tx payload for execution
        permit2: quoteResponse.permit2 // EIP-712 permit data
      },
      fees: result.fees,
      revenueRecorded: result.revenueRecorded ? true : false,
      network: cdpSwapService.network,
      message: 'Quote ready for signing and execution'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/defi/swap/config
 * @desc Get CDP swap configuration and supported networks
 * @access Private
 */
router.get('/swap/config', protect, async (req, res, next) => {
  try {
    const configured = !!(process.env.COINBASE_CDP_KEY_NAME && process.env.COINBASE_CDP_KEY_SECRET);

    res.json({
      success: true,
      configured,
      network: process.env.COINBASE_CDP_NETWORK || 'base',
      protocolFeeAsRevenue: process.env.COINBASE_PROTOCOL_FEE_IS_REVENUE === 'true',
      supportedNetworks: ['base', 'ethereum', 'arbitrum', 'optimism'],
      nativeTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      message: configured ? 'CDP Swap API ready' : 'CDP API keys not configured'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
