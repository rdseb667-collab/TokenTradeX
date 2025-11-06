const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Wallet = sequelize.define('Wallet', {
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
  balance: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  lockedBalance: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  availableBalance: {
    type: DataTypes.VIRTUAL,
    get() {
      return parseFloat(this.balance) - parseFloat(this.lockedBalance);
    }
  }
}, {
  tableName: 'wallets',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'token_id']
    }
  ]
});

module.exports = Wallet;
