const fractionalShareService = require('../services/fractionalShareService');

class FractionalShareController {
  
  /**
   * POST /api/fractional-shares/create
   * Create new fractional stock token
   */
  async createFractionalStock(req, res, next) {
    try {
      const result = await fractionalShareService.createFractionalStock(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/fractional-shares/buy
   * Buy fractional shares (0.01 shares vs full $1,000)
   */
  async buyFractionalShares(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await fractionalShareService.buyFractionalShares({
        userId,
        ...req.body
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/fractional-shares/:tokenId/dividends
   * Distribute dividends proportionally
   */
  async distributeDividends(req, res, next) {
    try {
      const { tokenId } = req.params;
      const result = await fractionalShareService.distributeDividends({
        tokenId,
        ...req.body
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PUT /api/fractional-shares/:tokenId/valuation
   * Update real-time valuation (vs quarterly reports)
   */
  async updateValuation(req, res, next) {
    try {
      const { tokenId } = req.params;
      const result = await fractionalShareService.updateRealTimeValuation({
        tokenId,
        ...req.body
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/fractional-shares/holdings
   * Get user's fractional holdings
   */
  async getUserHoldings(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await fractionalShareService.getUserFractionalHoldings(userId);
      res.json(result);
    } catch (error) {
      console.error('Fractional holdings error:', error);
      res.json({
        success: true,
        holdings: [],
        totalValue: 0
      });
    }
  }
  
  /**
   * GET /api/fractional-shares/compare/:pricePerShare
   * Compare traditional vs tokenized investing
   */
  async getComparison(req, res, next) {
    try {
      const { pricePerShare } = req.params;
      const comparison = fractionalShareService.getComparisonStats(parseFloat(pricePerShare));
      res.json({
        success: true,
        comparison
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/fractional-shares/quick-create/popular
   * Quick create popular stocks (AAPL, TSLA, NVDA, etc.)
   */
  async quickCreatePopularStocks(req, res, next) {
    try {
      const popularStocks = [
        { ticker: 'AAPL', companyName: 'Apple Inc.', pricePerShare: 180, totalShares: 1000000, sector: 'Technology', dividendYield: 0.5 },
        { ticker: 'TSLA', companyName: 'Tesla Inc.', pricePerShare: 250, totalShares: 500000, sector: 'Automotive', dividendYield: 0 },
        { ticker: 'NVDA', companyName: 'NVIDIA Corp.', pricePerShare: 500, totalShares: 750000, sector: 'Technology', dividendYield: 0.03 },
        { ticker: 'MSFT', companyName: 'Microsoft Corp.', pricePerShare: 375, totalShares: 900000, sector: 'Technology', dividendYield: 0.8 },
        { ticker: 'GOOGL', companyName: 'Alphabet Inc.', pricePerShare: 140, totalShares: 600000, sector: 'Technology', dividendYield: 0 }
      ];
      
      const results = [];
      for (const stock of popularStocks) {
        const result = await fractionalShareService.createFractionalStock(stock);
        results.push(result);
      }
      
      res.status(201).json({
        success: true,
        message: `Created ${results.length} fractional stock tokens`,
        tokens: results
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FractionalShareController();
