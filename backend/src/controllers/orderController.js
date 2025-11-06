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
      const { tokenId, orderType, side, price, quantity, stopPrice } = req.body;
      const userId = req.user.id;

      // Validate token
      const token = await Token.findByPk(tokenId);
      if (!token || !token.isTradingEnabled) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Token not available for trading'
        });
      }

      // Validate quantity limits
      if (quantity < parseFloat(token.minTradeAmount) || quantity > parseFloat(token.maxTradeAmount)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Order quantity must be between ${token.minTradeAmount} and ${token.maxTradeAmount}`
        });
      }

      // Calculate order value
      const orderPrice = orderType === 'market' ? parseFloat(token.currentPrice) : price;
      const totalValue = orderPrice * quantity;
      const fee = totalValue * (parseFloat(process.env.TRADING_FEE_PERCENT) / 100);

      // WHALE PROTECTION: Check circuit breaker
      const circuitBreakerCheck = await whaleProtectionService.checkCircuitBreaker(tokenId, orderPrice);
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
        const positionCheck = await whaleProtectionService.checkPositionLimit(userId, tokenId, quantity);
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

        if (availableUSDT < requiredUSDT) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: `Insufficient USDT balance. Required: $${requiredUSDT.toFixed(2)}, Available: $${availableUSDT.toFixed(2)}`
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

        if (!wallet || parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance) < quantity) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: 'Insufficient token balance'
          });
        }

        // Lock the tokens
        await wallet.update({
          lockedBalance: parseFloat(wallet.lockedBalance) + quantity
        }, { transaction: t });
      }

      // Create order
      const order = await Order.create({
        userId,
        tokenId,
        orderType,
        side,
        price: orderPrice,
        quantity,
        stopPrice,
        totalValue,
        fee,
        status: orderType === 'market' ? 'pending' : 'pending'
      }, { transaction: t });

      await t.commit();

      // Process order through matching engine
      setImmediate(async () => {
        try {
          await orderMatchingService.processOrder(order);
        } catch (error) {
          console.error('Order matching error:', error);
        }
      });

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order
      });
    } catch (error) {
      await t.rollback();
      next(error);
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

  // Cancel order
  async cancelOrder(req, res, next) {
    const t = await sequelize.transaction();
    
    try {
      const order = await Order.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        },
        transaction: t
      });

      if (!order) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.status === 'filled' || order.status === 'cancelled') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled'
        });
      }

      // Release locked tokens for sell orders
      if (order.side === 'sell') {
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
