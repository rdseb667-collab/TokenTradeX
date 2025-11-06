/**
 * Order Matching Engine - Matches buy and sell orders
 * Future ready for: High-frequency trading, Market makers, Algorithmic trading
 */

const { Order, Token, Wallet, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('./logger');
const activityFeedService = require('./activityFeedService');
const referralService = require('./referralService');
const revenueStreamService = require('./revenueStreamService');
const ttxUnifiedService = require('./ttxUnifiedService');

class OrderMatchingService {
  constructor() {
    this.orderBooks = new Map(); // Symbol -> { bids: [], asks: [] }
    this.isProcessing = new Map(); // Prevent race conditions
  }

  /**
   * Process a new order - match or add to order book
   */
  async processOrder(order) {
    const symbol = order.token_symbol;
    
    // Prevent concurrent processing for same symbol
    if (this.isProcessing.get(symbol)) {
      await this.waitForProcessing(symbol);
    }
    
    this.isProcessing.set(symbol, true);
    
    try {
      // Load order book for this symbol
      await this.loadOrderBook(symbol);
      
      // Try to match the order
      if (order.order_type === 'market') {
        await this.executeMarketOrder(order);
      } else if (order.order_type === 'limit') {
        await this.executeLimitOrder(order);
      } else if (order.order_type === 'stop_loss') {
        await this.handleStopLoss(order);
      } else if (order.order_type === 'take_profit') {
        await this.handleTakeProfit(order);
      }
      
      // Update order book
      await this.updateOrderBook(symbol);
      
    } finally {
      this.isProcessing.set(symbol, false);
    }
  }

  /**
   * Execute market order - fill at best available price
   */
  async executeMarketOrder(order) {
    const transaction = await sequelize.transaction();
    
    try {
      const isBuy = order.side === 'buy';
      const oppositeOrders = isBuy ? 
        await this.getAsks(order.token_symbol) : 
        await this.getBids(order.token_symbol);
      
      if (oppositeOrders.length === 0) {
        // No matching orders - reject market order
        order.status = 'cancelled';
        order.cancel_reason = 'No liquidity available';
        await order.save({ transaction });
        await transaction.commit();
        return;
      }
      
      let remainingQuantity = parseFloat(order.quantity);
      let totalCost = 0;
      let weightedPrice = 0;
      
      for (const oppositeOrder of oppositeOrders) {
        if (remainingQuantity <= 0) break;
        
        const availableQuantity = parseFloat(oppositeOrder.quantity) - parseFloat(oppositeOrder.filled_quantity);
        const fillQuantity = Math.min(remainingQuantity, availableQuantity);
        const fillPrice = parseFloat(oppositeOrder.price);
        
        // Execute trade
        await this.executeTrade(order, oppositeOrder, fillQuantity, fillPrice, transaction);
        
        remainingQuantity -= fillQuantity;
        totalCost += fillQuantity * fillPrice;
        weightedPrice += fillQuantity;
      }
      
      // Update order
      const averagePrice = totalCost / (parseFloat(order.quantity) - remainingQuantity);
      order.filled_quantity = parseFloat(order.quantity) - remainingQuantity;
      order.average_price = averagePrice;
      order.status = remainingQuantity === 0 ? 'filled' : 'partially_filled';
      await order.save({ transaction });
      
      await transaction.commit();
      
      // Emit real-time update (future: WebSocket)
      this.emitTradeUpdate(order);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Execute limit order - match if price condition met
   */
  async executeLimitOrder(order) {
    const transaction = await sequelize.transaction();
    
    try {
      const isBuy = order.side === 'buy';
      const oppositeOrders = isBuy ? 
        await this.getAsks(order.token_symbol, order.price, '<=') : 
        await this.getBids(order.token_symbol, order.price, '>=');
      
      let remainingQuantity = parseFloat(order.quantity);
      
      for (const oppositeOrder of oppositeOrders) {
        if (remainingQuantity <= 0) break;
        
        const availableQuantity = parseFloat(oppositeOrder.quantity) - parseFloat(oppositeOrder.filled_quantity);
        const fillQuantity = Math.min(remainingQuantity, availableQuantity);
        const fillPrice = parseFloat(oppositeOrder.price);
        
        // Execute trade
        await this.executeTrade(order, oppositeOrder, fillQuantity, fillPrice, transaction);
        
        remainingQuantity -= fillQuantity;
      }
      
      // Update order
      order.filled_quantity = parseFloat(order.quantity) - remainingQuantity;
      
      if (remainingQuantity === 0) {
        order.status = 'filled';
      } else if (order.filled_quantity > 0) {
        order.status = 'partially_filled';
      } else {
        order.status = 'open'; // Add to order book
      }
      
      await order.save({ transaction });
      await transaction.commit();
      
      this.emitTradeUpdate(order);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Execute actual trade between two orders
   */
  async executeTrade(buyOrder, sellOrder, quantity, price, transaction) {
    // Determine which is buy and which is sell
    const [buyer, seller] = buyOrder.side === 'buy' ? 
      [buyOrder, sellOrder] : [sellOrder, buyOrder];
    
    const totalValue = quantity * price;
    
    // Calculate fees with TTX discount tiers
    const buyerFee = await this.calculateTradingFee(buyer.user_id, totalValue, 'taker');
    const sellerFee = await this.calculateTradingFee(seller.user_id, totalValue, 'maker');
    
    const totalFees = buyerFee + sellerFee;
    
    // UNIFIED TTX INTEGRATION: Feed revenue to smart contract
    // This automatically compounds for all stakers!
    try {
      // Collect to revenueStreamService (backend tracking)
      await revenueStreamService.collectRevenue(
        0, // Stream 0 = Trading Fees
        totalFees,
        `Trade: ${quantity} ${buyer.token_symbol} @ ${price}`
      );
      
      // Also send to TTX Unified smart contract for on-chain auto-compounding
      await ttxUnifiedService.collectRevenue(0, totalFees);
      
      logger.info('Revenue collected to TTX Unified - Auto-compounding active', {
        totalFees,
        holderShare: totalFees * 0.15,   // 15% to holders
        platformShare: totalFees * 0.85  // 85% to platform
      });
    } catch (error) {
      logger.error('Failed to collect fees to TTX Unified', { error: error.message });
    }
    
    // Update buyer's wallet - deduct USD, add tokens
    const buyerUSDWallet = await Wallet.findOne({
      where: { user_id: buyer.user_id, token_symbol: 'USD' },
      transaction
    });
    
    const buyerTokenWallet = await Wallet.findOne({
      where: { user_id: buyer.user_id, token_symbol: buyer.token_symbol },
      transaction
    });
    
    buyerUSDWallet.balance = parseFloat(buyerUSDWallet.balance) - totalValue - buyerFee;
    buyerTokenWallet.balance = parseFloat(buyerTokenWallet.balance) + quantity;
    
    await buyerUSDWallet.save({ transaction });
    await buyerTokenWallet.save({ transaction });
    
    // Update seller's wallet - add USD, deduct tokens
    const sellerUSDWallet = await Wallet.findOne({
      where: { user_id: seller.user_id, token_symbol: 'USD' },
      transaction
    });
    
    const sellerTokenWallet = await Wallet.findOne({
      where: { user_id: seller.user_id, token_symbol: seller.token_symbol },
      transaction
    });
    
    sellerUSDWallet.balance = parseFloat(sellerUSDWallet.balance) + totalValue - sellerFee;
    sellerTokenWallet.balance = parseFloat(sellerTokenWallet.balance) - quantity;
    
    await sellerUSDWallet.save({ transaction });
    await sellerTokenWallet.save({ transaction });
    
    // Update orders
    buyOrder.filled_quantity = parseFloat(buyOrder.filled_quantity || 0) + quantity;
    sellOrder.filled_quantity = parseFloat(sellOrder.filled_quantity || 0) + quantity;
    
    if (buyOrder.filled_quantity >= parseFloat(buyOrder.quantity)) {
      buyOrder.status = 'filled';
    }
    
    if (sellOrder.filled_quantity >= parseFloat(sellOrder.quantity)) {
      sellOrder.status = 'filled';
    }
    
    await buyOrder.save({ transaction });
    await sellOrder.save({ transaction });
    
    // Create trade record with proper buyer/seller IDs
    await this.createTradeRecord({
      buyOrderId: buyer.id,
      sellOrderId: seller.id,
      buyerId: buyer.user_id,
      sellerId: seller.user_id,
      symbol: buyer.token_symbol,
      quantity,
      price,
      buyerFee,
      sellerFee,
      timestamp: new Date()
    }, transaction);
    
    // Distribute fees to TTX pools (future: implement fee distribution)
    await this.distributeFees(buyerFee + sellerFee, transaction);
    
    // 🎁 REWARD USERS FOR TRADING - Earn while you trade!
    try {
      const rewardService = require('./rewardService');
      const tradeValue = totalValue;
      
      // Give rewards to both buyer and seller
      await rewardService.giveTradingVolumeReward(buyer.user_id, tradeValue);
      await rewardService.giveTradingVolumeReward(seller.user_id, tradeValue);
      
      // Check for milestone rewards
      await rewardService.checkAndGiveMilestoneRewards(buyer.user_id);
      await rewardService.checkAndGiveMilestoneRewards(seller.user_id);
      
      logger.info('Trading rewards given', { buyerId: buyer.user_id, sellerId: seller.user_id, volume: tradeValue });
    } catch (error) {
      logger.error('Failed to give trading rewards', { error: error.message });
      // Don't fail the trade if rewards fail
    }
  }

  /**
   * Calculate trading fee (future: integrate TTX discount tiers)
   */
  async calculateTradingFee(userId, amount, type = 'taker') {
    const feeRate = type === 'maker' ? 0.0008 : 0.0012; // 0.08% maker, 0.12% taker
    
    // Get user's TTX balance for fee discount
    let ttxBalance = 0;
    try {
      const { Wallet, Token } = require('../models');
      const ttxToken = await Token.findOne({ where: { symbol: 'TTX' } });
      
      if (ttxToken) {
        const ttxWallet = await Wallet.findOne({ 
          where: { 
            userId: userId, 
            tokenId: ttxToken.id 
          } 
        });
        
        if (ttxWallet) {
          ttxBalance = parseFloat(ttxWallet.balance);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch TTX balance for fee calculation:', error.message);
    }
    
    // Calculate base fee
    const baseFee = amount * feeRate;
    
    // Apply TTX discount if user holds tokens
    const ttxFeeService = require('./ttxFeeService');
    const feeCalculation = ttxFeeService.calculateTradingFee(amount, 'crypto', ttxBalance);
    
    return feeCalculation.finalFee;
  }

  /**
   * Handle stop-loss order (future: advanced order types)
   */
  async handleStopLoss(order) {
    // Check if stop price triggered
    const currentPrice = await this.getCurrentPrice(order.token_symbol);
    
    if (order.side === 'sell' && currentPrice <= parseFloat(order.stop_price)) {
      // Convert to market order and execute
      order.order_type = 'market';
      await this.executeMarketOrder(order);
    } else if (order.side === 'buy' && currentPrice >= parseFloat(order.stop_price)) {
      order.order_type = 'market';
      await this.executeMarketOrder(order);
    } else {
      // Keep monitoring
      order.status = 'open';
      await order.save();
    }
  }

  /**
   * Handle take-profit order (future: advanced order types)
   */
  async handleTakeProfit(order) {
    const currentPrice = await this.getCurrentPrice(order.token_symbol);
    
    if (order.side === 'sell' && currentPrice >= parseFloat(order.take_profit_price)) {
      order.order_type = 'market';
      await this.executeMarketOrder(order);
    } else if (order.side === 'buy' && currentPrice <= parseFloat(order.take_profit_price)) {
      order.order_type = 'market';
      await this.executeMarketOrder(order);
    } else {
      order.status = 'open';
      await order.save();
    }
  }

  /**
   * Get current market price
   */
  async getCurrentPrice(symbol) {
    const lastTrade = await Order.findOne({
      where: { 
        token_symbol: symbol,
        status: 'filled'
      },
      order: [['updated_at', 'DESC']]
    });
    
    return lastTrade ? parseFloat(lastTrade.price) : null;
  }

  /**
   * Load order book from database
   */
  async loadOrderBook(symbol) {
    const orders = await Order.findAll({
      where: {
        token_symbol: symbol,
        status: { [Op.in]: ['open', 'partially_filled'] }
      },
      order: [
        ['side', 'ASC'], // Buy first, then sell
        ['price', 'DESC'] // Highest price first
      ]
    });
    
    const bids = orders.filter(o => o.side === 'buy')
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    
    const asks = orders.filter(o => o.side === 'sell')
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    
    this.orderBooks.set(symbol, { bids, asks });
  }

  /**
   * Get bid orders (buy orders)
   */
  async getBids(symbol, priceLimit = null, operator = '>=') {
    const book = this.orderBooks.get(symbol);
    if (!book) return [];
    
    let bids = book.bids;
    
    if (priceLimit) {
      bids = bids.filter(order => {
        const price = parseFloat(order.price);
        if (operator === '>=') return price >= priceLimit;
        if (operator === '<=') return price <= priceLimit;
        return true;
      });
    }
    
    return bids;
  }

  /**
   * Get ask orders (sell orders)
   */
  async getAsks(symbol, priceLimit = null, operator = '<=') {
    const book = this.orderBooks.get(symbol);
    if (!book) return [];
    
    let asks = book.asks;
    
    if (priceLimit) {
      asks = asks.filter(order => {
        const price = parseFloat(order.price);
        if (operator === '>=') return price >= priceLimit;
        if (operator === '<=') return price <= priceLimit;
        return true;
      });
    }
    
    return asks;
  }

  /**
   * Update order book after trade
   */
  async updateOrderBook(symbol) {
    await this.loadOrderBook(symbol);
  }

  /**
   * Create trade record (future: analytics, reporting)
   */
  async createTradeRecord(trade, transaction) {
    const { Trade } = require('../models');
    
    try {
      const tradeRecord = await Trade.create({
        buyOrderId: trade.buyOrderId,
        sellOrderId: trade.sellOrderId,
        buyerId: trade.buyerId,
        sellerId: trade.sellerId,
        tokenSymbol: trade.symbol,
        price: trade.price,
        quantity: trade.quantity,
        totalValue: trade.quantity * trade.price,
        buyerFee: trade.buyerFee || 0,
        sellerFee: trade.sellerFee || 0,
        executedAt: trade.timestamp || new Date()
      }, { transaction });
      
      // Log trade for monitoring
      logger.logTrade({
        tradeId: tradeRecord.id,
        symbol: trade.symbol,
        quantity: trade.quantity,
        price: trade.price,
        totalValue: tradeRecord.totalValue,
        buyerId: trade.buyerId,
        sellerId: trade.sellerId
      });
      
      // Add to activity feed
      activityFeedService.addTradeActivity(tradeRecord);
      
      // Check for first trade reward
      const buyer = await sequelize.models.User.findByPk(trade.buyerId);
      if (buyer && !buyer.firstTradeCompleted) {
        await buyer.update({ firstTradeCompleted: true });
        await referralService.rewardFirstTrade(trade.buyerId);
      }
      
      const seller = await sequelize.models.User.findByPk(trade.sellerId);
      if (seller && !seller.firstTradeCompleted) {
        await seller.update({ firstTradeCompleted: true });
        await referralService.rewardFirstTrade(trade.sellerId);
      }
      
      // Update user trading volumes
      if (buyer) {
        const newVolume = parseFloat(buyer.totalTradingVolume) + parseFloat(tradeRecord.totalValue);
        await buyer.update({ totalTradingVolume: newVolume });
        await referralService.checkTradingMilestones(trade.buyerId, newVolume);
      }
      
      if (seller) {
        const newVolume = parseFloat(seller.totalTradingVolume) + parseFloat(tradeRecord.totalValue);
        await seller.update({ totalTradingVolume: newVolume });
        await referralService.checkTradingMilestones(trade.sellerId, newVolume);
      }
      
      return tradeRecord;
    } catch (error) {
      console.error('Failed to create trade record:', error);
      throw error;
    }
  }

  /**
   * Distribute fees to TTX token pools (future: revenue distribution)
   */
  async distributeFees(totalFees, transaction) {
    // For now, log the fees - in production this would distribute to actual pools
    console.log('Fees collected for distribution:', totalFees);
    
    // TODO: Implement actual fee distribution to staking, liquidity, treasury, and dev pools
    // This would require integration with the TTX smart contracts
    
    return {
      staking: totalFees * 0.4,      // 40% to staking pool
      liquidity: totalFees * 0.3,    // 30% to liquidity pool
      treasury: totalFees * 0.2,     // 20% to treasury
      development: totalFees * 0.1    // 10% to development
    };
  }

  /**
   * Emit real-time trade update (future: WebSocket integration)
   */
  emitTradeUpdate(order) {
    // Get the io instance from the global app context
    const app = require('../server');
    const io = app.get('io');
    
    if (io) {
      // Emit order update to all connected clients
      io.emit('order:update', {
        orderId: order.id,
        status: order.status,
        filledQuantity: order.filled_quantity,
        timestamp: new Date()
      });
      
      console.log('Order update emitted:', order.id, order.status);
    } else {
      console.log('Order updated (no WebSocket connection):', order.id, order.status);
    }
  }

  /**
   * Wait for concurrent processing to finish
   */
  async waitForProcessing(symbol, timeout = 5000) {
    const startTime = Date.now();
    while (this.isProcessing.get(symbol) && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Get order book snapshot (for frontend display)
   */
  async getOrderBookSnapshot(symbol, depth = 20) {
    await this.loadOrderBook(symbol);
    const book = this.orderBooks.get(symbol);
    
    if (!book) return { bids: [], asks: [] };
    
    const formatOrder = (order) => ({
      price: parseFloat(order.price),
      quantity: parseFloat(order.quantity) - parseFloat(order.filled_quantity || 0),
      total: (parseFloat(order.quantity) - parseFloat(order.filled_quantity || 0)) * parseFloat(order.price)
    });
    
    return {
      bids: book.bids.slice(0, depth).map(formatOrder),
      asks: book.asks.slice(0, depth).map(formatOrder),
      spread: book.asks[0] && book.bids[0] ? 
        parseFloat(book.asks[0].price) - parseFloat(book.bids[0].price) : 0
    };
  }
}

module.exports = new OrderMatchingService();
