const { Token, Wallet } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class RWAController {
  
  constructor() {
    // Bind all methods to this instance
    this.createRWAToken = this.createRWAToken.bind(this);
    this.createStockToken = this.createStockToken.bind(this);
    this.createCommodityToken = this.createCommodityToken.bind(this);
    this.createRealEstateToken = this.createRealEstateToken.bind(this);
    this.getAllRWATokens = this.getAllRWATokens.bind(this);
    this.getTokensByCategory = this.getTokensByCategory.bind(this);
    this.updateValuation = this.updateValuation.bind(this);
    this.getMarketStats = this.getMarketStats.bind(this);
    this.distributeDividends = this.distributeDividends.bind(this);
  }
  
  // Asset categories matching smart contract
  ASSET_CATEGORIES = {
    EQUITY: 0,
    COMMODITY: 1,
    REAL_ESTATE: 2,
    FIXED_INCOME: 3,
    ART_COLLECTIBLE: 4,
    INTELLECTUAL_PROPERTY: 5,
    CARBON_CREDIT: 6,
    REVENUE_STREAM: 7,
    DERIVATIVE: 8,
    CUSTOM: 9
  };

  /**
   * Create a new RWA token
   */
  async createRWAToken(req, res, next) {
    const t = await sequelize.transaction();
    
    try {
      const {
        assetName,
        symbol,
        category,
        totalValue,
        totalSupply,
        description,
        requiresKYC = true,
        dividendsEnabled = false,
        underlyingAssetDetails
      } = req.body;

      // Validate category
      if (!Object.keys(this.ASSET_CATEGORIES).includes(category)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid asset category'
        });
      }

      // Create token in database
      const token = await Token.create({
        name: assetName,
        symbol: symbol,
        totalSupply: totalSupply,
        currentPrice: totalValue / totalSupply,
        marketCap: totalValue,
        volume24h: 0,
        priceChange24h: 0,
        isActive: true,
        // RWA specific fields
        assetCategory: category,
        requiresKYC: requiresKYC,
        dividendsEnabled: dividendsEnabled,
        underlyingAsset: underlyingAssetDetails,
        description: description
      }, { transaction: t });

      await t.commit();

      res.status(201).json({
        success: true,
        message: `RWA token created: ${assetName}`,
        data: token
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }

  /**
   * Quick create stock token
   */
  async createStockToken(req, res, next) {
    try {
      const { stockTicker, pricePerShare, totalShares, companyName } = req.body;

      const assetName = `Tokenized ${companyName || stockTicker}`;
      const symbol = `x${stockTicker}`;
      const totalValue = pricePerShare * totalShares;
      const totalSupply = totalShares * 1000; // 1000 tokens per share for fractional

      // Create using main method
      req.body = {
        assetName,
        symbol,
        category: 'EQUITY',
        totalValue,
        totalSupply,
        description: `Tokenized ${stockTicker} stock - fractional ownership of real equity`,
        requiresKYC: true,
        dividendsEnabled: true,
        underlyingAssetDetails: {
          type: 'stock',
          ticker: stockTicker,
          exchange: 'NYSE/NASDAQ',
          pricePerShare,
          totalShares
        }
      };

      return this.createRWAToken(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Quick create commodity token (Gold, Silver, Oil, etc.)
   */
  async createCommodityToken(req, res, next) {
    try {
      const { commodityName, pricePerUnit, totalUnits, unit = 'oz' } = req.body;

      const symbol = `x${commodityName.toUpperCase()}`;
      const totalValue = pricePerUnit * totalUnits;
      const totalSupply = totalUnits * 10000; // 10,000 tokens per unit for precision

      req.body = {
        assetName: `Tokenized ${commodityName}`,
        symbol,
        category: 'COMMODITY',
        totalValue,
        totalSupply,
        description: `Physical ${commodityName} backed token - 1 token = ${1/10000} ${unit}`,
        requiresKYC: false,
        dividendsEnabled: false,
        underlyingAssetDetails: {
          type: 'commodity',
          commodity: commodityName,
          unit,
          pricePerUnit,
          totalUnits,
          storageLocation: 'Secure vault'
        }
      };

      return this.createRWAToken(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Quick create real estate token
   */
  async createRealEstateToken(req, res, next) {
    try {
      const { propertyAddress, propertyValue, rentalIncome, propertyType } = req.body;

      const totalSupply = propertyValue / 100; // $100 per token

      req.body = {
        assetName: `Property: ${propertyAddress}`,
        symbol: 'xRE',
        category: 'REAL_ESTATE',
        totalValue: propertyValue,
        totalSupply,
        description: `Fractional ownership of ${propertyAddress}`,
        requiresKYC: true,
        dividendsEnabled: true,
        underlyingAssetDetails: {
          type: 'real_estate',
          address: propertyAddress,
          propertyType,
          value: propertyValue,
          monthlyRentalIncome: rentalIncome || 0
        }
      };

      return this.createRWAToken(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all RWA tokens
   */
  async getAllRWATokens(req, res, next) {
    try {
      const { category } = req.query;

      const where = { assetCategory: { [Op.ne]: null } };
      if (category) {
        where.assetCategory = category;
      }

      const tokens = await Token.findAll({
        where,
        order: [['marketCap', 'DESC']]
      });

      // Calculate total market cap
      const totalMarketCap = tokens.reduce((sum, t) => sum + parseFloat(t.marketCap || 0), 0);

      res.json({
        success: true,
        count: tokens.length,
        totalMarketCap,
        data: tokens
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get RWA token by category
   */
  async getTokensByCategory(req, res, next) {
    try {
      const { category } = req.params;

      if (!Object.keys(this.ASSET_CATEGORIES).includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }

      const tokens = await Token.findAll({
        where: { assetCategory: category },
        order: [['marketCap', 'DESC']]
      });

      res.json({
        success: true,
        category,
        count: tokens.length,
        data: tokens
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update asset valuation (from oracle or manual)
   */
  async updateValuation(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { tokenId } = req.params;
      const { newValue, source = 'manual' } = req.body;

      const token = await Token.findByPk(tokenId, { transaction: t });
      if (!token) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      const oldValue = parseFloat(token.marketCap);
      const priceChange = ((newValue - oldValue) / oldValue) * 100;

      await token.update({
        marketCap: newValue,
        currentPrice: newValue / parseFloat(token.totalSupply),
        priceChange24h: priceChange
      }, { transaction: t });

      await t.commit();

      res.json({
        success: true,
        message: 'Valuation updated',
        data: {
          token,
          oldValue,
          newValue,
          priceChange: priceChange.toFixed(2) + '%',
          source
        }
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }

  /**
   * Get market stats for all RWA
   */
  async getMarketStats(req, res, next) {
    try {
      const stats = {
        byCategory: {},
        totalMarketCap: 0,
        totalTokens: 0,
        total24hVolume: 0
      };

      // Get tokens by category
      for (const [categoryName, categoryId] of Object.entries(this.ASSET_CATEGORIES)) {
        const tokens = await Token.findAll({
          where: { assetCategory: categoryName }
        });

        const categoryMarketCap = tokens.reduce((sum, t) => sum + parseFloat(t.marketCap || 0), 0);
        const categoryVolume = tokens.reduce((sum, t) => sum + parseFloat(t.volume24h || 0), 0);

        stats.byCategory[categoryName] = {
          count: tokens.length,
          marketCap: categoryMarketCap,
          volume24h: categoryVolume
        };

        stats.totalMarketCap += categoryMarketCap;
        stats.totalTokens += tokens.length;
        stats.total24hVolume += categoryVolume;
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Distribute dividends/yields
   */
  async distributeDividends(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { tokenId } = req.params;
      const { totalAmount, period = 'monthly' } = req.body;

      const token = await Token.findByPk(tokenId, { transaction: t });
      if (!token || !token.dividendsEnabled) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Token does not support dividends'
        });
      }

      const perToken = totalAmount / parseFloat(token.totalSupply);

      // Get all holders
      const wallets = await Wallet.findAll({
        where: { tokenId, balance: { $gt: 0 } },
        transaction: t
      });

      // Distribute proportionally
      for (const wallet of wallets) {
        const userShare = parseFloat(wallet.balance) * perToken;
        // In production, create dividend claim records
        console.log(`Dividend: User ${wallet.userId} gets $${userShare.toFixed(2)}`);
      }

      await t.commit();

      res.json({
        success: true,
        message: `Distributed $${totalAmount} in ${period} dividends`,
        data: {
          totalAmount,
          perToken,
          holders: wallets.length
        }
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }
}

module.exports = new RWAController();
