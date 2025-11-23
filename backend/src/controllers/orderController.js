const { Order, Token, Wallet, Trade, Transaction } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const orderMatchingService = require('../services/orderMatchingService');
const whaleProtectionService = require('../services/whaleProtectionService');

class OrderController {
  // Create order
  async createOrder(req, res, next) {
    const t = await sequelize.transaction();
    
    try {
      const { tokenId, orderType, side, price, quantity, stopPrice, clientOrderId } = req.body;
      const userId = req.user.id;
      
      console.log('📥 CREATE ORDER REQUEST:', {
        body: req.body,
        userId,
        tokenId,
        orderType,
        side,
        price,
        quantity,
        stopPrice
      });
      
      // Idempotency: Check for Idempotency-Key header or clientOrderId
      const idempotencyKey = req.headers['idempotency-key'] || clientOrderId || null;
      
      // If idempotency key provided, check for existing order
      if (idempotencyKey) {
        const existingOrder = await Order.findOne({
          where: { userId, idempotencyKey },
          transaction: t
        });
        
        if (existingOrder) {
          await t.commit();
          console.log('✅ IDEMPOTENT REQUEST - Returning existing order:', existingOrder.id);
          return res.status(200).json({
            success: true,
            message: 'Order already exists (idempotent)',
            data: existingOrder,
            idempotent: true
          });
        }
      }

      // Parse and validate quantity
      const parsedQuantity = parseFloat(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'INVALID_SIZE',
          error: `Invalid quantity: ${quantity}. Must be a positive number.`
        });
      }

      console.log('📊 Order Request:', {
        userId,
        tokenId,
        orderType,
        side,
        price,
        quantity,
        parsedQuantity,
        stopPrice
      });

      // Validate token
      const token = await Token.findByPk(tokenId);
      if (!token) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'INVALID_MARKET',
          error: 'Token not found'
        });
      }
      
      if (!token.isTradingEnabled) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'INVALID_MARKET',
          error: 'Token not available for trading'
        });
      }

      console.log('✅ Token found:', {
        symbol: token.symbol,
        minTradeAmount: token.minTradeAmount,
        maxTradeAmount: token.maxTradeAmount
      });

      // Validate quantity limits
      if (parsedQuantity < parseFloat(token.minTradeAmount) || parsedQuantity > parseFloat(token.maxTradeAmount)) {
        await t.rollback();
        console.error('❌ QUANTITY OUT OF RANGE:', {
          quantity: parsedQuantity,
          minTradeAmount: token.minTradeAmount,
          maxTradeAmount: token.maxTradeAmount,
          symbol: token.symbol
        });
        return res.status(400).json({
          success: false,
          message: 'INVALID_SIZE',
          error: `Order quantity must be between ${token.minTradeAmount} and ${token.maxTradeAmount} ${token.symbol}`
        });
      }

      // Validate price for limit orders
      let orderPrice = 0;
      if (orderType === 'limit' || orderType === 'stop_loss' || orderType === 'take_profit') {
        orderPrice = parseFloat(price || 0);
        if (isNaN(orderPrice) || orderPrice <= 0) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: 'INVALID_PRICE',
            error: 'Price must be a positive number for limit orders'
          });
        }
      } else if (orderType === 'market') {
        orderPrice = parseFloat(token.currentPrice);
      }

      // Calculate order value
      const totalValue = orderPrice * parsedQuantity;
      
      // Check max notional limit
      const maxNotional = parseFloat(process.env.MAX_ORDER_NOTIONAL_USD || 1000000); // $1M default
      if (totalValue > maxNotional) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'MAX_NOTIONAL_EXCEEDED',
          error: `Order notional ($${totalValue.toFixed(2)}) exceeds maximum allowed ($${maxNotional.toFixed(2)})`
        });
      }

      const fee = totalValue * (parseFloat(process.env.TRADING_FEE_PERCENT || 0.12) / 100);

      // WHALE PROTECTION: Check circuit breaker
      const circuitBreakerCheck = await whaleProtectionService.checkCircuitBreaker(
        tokenId, 
        orderPrice, 
        req.user.role // Pass user role for exemptions
      );
      if (circuitBreakerCheck.active) {
        await t.rollback();
        return res.status(429).json({
          success: false,
          message: circuitBreakerCheck.reason,
          remainingSeconds: circuitBreakerCheck.remainingSeconds
        });
      }

      // WHALE PROTECTION: Check position limits for buy orders
      if (side === 'buy') {
        const positionCheck = await whaleProtectionService.checkPositionLimit(
          userId, 
          tokenId, 
          parsedQuantity, 
          req.user.role // Pass user role for exemptions
        );
        if (!positionCheck.allowed) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: positionCheck.reason,
            maxAllowed: positionCheck.maxAllowed
          });
        }
      }

      // Check wallet balance for buy orders
      if (side === 'buy') {
        // For buy orders, check USDT balance
        const usdtToken = await Token.findOne({ where: { symbol: 'USDT' } });
        if (!usdtToken) {
          await t.rollback();
          return res.status(500).json({
            success: false,
            message: 'USDT token not configured'
          });
        }

        const usdtWallet = await Wallet.findOne({
          where: { userId, tokenId: usdtToken.id },
          transaction: t
        });

        const requiredUSDT = totalValue + fee;
        const availableUSDT = usdtWallet
          ? parseFloat(usdtWallet.balance) - parseFloat(usdtWallet.lockedBalance)
          : 0;

        console.log('💰 Balance Check:', {
          requiredUSDT: requiredUSDT.toFixed(2),
          availableUSDT: availableUSDT.toFixed(2),
          usdtBalance: usdtWallet ? parseFloat(usdtWallet.balance) : 0,
          lockedBalance: usdtWallet ? parseFloat(usdtWallet.lockedBalance) : 0,
          totalValue: totalValue.toFixed(2),
          fee: fee.toFixed(2)
        });

        if (availableUSDT < requiredUSDT) {
          await t.rollback();
          console.error('❌ INSUFFICIENT USDT:', {
            required: requiredUSDT.toFixed(2),
            available: availableUSDT.toFixed(2),
            shortage: (requiredUSDT - availableUSDT).toFixed(2)
          });
          return res.status(400).json({
            success: false,
            message: 'INSUFFICIENT_FUNDS',
            error: `Insufficient USDT balance. Required: $${requiredUSDT.toFixed(2)}, Available: $${availableUSDT.toFixed(2)}`
          });
        }

        // Lock USDT for the buy order
        await usdtWallet.update({
          lockedBalance: parseFloat(usdtWallet.lockedBalance) + requiredUSDT
        }, { transaction: t });
      } else {
        // For sell orders, check if user has enough tokens
        const wallet = await Wallet.findOne({
          where: { userId, tokenId },
          transaction: t
        });

        if (!wallet || parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance) < parsedQuantity) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: 'INSUFFICIENT_FUNDS',
            error: 'Insufficient token balance'
          });
        }

        // Lock the tokens
        await wallet.update({
          lockedBalance: parseFloat(wallet.lockedBalance) + parsedQuantity
        }, { transaction: t });
      }

      // Create order
      const order = await Order.create({
        userId,
        tokenId,
        orderType,
        side,
        price: orderPrice,
        quantity: parsedQuantity,
        stopPrice,
        totalValue,
        fee,
        status: orderType === 'market' ? 'pending' : 'pending',
        idempotencyKey
      }, { transaction: t });

      await t.commit();

      console.log('✅ ORDER CREATED:', {
        orderId: order.id,
        userId: order.userId,
        tokenId: order.tokenId,
        orderType: order.orderType,
        side: order.side,
        quantity: order.quantity,
        status: order.status
      });

      // Process order through matching engine IMMEDIATELY (not async)
      try {
        console.log('🎯 CALLING MATCHING ENGINE for order:', order.id);
        await orderMatchingService.processOrder(order);
        console.log('✅ MATCHING ENGINE COMPLETED for order:', order.id);
        
        // Reload order to get updated status from matching engine
        await order.reload();
        console.log('🔄 ORDER RELOADED - Final status:', order.status, 'filled:', order.filledQuantity);
      } catch (error) {
        console.error('❌ MATCHING ENGINE ERROR:', {
          orderId: order.id,
          error: error.message,
          stack: error.stack
        });
      }

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order
      });
    } catch (error) {
      await t.rollback();
      console.error('❌ ORDER CREATION FAILED:', {
        message: error.message,
        stack: error.stack,
        userId: req.user?.id,
        body: req.body,
        errorName: error.name,
        errorCode: error.code
      });
      
      // Send detailed error to client
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create order',
        details: process.env.NODE_ENV === 'development' ? {
          error: error.name,
          received: req.body
        } : undefined
      });
    }
  }

  // Match order (simplified matching engine)
  async matchOrder(orderId) {
    const order = await Order.findByPk(orderId, {
      include: [{ model: Token, as: 'token' }]
    });

    if (!order || order.status === 'filled' || order.status === 'cancelled') {
      return;
    }

    const oppositeSide = order.side === 'buy' ? 'sell' : 'buy';
    const remainingQty = parseFloat(order.quantity) - parseFloat(order.filledQuantity);

    if (remainingQty <= 0) {
      await order.update({ status: 'filled', filledAt: new Date() });
      return;
    }

    // Find matching orders
    const whereClause = {
      tokenId: order.tokenId,
      side: oppositeSide,
      status: { [Op.in]: ['pending', 'partial'] },
      id: { [Op.ne]: order.id }
    };

    if (order.side === 'buy') {
      whereClause.price = { [Op.lte]: order.price };
    } else {
      whereClause.price = { [Op.gte]: order.price };
    }

    const matchingOrders = await Order.findAll({
      where: whereClause,
      order: order.side === 'buy' ? [['price', 'ASC']] : [['price', 'DESC']],
      limit: 10
    });

    // Execute trades
    for (const matchOrder of matchingOrders) {
      if (remainingQty <= 0) break;

      const matchRemainingQty = parseFloat(matchOrder.quantity) - parseFloat(matchOrder.filledQuantity);
      const tradeQuantity = Math.min(remainingQty, matchRemainingQty);
      const tradePrice = parseFloat(matchOrder.price);

      await this.executeTrade(order, matchOrder, tradeQuantity, tradePrice);
    }
  }

  // Execute trade
  async executeTrade(buyOrder, sellOrder, quantity, price) {
    const t = await sequelize.transaction();

    try {
      const totalValue = quantity * price;
      const buyerFee = totalValue * (parseFloat(process.env.TRADING_FEE_PERCENT) / 100);
      const sellerFee = totalValue * (parseFloat(process.env.TRADING_FEE_PERCENT) / 100);

      // Get USDT token
      const usdtToken = await Token.findOne({ where: { symbol: 'USDT' } });

      // Update buyer's wallets (receives tokens, pays USDT)
      const buyerTokenWallet = await Wallet.findOne({
        where: { userId: buyOrder.side === 'buy' ? buyOrder.userId : sellOrder.userId, tokenId: buyOrder.tokenId },
        transaction: t
      }) || await Wallet.create({
        userId: buyOrder.side === 'buy' ? buyOrder.userId : sellOrder.userId,
        tokenId: buyOrder.tokenId,
        balance: 0,
        lockedBalance: 0
      }, { transaction: t });

      const buyerUSDTWallet = await Wallet.findOne({
        where: { userId: buyOrder.side === 'buy' ? buyOrder.userId : sellOrder.userId, tokenId: usdtToken.id },
        transaction: t
      });

      // Update seller's wallets (receives USDT, pays tokens)
      const sellerTokenWallet = await Wallet.findOne({
        where: { userId: buyOrder.side === 'sell' ? buyOrder.userId : sellOrder.userId, tokenId: buyOrder.tokenId },
        transaction: t
      });

      const sellerUSDTWallet = await Wallet.findOne({
        where: { userId: buyOrder.side === 'sell' ? buyOrder.userId : sellOrder.userId, tokenId: usdtToken.id },
        transaction: t
      }) || await Wallet.create({
        userId: buyOrder.side === 'sell' ? buyOrder.userId : sellOrder.userId,
        tokenId: usdtToken.id,
        balance: 0,
        lockedBalance: 0
      }, { transaction: t });

      // Buyer: Add tokens, deduct USDT + fee
      await buyerTokenWallet.update({
        balance: parseFloat(buyerTokenWallet.balance) + quantity
      }, { transaction: t });

      await buyerUSDTWallet.update({
        balance: parseFloat(buyerUSDTWallet.balance) - totalValue - buyerFee,
        lockedBalance: parseFloat(buyerUSDTWallet.lockedBalance) - (totalValue + buyerFee)
      }, { transaction: t });

      // Seller: Add USDT - fee, deduct tokens
      await sellerUSDTWallet.update({
        balance: parseFloat(sellerUSDTWallet.balance) + totalValue - sellerFee
      }, { transaction: t });

      await sellerTokenWallet.update({
        balance: parseFloat(sellerTokenWallet.balance) - quantity,
        lockedBalance: parseFloat(sellerTokenWallet.lockedBalance) - quantity
      }, { transaction: t });

      // Create trade record
      await Trade.create({
        buyOrderId: buyOrder.side === 'buy' ? buyOrder.id : sellOrder.id,
        sellOrderId: buyOrder.side === 'sell' ? buyOrder.id : sellOrder.id,
        buyerId: buyOrder.side === 'buy' ? buyOrder.userId : sellOrder.userId,
        sellerId: buyOrder.side === 'sell' ? buyOrder.userId : sellOrder.userId,
        tokenId: buyOrder.tokenId,
        price,
        quantity,
        totalValue,
        buyerFee,
        sellerFee
      }, { transaction: t });

      // Update orders
      await buyOrder.update({
        filledQuantity: parseFloat(buyOrder.filledQuantity) + quantity,
        status: parseFloat(buyOrder.filledQuantity) + quantity >= parseFloat(buyOrder.quantity) ? 'filled' : 'partial',
        filledAt: parseFloat(buyOrder.filledQuantity) + quantity >= parseFloat(buyOrder.quantity) ? new Date() : null
      }, { transaction: t });

      await sellOrder.update({
        filledQuantity: parseFloat(sellOrder.filledQuantity) + quantity,
        status: parseFloat(sellOrder.filledQuantity) + quantity >= parseFloat(sellOrder.quantity) ? 'filled' : 'partial',
        filledAt: parseFloat(sellOrder.filledQuantity) + quantity >= parseFloat(sellOrder.quantity) ? new Date() : null
      }, { transaction: t });

      await t.commit();
      console.log(`✅ Trade executed: ${quantity} tokens @ $${price}`);
    } catch (error) {
      await t.rollback();
      console.error('Trade execution failed:', error);
      throw error;
    }
  }

  // Get user orders
  async getUserOrders(req, res, next) {
    try {
      const { status, tokenId, limit = 50 } = req.query;
      
      const where = { userId: req.user.id };
      
      if (status) {
        where.status = status;
      }
      
      if (tokenId) {
        where.tokenId = tokenId;
      }

      const orders = await Order.findAll({
        where,
        include: [{ model: Token, as: 'token' }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }

  // Get order by ID
  async getOrderById(req, res, next) {
    try {
      const order = await Order.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        },
        include: [{ model: Token, as: 'token' }]
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  // Update order (price/quantity for pending limit orders)
  async updateOrder(req, res, next) {
    console.log('🔄 UPDATE ORDER REQUEST:', {
      orderId: req.params.id,
      userId: req.user?.id,
      body: req.body
    });
    
    const t = await sequelize.transaction();
    
    try {
      const { price, quantity, stopPrice } = req.body;
      
      const order = await Order.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        },
        include: [{ model: Token, as: 'token' }],
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!order) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Only allow updating pending or partial orders
      if (!['pending', 'partial'].includes(order.status)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot update order with status: ${order.status}`
        });
      }

      // Only allow updating limit, stop_loss, and take_profit orders
      if (order.orderType === 'market') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot update market orders'
        });
      }

      const updates = {};
      const oldPrice = parseFloat(order.price);
      const oldQuantity = parseFloat(order.quantity);
      const filledQuantity = parseFloat(order.filledQuantity);

      // Validate and update price
      if (price !== undefined && price !== null) {
        const newPrice = parseFloat(price);
        if (isNaN(newPrice) || newPrice <= 0) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: 'Invalid price value'
          });
        }
        updates.price = newPrice;
      }

      // Validate and update quantity
      if (quantity !== undefined && quantity !== null) {
        const newQuantity = parseFloat(quantity);
        if (isNaN(newQuantity) || newQuantity <= 0) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: 'Invalid quantity value'
          });
        }

        // Can't set quantity less than already filled
        if (newQuantity < filledQuantity) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: `Cannot set quantity below filled amount (${filledQuantity})`
          });
        }

        // Validate against token limits
        if (newQuantity < parseFloat(order.token.minTradeAmount) || 
            newQuantity > parseFloat(order.token.maxTradeAmount)) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: `Quantity must be between ${order.token.minTradeAmount} and ${order.token.maxTradeAmount}`
          });
        }

        updates.quantity = newQuantity;
      }

      // Update stop price if provided
      if (stopPrice !== undefined && stopPrice !== null) {
        const newStopPrice = parseFloat(stopPrice);
        if (isNaN(newStopPrice) || newStopPrice <= 0) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: 'Invalid stop price value'
          });
        }
        updates.stopPrice = newStopPrice;
      }

      // Calculate new locked balance if quantity or price changed
      const finalPrice = updates.price !== undefined ? updates.price : oldPrice;
      const finalQuantity = updates.quantity !== undefined ? updates.quantity : oldQuantity;
      
      if (updates.price !== undefined || updates.quantity !== undefined) {
        const remainingQuantity = finalQuantity - filledQuantity;
        const oldRemainingQuantity = oldQuantity - filledQuantity;

        if (order.side === 'buy') {
          // Adjust locked USDT
          const usdtToken = await Token.findOne({ where: { symbol: 'USDT' } });
          if (usdtToken) {
            const usdtWallet = await Wallet.findOne({
              where: { userId: order.userId, tokenId: usdtToken.id },
              transaction: t
            });

            if (usdtWallet) {
              const fee = parseFloat(process.env.TRADING_FEE_PERCENT || 0.12) / 100;
              const oldLockedAmount = oldRemainingQuantity * oldPrice * (1 + fee);
              const newLockedAmount = remainingQuantity * finalPrice * (1 + fee);
              const lockDifference = newLockedAmount - oldLockedAmount;

              const availableUSDT = parseFloat(usdtWallet.balance) - parseFloat(usdtWallet.lockedBalance);
              if (lockDifference > 0 && availableUSDT < lockDifference) {
                await t.rollback();
                return res.status(400).json({
                  success: false,
                  message: `Insufficient USDT balance for update. Need additional $${lockDifference.toFixed(2)}`
                });
              }

              await usdtWallet.update({
                lockedBalance: parseFloat(usdtWallet.lockedBalance) + lockDifference
              }, { transaction: t });
            }
          }
        } else {
          // Adjust locked tokens
          const wallet = await Wallet.findOne({
            where: { userId: order.userId, tokenId: order.tokenId },
            transaction: t
          });

          if (wallet) {
            const lockDifference = remainingQuantity - oldRemainingQuantity;
            const availableTokens = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);
            
            if (lockDifference > 0 && availableTokens < lockDifference) {
              await t.rollback();
              return res.status(400).json({
                success: false,
                message: `Insufficient token balance for update. Need additional ${lockDifference.toFixed(4)} ${order.token.symbol}`
              });
            }

            await wallet.update({
              lockedBalance: parseFloat(wallet.lockedBalance) + lockDifference
            }, { transaction: t });
          }
        }

        // Recalculate total value
        updates.totalValue = finalQuantity * finalPrice;
      }

      // Apply updates
      await order.update(updates, { transaction: t });
      await order.reload({ transaction: t, include: [{ model: Token, as: 'token' }] });

      await t.commit();

      res.json({
        success: true,
        message: 'Order updated successfully',
        data: order
      });
    } catch (error) {
      await t.rollback();
      console.error('❌ Update order error:', error);
      next(error);
    }
  }

  // Cancel order
  async cancelOrder(req, res, next) {
    const t = await sequelize.transaction();
    
    try {
      const order = await Order.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!order) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Reload with lock to prevent race conditions with matching engine
      await order.reload({ transaction: t, lock: t.LOCK.UPDATE });

      if (order.status === 'filled' || order.status === 'cancelled') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Order cannot be cancelled (current status: ${order.status})`
        });
      }

      // Release locked funds based on order side
      if (order.side === 'sell') {
        // Release locked tokens for sell orders
        const wallet = await Wallet.findOne({
          where: {
            userId: order.userId,
            tokenId: order.tokenId
          },
          transaction: t
        });

        if (wallet) {
          const remainingQty = parseFloat(order.quantity) - parseFloat(order.filledQuantity);
          await wallet.update({
            lockedBalance: Math.max(0, parseFloat(wallet.lockedBalance) - remainingQty)
          }, { transaction: t });
          console.log(`✅ Released ${remainingQty} locked tokens for cancelled sell order`);
        }
      } else {
        // Release locked USDT for buy orders
        const usdtToken = await Token.findOne({ where: { symbol: 'USDT' } });
        if (usdtToken) {
          const usdtWallet = await Wallet.findOne({
            where: {
              userId: order.userId,
              tokenId: usdtToken.id
            },
            transaction: t
          });

          if (usdtWallet) {
            const remainingQty = parseFloat(order.quantity) - parseFloat(order.filledQuantity);
            const orderPrice = parseFloat(order.price);
            const totalValue = remainingQty * orderPrice;
            const fee = totalValue * (parseFloat(process.env.TRADING_FEE_PERCENT || 0.12) / 100);
            const lockedAmount = totalValue + fee;
            
            await usdtWallet.update({
              lockedBalance: Math.max(0, parseFloat(usdtWallet.lockedBalance) - lockedAmount)
            }, { transaction: t });
            console.log(`✅ Released $${lockedAmount.toFixed(2)} locked USDT for cancelled buy order`);
          }
        }
      }

      await order.update({
        status: 'cancelled',
        cancelledAt: new Date()
      }, { transaction: t });

      await t.commit();

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: order
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }
}

module.exports = new OrderController();
