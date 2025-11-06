const { sequelize, DataTypes } = require('../config/database');

const Token = sequelize.define('Token', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  symbol: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  totalSupply: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false
  },
  circulatingSupply: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false,
    defaultValue: 0
  },
  currentPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    defaultValue: 0
  },
  priceChange24h: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0
  },
  volume24h: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0
  },
  marketCap: {
    type: DataTypes.DECIMAL(30, 2),
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isTradingEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  minTradeAmount: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0.001
  },
  maxTradeAmount: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 1000000
  },
  contractAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // RWA specific fields
  assetCategory: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'EQUITY, COMMODITY, REAL_ESTATE, FIXED_INCOME, ART_COLLECTIBLE, etc.'
  },
  requiresKYC: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether trading this token requires KYC approval'
  },
  dividendsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether token distributes dividends/yields'
  },
  underlyingAsset: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Details about the underlying real-world asset'
  },
  oracleAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Price oracle contract address for automatic valuation'
  }
}, {
  tableName: 'tokens'
});

module.exports = Token;
