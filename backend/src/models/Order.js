const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  tokenId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tokens',
      key: 'id'
    }
  },
  orderType: {
    type: DataTypes.ENUM('market', 'limit', 'stop_loss', 'take_profit'),
    allowNull: false
  },
  side: {
    type: DataTypes.ENUM('buy', 'sell'),
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true // null for market orders
  },
  quantity: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  filledQuantity: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  remainingQuantity: {
    type: DataTypes.VIRTUAL,
    get() {
      return parseFloat(this.quantity) - parseFloat(this.filledQuantity);
    }
  },
  tokenSymbol: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.Token?.symbol || null;
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'partial', 'filled', 'cancelled', 'rejected'),
    defaultValue: 'pending'
  },
  stopPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true // for stop-loss and take-profit orders
  },
  totalValue: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0
  },
  fee: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0
  },
  filledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  idempotencyKey: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Client-provided key for idempotent order creation'
  }
}, {
  tableName: 'orders',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['token_id'] },
    { fields: ['status'] },
    { fields: ['created_at'] },
    { fields: ['user_id', 'idempotency_key'], unique: true, name: 'orders_user_idempotency_unique' }
  ]
});

module.exports = Order;
