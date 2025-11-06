const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Trade = sequelize.define('Trade', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  buyOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'buy_order_id'
  },
  sellOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'sell_order_id'
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'buyer_id'
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'seller_id'
  },
  tokenSymbol: {
    type: DataTypes.STRING(10),
    allowNull: false,
    field: 'token_symbol'
  },
  price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false
  },
  totalValue: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false,
    field: 'total_value'
  },
  buyerFee: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    field: 'buyer_fee'
  },
  sellerFee: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    field: 'seller_fee'
  },
  // Future: Advanced features
  tradeType: {
    type: DataTypes.ENUM('spot', 'margin', 'futures'),
    defaultValue: 'spot',
    field: 'trade_type'
  },
  // Future: For algorithmic trading tracking
  strategyId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'strategy_id'
  },
  executedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'executed_at'
  }
}, {
  tableName: 'trades',
  timestamps: true,
  indexes: [
    { fields: ['buyer_id'] },
    { fields: ['seller_id'] },
    { fields: ['token_symbol'] },
    { fields: ['executed_at'] },
    { fields: ['buy_order_id'] },
    { fields: ['sell_order_id'] }
  ]
});

module.exports = Trade;
