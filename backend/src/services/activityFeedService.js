const { Trade, User, Token } = require('../models');
const { Op } = require('sequelize');

/**
 * Live Activity Feed Service
 * Shows real-time trading activity for social proof
 */
class ActivityFeedService {
  constructor() {
    this.recentActivities = [];
    this.maxActivities = 100;
  }

  /**
   * Add trade to activity feed
   */
  async addTradeActivity(trade) {
    const activity = {
      type: 'trade',
      timestamp: new Date(),
      symbol: trade.tokenSymbol,
      side: trade.side || 'buy',
      quantity: parseFloat(trade.quantity),
      price: parseFloat(trade.price),
      value: parseFloat(trade.totalValue),
      username: `User${trade.buyerId.toString().slice(-4)}` // Anonymized
    };

    this.recentActivities.unshift(activity);
    
    // Keep only recent activities
    if (this.recentActivities.length > this.maxActivities) {
      this.recentActivities = this.recentActivities.slice(0, this.maxActivities);
    }

    return activity;
  }

  /**
   * Get recent activities
   */
  getRecentActivities(limit = 20) {
    return this.recentActivities.slice(0, limit);
  }

  /**
   * Get trading statistics
   */
  async getTradingStats() {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);

    const trades = await Trade.findAll({
      where: {
        createdAt: {
          [Op.gte]: last24h
        }
      }
    });

    const totalVolume = trades.reduce((sum, t) => sum + parseFloat(t.totalValue), 0);
    const totalTrades = trades.length;
    const activeTokens = [...new Set(trades.map(t => t.tokenSymbol))].length;

    // Calculate average trade size
    const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;

    return {
      last24h: {
        totalVolume,
        totalTrades,
        activeTokens,
        avgTradeSize
      }
    };
  }

  /**
   * Get leaderboard (top traders by volume)
   */
  async getLeaderboard(timeframe = '24h', limit = 10) {
    const now = new Date();
    let startDate;

    switch(timeframe) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 24 * 60 * 60 * 1000);
    }

    const trades = await Trade.findAll({
      where: {
        createdAt: {
          [Op.gte]: startDate
        }
      },
      include: [
        { model: User, as: 'buyer', attributes: ['id', 'username'] },
        { model: User, as: 'seller', attributes: ['id', 'username'] }
      ]
    });

    // Aggregate volume by user
    const userVolumes = {};

    trades.forEach(trade => {
      const buyerId = trade.buyerId;
      const sellerId = trade.sellerId;
      const volume = parseFloat(trade.totalValue);

      userVolumes[buyerId] = (userVolumes[buyerId] || 0) + volume;
      userVolumes[sellerId] = (userVolumes[sellerId] || 0) + volume;
    });

    // Sort and get top traders
    const leaderboard = Object.entries(userVolumes)
      .map(([userId, volume]) => ({
        userId: parseInt(userId),
        volume,
        username: `Trader${userId.slice(-4)}` // Anonymized
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);

    return leaderboard;
  }
}

module.exports = new ActivityFeedService();
