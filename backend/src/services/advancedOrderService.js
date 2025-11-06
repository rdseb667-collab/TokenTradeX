const { Order, Token } = require('../models');
const { Op } = require('sequelize');
const logger = require('./logger');

/**
 * Advanced Order Service - Handles advanced order types
 * OCO (One-Cancels-Other), Trailing Stop, Iceberg orders
 */
class AdvancedOrderService {
  constructor() {
    this.activeTrailingOrders = new Map(); // orderId -> { highestPrice, lowestPrice }
    this.ocoGroups = new Map(); // groupId -> [orderId1, orderId2]
  }

  /**
   * Create OCO (One-Cancels-Other) order pair
   * When one order executes, the other is automatically cancelled
   */
  async createOCOOrder(userId, tokenId, side, quantity, limitPrice, stopPrice) {
    const ocoGroupId = `oco_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Create limit order
      const limitOrder = await Order.create({
        userId,
        tokenId,
        orderType: 'limit',
        side,
        price: limitPrice,
        quantity,
        status: 'pending',
        metadata: { ocoGroupId, ocoType: 'limit' }
      });

      // Create stop order
      const stopOrder = await Order.create({
        userId,
        tokenId,
        orderType: 'stop_loss',
        side,
        price: stopPrice,
        quantity,
        stopPrice,
        status: 'pending',
        metadata: { ocoGroupId, ocoType: 'stop' }
      });

      // Store OCO group
      this.ocoGroups.set(ocoGroupId, [limitOrder.id, stopOrder.id]);

      logger.info('OCO order created', {
        ocoGroupId,
        limitOrderId: limitOrder.id,
        stopOrderId: stopOrder.id
      });

      return {
        ocoGroupId,
        limitOrder,
        stopOrder
      };
    } catch (error) {
      logger.error('Failed to create OCO order', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle OCO order execution - cancel the other order
   */
  async handleOCOExecution(executedOrderId) {
    const executedOrder = await Order.findByPk(executedOrderId);
    
    if (!executedOrder || !executedOrder.metadata?.ocoGroupId) {
      return;
    }

    const ocoGroupId = executedOrder.metadata.ocoGroupId;
    const groupOrders = this.ocoGroups.get(ocoGroupId);
    
    if (!groupOrders) {
      return;
    }

    // Find and cancel the other order in the group
    const otherOrderId = groupOrders.find(id => id !== executedOrderId);
    
    if (otherOrderId) {
      await Order.update(
        { status: 'cancelled', cancelledAt: new Date() },
        { where: { id: otherOrderId, status: { [Op.in]: ['pending', 'partial'] } } }
      );

      logger.info('OCO order cancelled', {
        ocoGroupId,
        executedOrderId,
        cancelledOrderId: otherOrderId
      });
    }

    // Cleanup
    this.ocoGroups.delete(ocoGroupId);
  }

  /**
   * Create Trailing Stop order
   * Stop price automatically adjusts as market moves in favorable direction
   */
  async createTrailingStop(userId, tokenId, side, quantity, trailPercent) {
    try {
      const token = await Token.findByPk(tokenId);
      const currentPrice = parseFloat(token.currentPrice);
      
      // Calculate initial stop price
      const stopPrice = side === 'buy' 
        ? currentPrice * (1 + trailPercent / 100)
        : currentPrice * (1 - trailPercent / 100);

      const order = await Order.create({
        userId,
        tokenId,
        orderType: 'trailing_stop',
        side,
        quantity,
        stopPrice,
        metadata: {
          trailPercent,
          initialPrice: currentPrice,
          highestPrice: currentPrice,
          lowestPrice: currentPrice
        },
        status: 'pending'
      });

      // Track this order for price updates
      this.activeTrailingOrders.set(order.id, {
        highestPrice: currentPrice,
        lowestPrice: currentPrice,
        trailPercent
      });

      logger.info('Trailing stop order created', {
        orderId: order.id,
        side,
        trailPercent,
        initialStopPrice: stopPrice
      });

      return order;
    } catch (error) {
      logger.error('Failed to create trailing stop', { error: error.message });
      throw error;
    }
  }

  /**
   * Update trailing stop orders based on price movement
   */
  async updateTrailingStops(tokenId, newPrice) {
    const trailingOrders = await Order.findAll({
      where: {
        tokenId,
        orderType: 'trailing_stop',
        status: 'pending'
      }
    });

    for (const order of trailingOrders) {
      const tracking = this.activeTrailingOrders.get(order.id);
      
      if (!tracking) continue;

      const { trailPercent } = tracking;
      let { highestPrice, lowestPrice } = tracking;
      let updated = false;

      // Update highest/lowest prices
      if (newPrice > highestPrice) {
        highestPrice = newPrice;
        updated = true;
      }
      if (newPrice < lowestPrice) {
        lowestPrice = newPrice;
        updated = true;
      }

      // Recalculate stop price
      let newStopPrice;
      if (order.side === 'sell') {
        // For sell orders, trail below the highest price
        newStopPrice = highestPrice * (1 - trailPercent / 100);
      } else {
        // For buy orders, trail above the lowest price
        newStopPrice = lowestPrice * (1 + trailPercent / 100);
      }

      // Update order if stop price changed
      if (updated && newStopPrice !== parseFloat(order.stopPrice)) {
        await order.update({
          stopPrice: newStopPrice,
          metadata: {
            ...order.metadata,
            highestPrice,
            lowestPrice,
            lastUpdate: new Date()
          }
        });

        this.activeTrailingOrders.set(order.id, {
          highestPrice,
          lowestPrice,
          trailPercent
        });

        logger.info('Trailing stop updated', {
          orderId: order.id,
          newStopPrice,
          highestPrice,
          lowestPrice
        });
      }

      // Check if stop price is hit
      const stopHit = order.side === 'sell' 
        ? newPrice <= newStopPrice
        : newPrice >= newStopPrice;

      if (stopHit) {
        // Convert to market order
        await order.update({
          orderType: 'market',
          status: 'pending'
        });

        this.activeTrailingOrders.delete(order.id);

        logger.info('Trailing stop triggered', {
          orderId: order.id,
          triggerPrice: newPrice,
          stopPrice: newStopPrice
        });
      }
    }
  }

  /**
   * Create Iceberg order (hidden large order executed in chunks)
   */
  async createIcebergOrder(userId, tokenId, side, totalQuantity, visibleQuantity, price) {
    try {
      const icebergGroupId = `iceberg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const order = await Order.create({
        userId,
        tokenId,
        orderType: 'limit',
        side,
        price,
        quantity: totalQuantity,
        metadata: {
          icebergGroupId,
          visibleQuantity,
          totalQuantity,
          remainingQuantity: totalQuantity
        },
        status: 'pending'
      });

      logger.info('Iceberg order created', {
        orderId: order.id,
        totalQuantity,
        visibleQuantity
      });

      return order;
    } catch (error) {
      logger.error('Failed to create iceberg order', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean up completed orders from tracking
   */
  cleanup(orderId) {
    this.activeTrailingOrders.delete(orderId);
    
    // Find and remove OCO groups
    for (const [groupId, orderIds] of this.ocoGroups.entries()) {
      if (orderIds.includes(orderId)) {
        this.ocoGroups.delete(groupId);
        break;
      }
    }
  }
}

module.exports = new AdvancedOrderService();
