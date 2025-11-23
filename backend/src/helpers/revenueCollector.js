const revenueStreamService = require('../services/revenueStreamService');
const ttxUnifiedService = require('../services/ttxUnifiedService');
const ethConversionService = require('../services/ethConversionService');
const logger = require('../services/logger');

/**
 * Unified Revenue Collector
 * Ensures ALL revenue streams connect to both backend database AND smart contract
 * 
 * Revenue Split: 15% to holders (on-chain), 85% to reserve
 */
class RevenueCollector {
  /**
   * Collect revenue from any stream
   * @param {number} streamId - Revenue stream ID (0-9)
   * @param {number} amountUSD - Amount in USD
   * @param {string} description - Description of revenue event
   * @param {string} sourceId - Optional source ID for idempotency
   * @returns {Promise<Object>} Result of collection
   */
  async collectRevenue(streamId, amountUSD, description = '', sourceId = null) {
    try {
      // Validate inputs
      if (streamId < 0 || streamId > 9) {
        throw new Error(`Invalid stream ID: ${streamId}`);
      }
      
      if (!amountUSD || amountUSD <= 0) {
        logger.warn('Revenue collection skipped - zero or negative amount', { streamId, amountUSD });
        return { success: true, skipped: true, reason: 'Zero amount' };
      }

      // Always collect to backend database (persistent tracking)
      const backendResult = await revenueStreamService.collectRevenue(
        streamId, 
        amountUSD, 
        description, 
        sourceId
      );

      // If production mode and smart contract configured, send to blockchain
      if (process.env.CONTRACT_MODE === 'production' && process.env.TTX_UNIFIED_ADDRESS) {
        try {
          // Convert USD to ETH for on-chain collection
          const amountETH = await ethConversionService.convertUsdToEth(amountUSD);
          
          if (amountETH && amountETH > 0) {
            // Send revenue to smart contract (15% will auto-distribute to holders)
            await ttxUnifiedService.collectRevenue(streamId, amountETH, true);
            
            logger.info('✅ Revenue collected to smart contract', {
              streamId,
              amountUSD: amountUSD.toFixed(2),
              amountETH: amountETH.toFixed(6),
              description
            });
          }
        } catch (contractError) {
          // Log error but don't fail - backend collection already succeeded
          logger.error('Smart contract revenue collection failed (backend succeeded)', {
            streamId,
            amountUSD,
            error: contractError.message,
            description
          });
        }
      } else {
        // Development/staging mode - just log
        logger.info('⚠️ Smart contract collection skipped (not in production)', {
          streamId,
          amountUSD: amountUSD.toFixed(2),
          mode: process.env.CONTRACT_MODE || 'development',
          configured: !!process.env.TTX_UNIFIED_ADDRESS
        });
      }

      return {
        success: true,
        ...backendResult
      };

    } catch (error) {
      logger.error('Revenue collection failed', {
        streamId,
        amountUSD,
        description,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Collect revenue with automatic retry
   * Used for critical revenue events that must not be lost
   */
  async collectRevenueWithRetry(streamId, amountUSD, description = '', sourceId = null, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.collectRevenue(streamId, amountUSD, description, sourceId);
      } catch (error) {
        lastError = error;
        logger.warn(`Revenue collection attempt ${attempt}/${maxRetries} failed`, {
          streamId,
          amountUSD,
          error: error.message
        });
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }
    
    throw lastError;
  }
}

module.exports = new RevenueCollector();
