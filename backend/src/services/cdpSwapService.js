const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const logger = require('./logger');
const revenueStreamService = require('./revenueStreamService');
const { Token } = require('../models');

/**
 * Coinbase Developer Platform (CDP) Swap API Integration
 * 
 * Enables on-chain token swaps via Base network using CDP Swap API.
 * Records protocol fees as platform revenue (streamId=0 Trading Fees).
 */
class CDPSwapService {
  constructor() {
    this.keyName = process.env.COINBASE_CDP_KEY_NAME || '';
    this.keySecret = process.env.COINBASE_CDP_KEY_SECRET || '';
    this.network = process.env.COINBASE_CDP_NETWORK || 'base';
    this.apiHost = 'api.cdp.coinbase.com';
    this.protocolFeeIsRevenue = process.env.COINBASE_PROTOCOL_FEE_IS_REVENUE === 'true';
    
    // JWT is valid for 2 minutes
    this.jwtExpirySeconds = 120;
  }

  /**
   * Generate JWT token for CDP API authentication
   * Using ES256 (ECDSA) algorithm
   */
  buildJWT(requestMethod, requestPath) {
    try {
      if (!this.keyName || !this.keySecret) {
        throw new Error('CDP API credentials not configured');
      }

      const uri = `${requestMethod} ${this.apiHost}${requestPath}`;
      const now = Math.floor(Date.now() / 1000);
      
      const payload = {
        sub: this.keyName,
        iss: 'cdp',
        nbf: now,
        exp: now + this.jwtExpirySeconds,
        uri
      };

      const header = {
        kid: this.keyName,
        nonce: crypto.randomBytes(16).toString('hex')
      };

      // Sign with ECDSA ES256
      const token = jwt.sign(payload, this.keySecret, {
        algorithm: 'ES256',
        header
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate CDP JWT', { error: error.message });
      throw error;
    }
  }

  /**
   * Get swap price estimate from CDP API
   * Returns liquidity, fees, slippage, and pre-trade validation
   */
  async getPriceEstimate(params) {
    try {
      const {
        fromToken,
        toToken,
        fromAmount,
        taker,
        gasPrice,
        slippageBps = 100 // 1% default slippage
      } = params;

      const requestPath = `/evm/v2/swaps/price`;
      const requestMethod = 'GET';
      
      const jwtToken = this.buildJWT(requestMethod, requestPath);

      const queryParams = new URLSearchParams({
        network: this.network,
        fromToken,
        toToken,
        fromAmount,
        taker,
        slippageBps: slippageBps.toString()
      });

      if (gasPrice) {
        queryParams.append('gasPrice', gasPrice);
      }

      const url = `https://${this.apiHost}${requestPath}?${queryParams}`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      logger.info('✅ CDP price estimate received', {
        fromToken,
        toToken,
        fromAmount,
        liquidityAvailable: response.data.liquidityAvailable
      });

      return response.data;
    } catch (error) {
      logger.error('❌ CDP price estimate failed', {
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Create executable swap quote
   * Returns transaction data ready for signing and execution
   */
  async createSwapQuote(params) {
    try {
      const {
        fromToken,
        toToken,
        fromAmount,
        taker,
        gasPrice,
        slippageBps = 100
      } = params;

      const requestPath = `/evm/v2/swaps/quote`;
      const requestMethod = 'POST';
      
      const jwtToken = this.buildJWT(requestMethod, requestPath);

      const url = `https://${this.apiHost}${requestPath}`;

      const response = await axios.post(url, {
        network: this.network,
        fromToken,
        toToken,
        fromAmount,
        taker,
        slippageBps,
        ...(gasPrice && { gasPrice })
      }, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      logger.info('✅ CDP swap quote created', {
        fromToken,
        toToken,
        fromAmount
      });

      return response.data;
    } catch (error) {
      logger.error('❌ CDP swap quote failed', {
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Process swap quote and record protocol fee as revenue
   * Validates pre-trade checks and persists to Phase 2 ledger
   */
  async processSwapQuote(quote, userId = null) {
    try {
      // Pre-trade validations
      const issues = quote.issues || {};
      
      // Check balance
      if (issues.balance) {
        const currentBalance = BigInt(issues.balance.currentBalance || '0');
        const requiredBalance = BigInt(issues.balance.requiredBalance || '0');
        
        if (currentBalance < requiredBalance) {
          return {
            success: false,
            error: 'INSUFFICIENT_BALANCE',
            details: {
              token: issues.balance.token,
              current: this.weiToFloat(currentBalance.toString()),
              required: this.weiToFloat(requiredBalance.toString())
            }
          };
        }
      }

      // Check allowance
      if (issues.allowance) {
        const currentAllowance = BigInt(issues.allowance.currentAllowance || '0');
        const fromAmount = BigInt(quote.fromAmount || '0');
        
        if (currentAllowance < fromAmount) {
          return {
            success: false,
            error: 'INSUFFICIENT_ALLOWANCE',
            details: {
              spender: issues.allowance.spender,
              currentAllowance: this.weiToFloat(currentAllowance.toString()),
              required: this.weiToFloat(fromAmount.toString())
            }
          };
        }
      }

      // Check simulation
      if (issues.simulationIncomplete) {
        return {
          success: false,
          error: 'SIMULATION_INCOMPLETE',
          message: 'Route or state changed during simulation. Please retry.'
        };
      }

      // Check liquidity
      if (!quote.liquidityAvailable) {
        return {
          success: false,
          error: 'NO_LIQUIDITY',
          message: 'Insufficient liquidity for this swap size.'
        };
      }

      // Calculate slippage
      const toAmount = BigInt(quote.toAmount || '0');
      const minToAmount = BigInt(quote.minToAmount || '0');
      const slippagePct = toAmount > 0n ? 
        Number((toAmount - minToAmount) * 100n / toAmount) : 0;

      // Extract fees
      const protocolFeeWei = BigInt(quote.fees?.protocolFee?.amount || '0');
      const gasFeeWei = BigInt(quote.fees?.gasFee?.amount || '0');

      // Convert protocol fee to USD (if recording as revenue)
      let protocolFeeUSD = 0;
      let revenueResult = null;

      if (this.protocolFeeIsRevenue && protocolFeeWei > 0n) {
        // Get ETH price for fee conversion
        const ethToken = await Token.findOne({ where: { symbol: 'ETH' } });
        const ethPrice = ethToken ? parseFloat(ethToken.currentPrice) : 0;
        
        const protocolFeeETH = this.weiToFloat(protocolFeeWei.toString());
        protocolFeeUSD = protocolFeeETH * ethPrice;

        // Persist to revenue ledger
        const sourceId = `external_swap:${quote.blockNumber}:${quote.fromToken}:${quote.toToken}:${quote.fromAmount}`;
        
        const fromTokenRecord = await Token.findOne({ where: { contractAddress: quote.fromToken } });
        const toTokenRecord = await Token.findOne({ where: { contractAddress: quote.toToken } });
        
        const description = `CDP Swap fee: ${fromTokenRecord?.symbol || 'Unknown'}→${toTokenRecord?.symbol || 'Unknown'}, slippage=${slippagePct.toFixed(2)}%`;

        const revenueCollector = require('../helpers/revenueCollector');
        revenueResult = await revenueCollector.collectRevenue(
          0, // streamId=0 (Trading Fees)
          protocolFeeUSD,
          description,
          sourceId
        );

        logger.info('💰 CDP protocol fee recorded as revenue', {
          protocolFeeUSD,
          sourceId
        });
      }

      return {
        success: true,
        quote: {
          blockNumber: quote.blockNumber,
          fromToken: quote.fromToken,
          toToken: quote.toToken,
          fromAmount: quote.fromAmount,
          toAmount: quote.toAmount,
          minToAmount: quote.minToAmount,
          slippagePct,
          gas: quote.gas,
          gasPrice: quote.gasPrice
        },
        fees: {
          gasFeeWei: gasFeeWei.toString(),
          protocolFeeWei: protocolFeeWei.toString(),
          protocolFeeUSD
        },
        revenueRecorded: revenueResult
      };
    } catch (error) {
      logger.error('❌ Failed to process swap quote', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Helper: Convert wei to float (assumes 18 decimals)
   */
  weiToFloat(weiString, decimals = 18) {
    return Number(BigInt(weiString)) / (10 ** decimals);
  }

  /**
   * Helper: Check if address is native token (ETH)
   */
  isNativeToken(address) {
    return address?.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  }
}

module.exports = new CDPSwapService();
