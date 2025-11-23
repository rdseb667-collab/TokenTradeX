const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LendingPosition = sequelize.define('LendingPosition', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Lender or Borrower
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('lending', 'borrowing'),
    allowNull: false,
    comment: 'Is user lending or borrowing?'
  },
  
  // Token being lent/borrowed
  tokenId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tokens',
      key: 'id'
    }
  },
  tokenSymbol: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // Amounts
  principal: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    comment: 'Original amount lent/borrowed'
  },
  outstanding: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    comment: 'Current amount owed (principal + interest)'
  },
  interestAccrued: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Total interest accumulated'
  },
  
  // Interest rates
  annualRate: {
    type: DataTypes.DECIMAL(8, 4),
    allowNull: false,
    comment: 'Annual interest rate (e.g., 8.5 = 8.5%)'
  },
  platformFeePercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 15,
    comment: 'Platform takes 15% of interest earned (Stream #5)'
  },
  
  // Terms
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Loan duration in days'
  },
  collateralRatio: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 150,
    comment: 'Required collateral % (150 = need $150 collateral for $100 loan)'
  },
  
  // Collateral (for borrowers)
  collateralTokenId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'tokens',
      key: 'id'
    }
  },
  collateralAmount: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Amount of collateral locked'
  },
  collateralValue: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'USD value of collateral'
  },
  liquidationPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    comment: 'Price at which collateral gets liquidated'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('active', 'repaid', 'defaulted', 'liquidated'),
    defaultValue: 'active'
  },
  
  // Dates
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  lastInterestUpdate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  repaidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Platform revenue tracking
  platformFeesCollected: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    comment: 'Total fees collected by platform from this position'
  }
}, {
  tableName: 'lending_positions',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: (position) => {
      // Set due date based on duration
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + position.duration);
      position.dueDate = dueDate;
      
      // Initialize outstanding to principal
      position.outstanding = position.principal;
    }
  }
});

module.exports = LendingPosition;
