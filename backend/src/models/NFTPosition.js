const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NFTPosition = sequelize.define('NFTPosition', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // NFT Metadata
  tokenId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    comment: 'Blockchain token ID for this NFT'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'NFT name (e.g., "BTC Long 10x Leverage #123")'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Generated position chart/visualization'
  },
  
  // Original Position Details
  originalOwnerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who created this position'
  },
  currentOwnerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Current NFT holder'
  },
  
  // Position Data
  positionType: {
    type: DataTypes.ENUM('spot', 'margin', 'synthetic', 'staking'),
    allowNull: false
  },
  tokenSymbol: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Trading pair (BTC, ETH, etc.)'
  },
  entryPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false
  },
  leverage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1.0,
    comment: 'Leverage multiplier (1x - 100x)'
  },
  
  // Performance Metrics
  currentPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Latest market price'
  },
  unrealizedPnL: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Current profit/loss'
  },
  unrealizedPnLPercent: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0
  },
  
  // Marketplace Listing
  status: {
    type: DataTypes.ENUM('active', 'listed', 'sold', 'closed', 'liquidated'),
    defaultValue: 'active'
  },
  listingPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Asking price in USDT'
  },
  minOffer: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Minimum acceptable offer'
  },
  listedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Sales History
  lastSalePrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true
  },
  lastSaleDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalSales: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of times this NFT has been sold'
  },
  totalVolume: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Total trading volume of this NFT'
  },
  
  // Royalties
  royaltyPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 5.0,
    comment: 'Creator royalty on secondary sales (default 5%)'
  },
  totalRoyaltiesPaid: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Total royalties paid to original creator'
  },
  
  // Platform Fees
  platformFeePercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 2.5,
    comment: 'Platform fee on sales (Stream #9)'
  },
  totalPlatformFees: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Total fees collected by platform'
  },
  
  // Social Features
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Risk Metrics
  riskScore: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 50,
    comment: '0-100 risk score (AI calculated)'
  },
  liquidationPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Price at which position gets liquidated'
  },
  
  // Blockchain
  contractAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'NFT smart contract address'
  },
  chainId: {
    type: DataTypes.INTEGER,
    defaultValue: 56,
    comment: 'Blockchain ID (56 = BSC)'
  },
  transactionHash: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Minting transaction hash'
  }
}, {
  tableName: 'nft_positions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['current_owner_id'] },
    { fields: ['status'] },
    { fields: ['position_type'] },
    { fields: ['token_symbol'] },
    { fields: ['listing_price'] }
  ]
});

module.exports = NFTPosition;
