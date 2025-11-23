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
const revenueCollector = require('../helpers/revenueCollector');
const feePoolService = require('./feePoolService');
const postTradeQueueService = require('./postTradeQueueService');
const ethConversionService = require('./ethConversionService');
const marketIntegrityService = require('./marketIntegrityService');
const { validateRuntimeConfig } = require('../config/runtimeConfig');

// Get runtime config (validated at server startup)
const { config: runtimeConfig } = validateRuntimeConfig();

class OrderMatchingService {
  constructor() {
    this.orderBooks = new Map(); // Symbol -> { bids: [], asks: [] }
    this.isProcessing = new Map(); // Prevent race conditions
  }

  /**
   * Check if order is in a closed state (filled, cancelled, or error)
   */
  isOrderClosed(order) {
    const closedStatuses = ['filled', 'cancelled', 'error'];
    return closedStatuses.includes(order.status);
  }

  /**
   * Process a new order - match or add to order book
   */
  async processOrder(order) {
    // Load token to get symbol
    const token = await Token.findByPk(order.tokenId);
    if (!token) {
      console.error('❌ Token not found for order:', order.id);
      return;
    }
    
    const symbol = token.symbol;
    
    console.log('🎯 PROCESSING ORDER:', {
      id: order.id,
      orderType: order.orderType,
      side: order.side,
      quantity: order.quantity,
      tokenId: order.tokenId,
      symbol
    });
    
    // Prevent concurrent processing for same symbol
    if (this.isProcessing.get(symbol)) {
      await this.waitForProcessing(symbol);
    }
    
    this.isProcessing.set(symbol, true);
    
    try {
      // Load order book for this symbol
      await this.loadOrderBook(symbol);
      
      // Try to match the order
      if (order.orderType === 'market') {
        console.log('📈 Executing market order for', symbol);
        await this.executeMarketOrder(order, symbol, token);
      } else if (order.orderType === 'limit') {
        await this.executeLimitOrder(order, symbol, token);
      } else if (order.orderType === 'stop_loss') {
        await this.handleStopLoss(order, symbol, token);
      } else if (order.orderType === 'take_profit') {
        await this.handleTakeProfit(order, symbol, token);
      }
      
      // Update order book
      await this.updateOrderBook(symbol);
      
    } catch (error) {
      console.error('❌ PROCESS ORDER ERROR:', {
        symbol,
        orderId: order.id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      this.isProcessing.set(symbol, false);
    }
  }

  /**
   * Execute market order - fill at best available price
   * NEW: Auto-fill with internal liquidity if no opposing orders
   */
  async executeMarketOrder(order, symbol, token) {
    const transaction = await sequelize.transaction();
    
    try {
      const isBuy = order.side === 'buy';
      
      // Fetch opposing orders INSIDE transaction with row-level locks
      let oppositeOrders = await Order.findAll({
        where: {
          tokenId: order.tokenId,
          side: isBuy ? 'sell' : 'buy',
          status: { [Op.in]: ['pending', 'partial'] },
          id: { [Op.ne]: order.id }
        },
        order: [
          ['price', isBuy ? 'ASC' : 'DESC'],
          ['createdAt', 'ASC']
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
        skipLocked: true
      });
      
      // NEW: Filter out self-trade orders to prevent wash trading
      oppositeOrders = marketIntegrityService.filterSelfTrades(order, oppositeOrders);
      
      // NEW: Check if only self-liquidity exists and cancel market order
      if (marketIntegrityService.hasOnlySelfLiquidity(order, oppositeOrders)) {
        console.log('⚠️ CANCELLING MARKET ORDER - only self-liquidity exists');
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        await order.save({ transaction });
        await transaction.commit();
        
        // Reload and emit cancellation event
        await order.reload();
        this.emitTradeUpdate(order);
        console.log('❌ Market order cancelled - only self-liquidity exists');
        return;
      }
      
      // NEW: Auto-fill logic if no liquidity
      if (oppositeOrders.length === 0 && process.env.AUTO_FILL_ENABLED === 'true') {
        const autoFilled = await this.autoFillMarketOrder(order, token, transaction);
        if (autoFilled) {
          await transaction.commit();
          console.log('✅ Auto-fill successful - order filled!');
          
          // Reload order to get updated status and refresh order book
          await order.reload();
          await this.loadOrderBook(symbol);
          
          // Guard: check if order is now closed
          if (this.isOrderClosed(order)) {
            console.log('📊 Order is closed:', order.status, 'qty:', order.filledQuantity);
            this.emitTradeUpdate(order);
            console.log('🎯 AUTO-FILL COMPLETE - EXITING EARLY');
            return; // Early exit prevents cancellation logic
          }
        } else {
          console.log('❌ Auto-fill returned false');
        }
      }
      
      // Reload order inside transaction to check current state
      await order.reload({ transaction });
      
      // Guard: if order was closed by concurrent process or auto-fill, exit
      if (this.isOrderClosed(order)) {
        await transaction.commit();
        console.log('🛡️ Order already closed:', order.status, '- skipping cancellation');
        this.emitTradeUpdate(order);
        return;
      }
      
      console.log('🔍 After auto-fill check, oppositeOrders.length:', oppositeOrders.length);
      
      // NEW: Check market order slippage guard
      if (oppositeOrders.length > 0) {
        const bestPrice = parseFloat(oppositeOrders[0].price);
        const currentPrice = parseFloat(token.currentPrice);
        
        if (currentPrice > 0 && bestPrice > 0) {
          const slippageBps = Math.abs(bestPrice - currentPrice) / currentPrice * 10000;
          
          // Get max slippage from runtime config (default 500 = 5%)
          const maxSlippageBps = runtimeConfig?.maxMarketSlippageBps || 500;
          
          if (slippageBps > maxSlippageBps) {
            console.log(`⚠️  MARKET ORDER SLIPPAGE GUARD TRIGGERED: ${slippageBps.toFixed(0)}bps > ${maxSlippageBps}bps`);
            
            // Cancel the order due to excessive slippage
            order.status = 'cancelled';
            order.cancelledAt = new Date();
            await order.save({ transaction });
            await transaction.commit();
            
            // Reload and emit cancellation event
            await order.reload();
            this.emitTradeUpdate(order);
            console.log('❌ Market order cancelled - excessive slippage');
            return;
          }
        }
      }
      
      // Only cancel if order is still open and no liquidity exists
      if (oppositeOrders.length === 0) {
        // No matching orders and auto-fill disabled/failed - cancel with proper timestamp
        console.log('⚠️ CANCELLING ORDER - no liquidity');
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        await order.save({ transaction });
        await transaction.commit();
        
        // Reload and emit cancellation event
        await order.reload();
        this.emitTradeUpdate(order);
        console.log('❌ Order cancelled - no liquidity');
        return;
      }
      
      let remainingQuantity = parseFloat(order.quantity);
      let totalCost = 0;
      let weightedPrice = 0;
      
      for (const oppositeOrder of oppositeOrders) {
        if (remainingQuantity <= 0) break;
        
        const availableQuantity = parseFloat(oppositeOrder.quantity) - parseFloat(oppositeOrder.filledQuantity || 0);
        const fillQuantity = Math.min(remainingQuantity, availableQuantity);
        const fillPrice = parseFloat(oppositeOrder.price);
        
        // Execute trade
        await this.executeTrade(order, oppositeOrder, fillQuantity, fillPrice, transaction);
        
        remainingQuantity -= fillQuantity;
        totalCost += fillQuantity * fillPrice;
        weightedPrice += fillQuantity;
      }
      
      // NEW: Auto-fill remaining quantity if partial fill and under limit
      if (remainingQuantity > 0 && process.env.AUTO_FILL_ENABLED === 'true') {
        console.log(`💰 Partial fill - attempting auto-fill for remaining ${remainingQuantity}`);
        
        // Create a temporary order object for the remaining quantity
        const tempOrder = {
          id: order.id,
          userId: order.userId,
          tokenId: order.tokenId,
          side: order.side,
          orderType: 'market',
          quantity: remainingQuantity,
          filledQuantity: 0
        };
        
        const autoFilled = await this.autoFillMarketOrder(tempOrder, token, transaction);
        
        if (autoFilled) {
          const autoFilledQty = remainingQuantity;
          console.log(`✅ Auto-filled remaining ${autoFilledQty}`);
          // Note: autoFillMarketOrder already updated the order record
          // We just need to update our local tracking
          totalCost += autoFilledQty * parseFloat(token.currentPrice) * (order.side === 'buy' ? 1.005 : 0.995); // Include slippage
          weightedPrice += autoFilledQty;
          remainingQuantity = 0; // All filled now
        } else {
          console.log(`❌ Could not auto-fill remaining ${remainingQuantity}`);
        }
      }
      
      // Update order
      const averagePrice = totalCost / (parseFloat(order.quantity) - remainingQuantity);
      order.filledQuantity = parseFloat(order.quantity) - remainingQuantity;
      order.status = remainingQuantity === 0 ? 'filled' : 'partial';
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
  async executeLimitOrder(order, symbol, token) {
    const transaction = await sequelize.transaction();
    
    try {
      const isBuy = order.side === 'buy';
      let oppositeOrders = isBuy ? 
        await this.getAsks(symbol, order.price, '<=') : 
        await this.getBids(symbol, order.price, '>=');
      
      // NEW: Filter out self-trade orders to prevent wash trading
      oppositeOrders = marketIntegrityService.filterSelfTrades(order, oppositeOrders);
      
      let remainingQuantity = parseFloat(order.quantity);
      
      for (const oppositeOrder of oppositeOrders) {
        if (remainingQuantity <= 0) break;
        
        const availableQuantity = parseFloat(oppositeOrder.quantity) - parseFloat(oppositeOrder.filledQuantity || 0);
        const fillQuantity = Math.min(remainingQuantity, availableQuantity);
        const fillPrice = parseFloat(oppositeOrder.price);
        
        // Execute trade
        await this.executeTrade(order, oppositeOrder, fillQuantity, fillPrice, transaction);
        
        remainingQuantity -= fillQuantity;
      }
      
      // Update order
      order.filledQuantity = parseFloat(order.quantity) - remainingQuantity;
      
      if (remainingQuantity === 0) {
        order.status = 'filled';
      } else if (order.filledQuantity > 0) {
        order.status = 'partial';
      } else {
        order.status = 'pending'; // Add to order book
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
    
    // Get USDT token and the trading token
    const { Token } = require('../models');
    const usdtToken = await Token.findOne({ where: { symbol: 'USDT' } });
    const tradingToken = await Token.findByPk(buyer.tokenId);
    
    if (!usdtToken || !tradingToken) {
      throw new Error('Required tokens not found for trade execution');
    }
    
    // Calculate fees with TTX discount tiers
    const buyerFee = await this.calculateTradingFee(buyer.userId, totalValue, 'taker');
    const sellerFee = await this.calculateTradingFee(seller.userId, totalValue, 'maker');
    
    const totalFees = buyerFee + sellerFee;
    
    // Get or create wallets using camelCase userId and tokenId WITH ROW LOCKS
    const buyerUsdtWallet = await this.getUserWallet(buyer.userId, usdtToken.id, transaction, true);
    const buyerTokenWallet = await this.getUserWallet(buyer.userId, tradingToken.id, transaction, true);
    const sellerUsdtWallet = await this.getUserWallet(seller.userId, usdtToken.id, transaction, true);
    const sellerTokenWallet = await this.getUserWallet(seller.userId, tradingToken.id, transaction, true);
    
    // Atomically update buyer's wallet - deduct USDT, add tokens
    const buyerCost = totalValue + buyerFee;
    const [buyerUsdtAffected] = await Wallet.update(
      {
        balance: sequelize.literal(`balance - ${buyerCost}`),
        lockedBalance: sequelize.literal(`GREATEST(locked_balance - ${buyerCost}, 0)`)
      },
      {
        where: {
          id: buyerUsdtWallet.id,
          balance: { [Op.gte]: buyerCost }
        },
        transaction
      }
    );
    
    if (!buyerUsdtAffected) {
      throw new Error(`Insufficient USDT balance for buyer after lock`);
    }
    
    await buyerTokenWallet.update({
      balance: sequelize.literal(`balance + ${quantity}`)
    }, { transaction });
    
    // Atomically update seller's wallet - add USDT, deduct tokens
    const sellerRevenue = totalValue - sellerFee;
    await sellerUsdtWallet.update({
      balance: sequelize.literal(`balance + ${sellerRevenue}`)
    }, { transaction });
    
    const [sellerTokenAffected] = await Wallet.update(
      {
        balance: sequelize.literal(`balance - ${quantity}`),
        lockedBalance: sequelize.literal(`GREATEST(locked_balance - ${quantity}, 0)`)
      },
      {
        where: {
          id: sellerTokenWallet.id,
          balance: { [Op.gte]: quantity }
        },
        transaction
      }
    );
    
    if (!sellerTokenAffected) {
      throw new Error(`Insufficient token balance for seller after lock`);
    }
    
    // Update orders using camelCase filledQuantity
    buyOrder.filledQuantity = parseFloat(buyOrder.filledQuantity || 0) + quantity;
    sellOrder.filledQuantity = parseFloat(sellOrder.filledQuantity || 0) + quantity;
    
    if (buyOrder.filledQuantity >= parseFloat(buyOrder.quantity)) {
      buyOrder.status = 'filled';
    } else if (buyOrder.filledQuantity > 0) {
      buyOrder.status = 'partial';
    }
    
    if (sellOrder.filledQuantity >= parseFloat(sellOrder.quantity)) {
      sellOrder.status = 'filled';
    } else if (sellOrder.filledQuantity > 0) {
      sellOrder.status = 'partial';
    }
    
    await buyOrder.save({ transaction });
    await sellOrder.save({ transaction });
    
    // Create trade record with camelCase fields
    const Trade = require('../models/Trade');
    const tradeRecord = await Trade.create({
      buyOrderId: buyer.id,
      sellOrderId: seller.id,
      buyerId: buyer.userId,
      sellerId: seller.userId,
      tokenId: tradingToken.id,
      tokenSymbol: tradingToken.symbol,
      quantity,
      price,
      totalValue,
      buyerFee,
      sellerFee,
      tradeType: 'matched'
    }, { transaction });
    
    // Fire-and-forget post-trade async work after commit
    transaction.afterCommit(async () => {
      try {
        await this.processPostTradeWork({
          tradeId: tradeRecord.id,
          buyOrderId: buyer.id,
          sellOrderId: seller.id,
          buyerId: buyer.userId,
          sellerId: seller.userId,
          tokenSymbol: tradingToken.symbol,
          quantity,
          price,
          totalValue,
          totalFees,
          buyerFee,
          sellerFee
        });
      } catch (error) {
        logger.error('❌ Failed to enqueue post-trade job', {
          tradeId: tradeRecord.id,
          error: error.message
        });
      }
    });
  }

  /**
   * Enqueue post-trade job for async processing
   * Replaces fire-and-forget setImmediate with persistent queue
   */
  async processPostTradeWork(context) {
    const {
      tradeId,
      buyOrderId,
      sellOrderId,
      buyerId,
      sellerId,
      tokenSymbol,
      quantity,
      price,
      totalValue,
      totalFees
    } = context;

    const correlationId = `trade-${tradeId}-${Date.now()}`;
    
    // Calculate fee split
    const holderShare = totalFees * 0.15;
    const platformShare = totalFees * 0.85;

    // Enqueue post-trade job for async processing
    const jobId = await postTradeQueueService.enqueue('post_trade', {
      tradeId,
      buyOrderId,
      sellOrderId,
      buyerId,
      sellerId,
      tokenSymbol,
      quantity,
      price,
      totalValue,
      totalFees,
      holderShare,
      platformShare,
      correlationId
    });

    logger.info('✅ Post-trade job enqueued', {
      jobId,
      tradeId,
      correlationId,
      holderShare: holderShare.toFixed(4),
      platformShare: platformShare.toFixed(4)
    });
  }

  /**
   * Calculate trading fee (configurable via env vars)
   */
  async calculateTradingFee(userId, amount, type = 'taker') {
    // Get fee rates from env or use defaults (in basis points)
    const makerBps = parseInt(process.env.TRADING_FEE_MAKER_BPS || '8', 10); // 0.08% default
    const takerBps = parseInt(process.env.TRADING_FEE_TAKER_BPS || '12', 10); // 0.12% default
    
    const feeRate = type === 'maker' ? (makerBps / 10000) : (takerBps / 10000);
    
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
    
    // Calculate base fee using env-configured rate
    const baseFee = amount * feeRate;
    
    // Apply TTX tier discount
    const ttxFeeService = require('./ttxFeeService');
    const tier = await ttxFeeService.getUserTier(ttxBalance);
    
    return baseFee * tier.feeMultiplier;
  }

  /**
   * Handle stop-loss order (future: advanced order types)
   */
  async handleStopLoss(order, symbol, token) {
    // Check if stop price triggered
    const currentPrice = parseFloat(token.currentPrice);
    
    if (order.side === 'sell' && currentPrice <= parseFloat(order.stopPrice)) {
      // Convert to market order and execute
      order.orderType = 'market';
      await this.executeMarketOrder(order, symbol, token);
    } else if (order.side === 'buy' && currentPrice >= parseFloat(order.stopPrice)) {
      order.orderType = 'market';
      await this.executeMarketOrder(order, symbol, token);
    } else {
      // Keep monitoring
      order.status = 'pending';
      await order.save();
    }
  }

  /**
   * Handle take-profit order (future: advanced order types)
   */
  async handleTakeProfit(order, symbol, token) {
    const currentPrice = parseFloat(token.currentPrice);
    
    if (order.side === 'sell' && currentPrice >= parseFloat(order.takeProfitPrice)) {
      order.orderType = 'market';
      await this.executeMarketOrder(order, symbol, token);
    } else if (order.side === 'buy' && currentPrice <= parseFloat(order.takeProfitPrice)) {
      order.orderType = 'market';
      await this.executeMarketOrder(order, symbol, token);
    } else {
      order.status = 'pending';
      await order.save();
    }
  }

  /**
   * Get current market price
   */
  async getCurrentPrice(symbol) {
    // Get token by symbol, then find last filled order
    const { Token } = require('../models');
    const token = await Token.findOne({ where: { symbol } });
    
    if (!token) return null;
    
    const lastTrade = await Order.findOne({
      where: { 
        tokenId: token.id,
        status: 'filled'
      },
      order: [['updatedAt', 'DESC']]
    });
    
    return lastTrade ? parseFloat(lastTrade.price) : null;
  }

  /**
   * Load order book from database
   */
  async loadOrderBook(symbol) {
    // First get the token by symbol
    const { Token } = require('../models');
    const token = await Token.findOne({ where: { symbol } });
    
    if (!token) {
      this.orderBooks.set(symbol, { bids: [], asks: [] });
      return;
    }
    
    const orders = await Order.findAll({
      where: {
        tokenId: token.id,
        status: { [Op.in]: ['pending', 'partial'] }
      },
      include: [{
        model: Token,
        as: 'token',
        attributes: ['symbol', 'name']
      }],
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
  /**
   * Distribute fees to platform pools (40/30/20/10 split)
   * Now delegated to feePoolService for actual database updates
   */
  async distributeFees(totalFees, transaction) {
    // Delegate to feePoolService which handles actual pool distribution
    // This method is kept for backward compatibility
    try {
      const result = await feePoolService.distributeFees(totalFees, `legacy-${Date.now()}`, transaction);
      
      logger.info('Fees distributed to pools', {
        totalFees,
        staking: result.distributions['Staking Rewards']?.amount,
        liquidity: result.distributions['Liquidity Mining']?.amount,
        treasury: result.distributions['Treasury Reserve']?.amount,
        development: result.distributions['Development Fund']?.amount
      });
      
      return {
        staking: result.distributions['Staking Rewards']?.amount || 0,
        liquidity: result.distributions['Liquidity Mining']?.amount || 0,
        treasury: result.distributions['Treasury Reserve']?.amount || 0,
        development: result.distributions['Development Fund']?.amount || 0
      };
    } catch (error) {
      logger.error('Fee distribution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Emit real-time trade update (future: WebSocket integration)
   */
  emitTradeUpdate(order) {
    // Get the io instance from the global app context
    const { app } = require('../server');
    const io = app.get('io');
    
    if (io) {
      // Emit order update to all connected clients
      io.emit('order:update', {
        orderId: order.id,
        status: order.status,
        filledQuantity: order.filledQuantity,
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
   * AUTO-FILL: Fill market order using internal exchange liquidity
   * This provides instant fills when there's no opposing liquidity
   */
  async autoFillMarketOrder(order, token, transaction) {
    try {
      const { User } = require('../models');
      const Trade = require('../models/Trade');
      
      // Get exchange wallet user
      const exchangeUser = await User.findOne({
        where: { email: process.env.EXCHANGE_WALLET_EMAIL || 'exchange@tokentradex.internal' }
      });
      
      if (!exchangeUser) {
        console.log('❌ Exchange wallet not found - auto-fill disabled');
        return false;
      }
      
      const quantity = parseFloat(order.quantity);
      const currentPrice = parseFloat(token.currentPrice);
      
      if (!currentPrice || currentPrice === 0) {
        console.log('❌ Token has no current price set:', token.symbol);
        return false;
      }
      
      const slippage = parseFloat(process.env.AUTO_FILL_SLIPPAGE_PERCENT || 0.5) / 100;
      
      // Apply slippage: buyers pay slightly more, sellers get slightly less
      const fillPrice = order.side === 'buy' ? 
        currentPrice * (1 + slippage) : 
        currentPrice * (1 - slippage);
      
      const totalValue = quantity * fillPrice;
      const maxAutoFill = parseFloat(process.env.MAX_AUTO_FILL_USD || 500);
      
      // Check if order is within auto-fill limit
      if (totalValue > maxAutoFill) {
        console.log(`💰 Order value $${totalValue.toFixed(2)} exceeds auto-fill limit $${maxAutoFill}`);
        return false;
      }
      
      // Get USDT token
      const usdtToken = await Token.findOne({ where: { symbol: 'USDT' } });
      if (!usdtToken) {
        console.log('❌ USDT token not found');
        return false;
      }
      
      // Get exchange wallets WITH LOCKS to prevent treasury depletion races
      const exchangeTokenWallet = await Wallet.findOne({
        where: { 
          userId: exchangeUser.id,
          tokenId: token.id
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      
      const exchangeUsdtWallet = await Wallet.findOne({
        where: { 
          userId: exchangeUser.id,
          tokenId: usdtToken.id
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      
      // Strict treasury check: abort auto-fill if exchange wallet is short
      const strictMode = process.env.AUTOFILL_TREASURY_STRICT === 'true';
      
      if (order.side === 'buy') {
        // Exchange needs tokens to sell
        const available = exchangeTokenWallet ? 
          parseFloat(exchangeTokenWallet.balance) - parseFloat(exchangeTokenWallet.lockedBalance) : 0;
        
        if (available < quantity) {
          console.log(`❌ Exchange has insufficient ${token.symbol}: need ${quantity}, have ${available}`);
          if (strictMode) {
            throw new Error(`Auto-fill treasury insufficient for ${token.symbol}`);
          }
          return false;
        }
      } else {
        // Exchange needs USDT to buy
        const available = exchangeUsdtWallet ? 
          parseFloat(exchangeUsdtWallet.balance) - parseFloat(exchangeUsdtWallet.lockedBalance) : 0;
        
        if (available < totalValue) {
          console.log(`❌ Exchange has insufficient USDT: need ${totalValue.toFixed(2)}, have ${available.toFixed(2)}`);
          if (strictMode) {
            throw new Error(`Auto-fill treasury insufficient for USDT`);
          }
          return false;
        }
      }
      
      // Calculate fees
      const userFee = await this.calculateTradingFee(order.userId, totalValue, 'taker');
      
      // Execute the auto-fill trade
      const userId = order.userId;
      
      // Get or create user wallets WITH LOCKS
      const userTokenWallet = await this.getUserWallet(userId, token.id, transaction, true);
      const userUsdtWallet = await this.getUserWallet(userId, usdtToken.id, transaction, true);
      
      if (order.side === 'buy') {
        // User buys from exchange
        // Transfer tokens: exchange -> user
        await exchangeTokenWallet.update({
          balance: parseFloat(exchangeTokenWallet.balance) - quantity
        }, { transaction });
        
        await userTokenWallet.update({
          balance: parseFloat(userTokenWallet.balance) + quantity
        }, { transaction });
        
        // Transfer USDT + fee: user -> exchange (unlock the locked amount)
        const totalCost = totalValue + userFee;
        await userUsdtWallet.update({
          balance: parseFloat(userUsdtWallet.balance) - totalCost,
          lockedBalance: Math.max(0, parseFloat(userUsdtWallet.lockedBalance) - totalCost)
        }, { transaction });
        
        await exchangeUsdtWallet.update({
          balance: parseFloat(exchangeUsdtWallet.balance) + totalValue
        }, { transaction });
        
      } else {
        // User sells to exchange
        // Transfer tokens: user -> exchange (unlock user's locked tokens)
        await userTokenWallet.update({
          balance: parseFloat(userTokenWallet.balance) - quantity,
          lockedBalance: Math.max(0, parseFloat(userTokenWallet.lockedBalance) - quantity)
        }, { transaction });
        
        await exchangeTokenWallet.update({
          balance: parseFloat(exchangeTokenWallet.balance) + quantity
        }, { transaction });
        
        // Transfer USDT: exchange -> user (minus fee)
        const netUSDT = totalValue - userFee;
        await exchangeUsdtWallet.update({
          balance: parseFloat(exchangeUsdtWallet.balance) - totalValue
        }, { transaction });
        
        await userUsdtWallet.update({
          balance: parseFloat(userUsdtWallet.balance) + netUSDT
        }, { transaction });
      }
      
      // Create trade record
      await Trade.create({
        buyOrderId: order.side === 'buy' ? order.id : null,
        sellOrderId: order.side === 'sell' ? order.id : null,
        buyerId: order.side === 'buy' ? userId : exchangeUser.id,
        sellerId: order.side === 'sell' ? userId : exchangeUser.id,
        tokenId: token.id,
        tokenSymbol: token.symbol,
        quantity,
        price: fillPrice,
        totalValue,
        buyerFee: order.side === 'buy' ? userFee : 0,
        sellerFee: order.side === 'sell' ? userFee : 0,
        tradeType: 'auto_fill'
      }, { transaction });
      
      // Update order status
      await order.update({
        filledQuantity: quantity,
        status: 'filled',
        filledAt: new Date(),
        price: fillPrice
      }, { transaction });
      
      // Queue fee collection to afterCommit (non-blocking)
      transaction.afterCommit(() => {
        setImmediate(async () => {
          try {
            // Collect trading fee via unified collector (stream 0)
            await revenueCollector.collectRevenue(0, userFee, `Auto-fill: ${quantity} ${token.symbol}`, `autofill-${order.id}`);
            
            // Collect market making spread via unified collector (stream 4)
            const spreadProfit = Math.abs(fillPrice - currentPrice) * quantity;
            if (spreadProfit > 0) {
              await revenueCollector.collectRevenue(4, spreadProfit, `Market making spread: ${token.symbol}`, `spread-${order.id}`);
              console.log(`💰 Market making spread collected: $${spreadProfit.toFixed(2)}`);
            }
          } catch (error) {
            logger.error('Auto-fill revenue collection failed', { error: error.message });
          }
        });
      });
      
      console.log('✅ AUTO-FILL SUCCESS:', {
        orderId: order.id,
        side: order.side,
        quantity,
        price: fillPrice.toFixed(8),
        totalValue: totalValue.toFixed(2),
        fee: userFee.toFixed(2),
        slippage: `${(slippage * 100).toFixed(2)}%`
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ AUTO-FILL FAILED:', { error: error.message, stack: error.stack });
      return false;
    }
  }
  
  /**
   * Helper: Get or create user wallet
   */
  async getUserWallet(userId, tokenId, transaction, lock = false) {
    const options = {
      where: { userId, tokenId },
      transaction
    };
    
    if (lock) {
      options.lock = transaction.LOCK.UPDATE;
    }
    
    let wallet = await Wallet.findOne(options);
    
    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        tokenId,
        balance: 0,
        lockedBalance: 0
      }, { transaction });
    }
    
    return wallet;
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
      quantity: parseFloat(order.quantity) - parseFloat(order.filledQuantity || 0),
      total: (parseFloat(order.quantity) - parseFloat(order.filledQuantity || 0)) * parseFloat(order.price)
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
