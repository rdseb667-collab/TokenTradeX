const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DividendLottery = sequelize.define('DividendLottery', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tokenId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tokens',
      key: 'id'
    }
  },
  drawDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When the lottery draw happened'
  },
  totalPool: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    comment: '10% of dividend payment goes to lottery pool'
  },
  totalParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of eligible participants'
  },
  winnerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  winnerPrize: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Prize amount won'
  },
  multiplier: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    comment: 'Prize multiplier (10x, 50x, 100x)'
  },
  winnerTickets: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of tickets winner had'
  },
  status: {
    type: DataTypes.ENUM('pending', 'drawn', 'claimed'),
    defaultValue: 'pending'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Draw details, random seed, etc.'
  }
}, {
  tableName: 'dividend_lotteries',
  timestamps: true,
  underscored: true
});

module.exports = DividendLottery;
