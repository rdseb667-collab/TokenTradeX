const { Trade, Token, User, Order } = require('../models');
const { Op } = require('sequelize');

class TradeController {
  // Get user's trade history
  async getUserTrades(req, res, next) {
    try {
      const { tokenSymbol, limit = 50, offset = 0 } = req.query;
      const userId = req.user.id;
      
      const where = {
        [Op.or]: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      };
      
      if (tokenSymbol) {
        where.tokenSymbol = tokenSymbol;
      }

      const trades = await Trade.findAll({
        where,
        order: [['executedAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Calculate trade statistics
      const stats = {
        totalTrades: trades.length,
        totalVolume: trades.reduce((sum, t) => sum + parseFloat(t.totalValue), 0),
        totalFeesPaid: trades.reduce((sum, t) => {
          const userFee = t.buyerId === userId ? parseFloat(t.buyerFee) : parseFloat(t.sellerFee);
          return sum + userFee;
        }, 0)
      };

      res.json({
        success: true,
        count: trades.length,
        stats,
        data: trades
      });
    } catch (error) {
      next(error);
    }
  }

  // Get trade by ID
  async getTradeById(req, res, next) {
    try {
      const { id } = req.params;
      
      const trade = await Trade.findByPk(id);
      
      if (!trade) {
        return res.status(404).json({
          success: false,
          message: 'Trade not found'
        });
      }
      
      // Check if user is part of this trade
      if (trade.buyerId !== req.user.id && trade.sellerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: trade
      });
    } catch (error) {
      next(error);
    }
  }

  // Get market trades (recent trades for a token)
  async getMarketTrades(req, res, next) {
    try {
      const { symbol } = req.params;
      const { limit = 50 } = req.query;
      
      const trades = await Trade.findAll({
        where: { tokenSymbol: symbol },
        order: [['executedAt', 'DESC']],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        count: trades.length,
        data: trades
      });
    } catch (error) {
      next(error);
    }
  }

  // Get trading analytics
  async getTradeAnalytics(req, res, next) {
    try {
      const userId = req.user.id;
      const { timeframe = '30d' } = req.query;
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch(timeframe) {
        case '24h':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      const trades = await Trade.findAll({
        where: {
          [Op.or]: [
            { buyerId: userId },
            { sellerId: userId }
          ],
          executedAt: {
            [Op.gte]: startDate
          }
        }
      });

      // Calculate analytics
      const analytics = {
        timeframe,
        totalTrades: trades.length,
        totalVolume: trades.reduce((sum, t) => sum + parseFloat(t.totalValue), 0),
        totalFees: trades.reduce((sum, t) => {
          const userFee = t.buyerId === userId ? parseFloat(t.buyerFee) : parseFloat(t.sellerFee);
          return sum + userFee;
        }, 0),
        buyTrades: trades.filter(t => t.buyerId === userId).length,
        sellTrades: trades.filter(t => t.sellerId === userId).length,
        avgTradeSize: trades.length > 0 
          ? trades.reduce((sum, t) => sum + parseFloat(t.totalValue), 0) / trades.length 
          : 0,
        tokenBreakdown: {}
      };

      // Group by token
      trades.forEach(trade => {
        if (!analytics.tokenBreakdown[trade.tokenSymbol]) {
          analytics.tokenBreakdown[trade.tokenSymbol] = {
            count: 0,
            volume: 0
          };
        }
        analytics.tokenBreakdown[trade.tokenSymbol].count++;
        analytics.tokenBreakdown[trade.tokenSymbol].volume += parseFloat(trade.totalValue);
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TradeController();
