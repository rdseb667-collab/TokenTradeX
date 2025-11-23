const { Token, Order } = require('../models');
const { Op } = require('sequelize');

class TokenController {
  // Get all tokens
  async getAllTokens(req, res, next) {
    try {
      const { isActive, isTradingEnabled, search } = req.query;
      
      const where = {};
      
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }
      
      if (isTradingEnabled !== undefined) {
        where.isTradingEnabled = isTradingEnabled === 'true';
      }
      
      if (search) {
        where[Op.or] = [
          { symbol: { [Op.iLike]: `%${search}%` } },
          { name: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const tokens = await Token.findAll({
        where,
        order: [['marketCap', 'DESC']]
      });

      res.json({
        success: true,
        count: tokens.length,
        data: tokens
      });
    } catch (error) {
      next(error);
    }
  }

  // Get token by ID
  async getTokenById(req, res, next) {
    try {
      const token = await Token.findByPk(req.params.id);

      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      res.json({
        success: true,
        data: token
      });
    } catch (error) {
      next(error);
    }
  }

  // Get order book for a token
  async getOrderBook(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 20 } = req.query;

      const token = await Token.findByPk(id);
      
      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      // Get buy orders (bids)
      const buyOrders = await Order.findAll({
        where: {
          tokenId: id,
          side: 'buy',
          status: { [Op.in]: ['pending', 'partial'] }
        },
        order: [['price', 'DESC']],
        limit: parseInt(limit)
      });

      // Get sell orders (asks)
      const sellOrders = await Order.findAll({
        where: {
          tokenId: id,
          side: 'sell',
          status: { [Op.in]: ['pending', 'partial'] }
        },
        order: [['price', 'ASC']],
        limit: parseInt(limit)
      });

      // Aggregate orders by price level
      const aggregateBids = TokenController.aggregateOrders(buyOrders);
      const aggregateAsks = TokenController.aggregateOrders(sellOrders);

      res.json({
        success: true,
        data: {
          token,
          bids: aggregateBids,
          asks: aggregateAsks,
          spread: aggregateAsks.length > 0 && aggregateBids.length > 0
            ? parseFloat(aggregateAsks[0].price) - parseFloat(aggregateBids[0].price)
            : 0
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper method to aggregate orders
  static aggregateOrders(orders) {
    const priceMap = new Map();

    orders.forEach(order => {
      const price = parseFloat(order.price);
      const quantity = parseFloat(order.quantity) - parseFloat(order.filledQuantity || 0);

      if (priceMap.has(price)) {
        priceMap.set(price, priceMap.get(price) + quantity);
      } else {
        priceMap.set(price, quantity);
      }
    });

    return Array.from(priceMap.entries())
      .map(([price, quantity]) => ({ price, quantity }))
      .sort((a, b) => b.price - a.price);
  }

  // Create token (admin only)
  async createToken(req, res, next) {
    try {
      const token = await Token.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Token created successfully',
        data: token
      });
    } catch (error) {
      next(error);
    }
  }

  // Update token (admin only)
  async updateToken(req, res, next) {
    try {
      const token = await Token.findByPk(req.params.id);

      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      await token.update(req.body);

      res.json({
        success: true,
        message: 'Token updated successfully',
        data: token
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete token (admin only)
  async deleteToken(req, res, next) {
    try {
      const token = await Token.findByPk(req.params.id);

      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      await token.destroy();

      res.json({
        success: true,
        message: 'Token deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TokenController();
