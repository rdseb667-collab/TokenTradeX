const logger = require('./logger');

/**
 * Market Integrity Service
 * 
 * Prevents self-trading and wash trades by blocking orders that would match
 * against the same user's resting orders. Logs all blocked attempts for auditing.
 * 
 * Features:
 * - Self-trade prevention for both market and limit orders
 * - Bounded event history for quick auditing (max 1000 events)
 * - Detailed logging of blocked attempts with reason codes
 * - Integration with order matching service
 */
class MarketIntegrityService {
  constructor() {
    this.blockedEvents = []; // Bounded array of blocked trade attempts
    this.MAX_EVENT_HISTORY = 1000;
  }

  /**
   * Check if a potential trade would be a self-trade
   * @param {Object} takerOrder - The incoming order (taker)
   * @param {Object} makerOrder - The existing order (maker)
   * @returns {boolean} True if self-trade would occur
   */
  isSelfTrade(takerOrder, makerOrder) {
    return takerOrder.userId === makerOrder.userId;
  }

  /**
   * Filter out self-trade orders from a list of potential matches
   * @param {Object} takerOrder - The incoming order (taker)
   * @param {Array} potentialMatches - Array of existing orders that could match
   * @returns {Array} Filtered array without self-trade orders
   */
  filterSelfTrades(takerOrder, potentialMatches) {
    const validMatches = [];
    const blockedMatches = [];

    for (const match of potentialMatches) {
      if (this.isSelfTrade(takerOrder, match)) {
        blockedMatches.push(match);
      } else {
        validMatches.push(match);
      }
    }

    // Log blocked attempts
    if (blockedMatches.length > 0) {
      this.logBlockedTrades(takerOrder, blockedMatches);
    }

    return validMatches;
  }

  /**
   * Check if only self-liquidity exists for a market order
   * @param {Object} marketOrder - The market order
   * @param {Array} allLiquidity - All available liquidity
   * @returns {boolean} True if only self-liquidity exists
   */
  hasOnlySelfLiquidity(marketOrder, allLiquidity) {
    if (allLiquidity.length === 0) return false;
    
    return allLiquidity.every(liquidityOrder => 
      this.isSelfTrade(marketOrder, liquidityOrder)
    );
  }

  /**
   * Log blocked trade attempts for auditing
   * @param {Object} takerOrder - The incoming order that was blocked
   * @param {Array} blockedMatches - Array of orders that were blocked
   */
  logBlockedTrades(takerOrder, blockedMatches) {
    const timestamp = new Date().toISOString();
    const eventType = 'SELF_TRADE_BLOCKED';
    
    for (const makerOrder of blockedMatches) {
      const event = {
        timestamp,
        eventType,
        takerOrderId: takerOrder.id,
        takerUserId: takerOrder.userId,
        makerOrderId: makerOrder.id,
        makerUserId: makerOrder.userId,
        tokenId: takerOrder.tokenId,
        orderType: takerOrder.orderType,
        side: takerOrder.side,
        price: makerOrder.price,
        quantity: Math.min(
          parseFloat(takerOrder.quantity) - parseFloat(takerOrder.filledQuantity || 0),
          parseFloat(makerOrder.quantity) - parseFloat(makerOrder.filledQuantity || 0)
        )
      };

      // Add to bounded event history
      this.blockedEvents.push(event);
      
      // Maintain bounded history
      if (this.blockedEvents.length > this.MAX_EVENT_HISTORY) {
        this.blockedEvents.shift();
      }

      // Log the blocked attempt
      logger.warn('Self-trade blocked', {
        ...event,
        message: `Blocked self-trade attempt: User ${takerOrder.userId} tried to trade with their own order`
      });
    }
  }

  /**
   * Get recent blocked trade events for auditing
   * @param {number} limit - Number of events to return (default 50)
   * @returns {Array} Recent blocked trade events
   */
  getBlockedTradeEvents(limit = 50) {
    const start = Math.max(0, this.blockedEvents.length - limit);
    return this.blockedEvents.slice(start);
  }

  /**
   * Get statistics about blocked trades
   * @returns {Object} Statistics about blocked trades
   */
  getBlockedTradeStats() {
    const totalBlocked = this.blockedEvents.length;
    const byUser = {};
    const byToken = {};
    
    for (const event of this.blockedEvents) {
      // Count by user
      byUser[event.takerUserId] = (byUser[event.takerUserId] || 0) + 1;
      
      // Count by token
      byToken[event.tokenId] = (byToken[event.tokenId] || 0) + 1;
    }
    
    // Get top users by blocked attempts
    const topUsers = Object.entries(byUser)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));
    
    return {
      totalBlocked,
      byUser: topUsers,
      byToken,
      lastBlocked: this.blockedEvents[this.blockedEvents.length - 1] || null
    };
  }

  /**
   * Clear blocked trade history
   */
  clearBlockedTradeHistory() {
    this.blockedEvents = [];
    logger.info('Blocked trade history cleared');
  }
}

module.exports = new MarketIntegrityService();