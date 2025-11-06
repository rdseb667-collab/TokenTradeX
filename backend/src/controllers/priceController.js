const priceService = require('../services/priceService');
const { Token } = require('../models');

class PriceController {
  // Get live price for a token
  async getLivePrice(req, res, next) {
    try {
      const { symbol } = req.params;
      
      const priceData = await priceService.fetchPrice(symbol);
      
      res.json({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          ...priceData
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get chart data for a token
  async getChartData(req, res, next) {
    try {
      const { symbol } = req.params;
      const { days = '1' } = req.query;
      
      const chartData = await priceService.fetchChartData(symbol, days);
      
      res.json({
        success: true,
        data: chartData
      });
    } catch (error) {
      next(error);
    }
  }

  // Get live prices for all tokens
  async getAllLivePrices(req, res, next) {
    try {
      const tokens = await Token.findAll({
        attributes: ['symbol']
      });
      
      const symbols = tokens.map(t => t.symbol);
      const prices = await priceService.fetchMultiplePrices(symbols);
      
      res.json({
        success: true,
        data: prices
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PriceController();
