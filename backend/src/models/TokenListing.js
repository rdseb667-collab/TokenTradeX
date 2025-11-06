const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TokenListing = sequelize.define('TokenListing', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'project_name'
  },
  tokenSymbol: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'token_symbol'
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'contact_email'
  },
  contactName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'contact_name'
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  whitepaper: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contractAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'contract_address'
  },
  listingTier: {
    type: DataTypes.ENUM('basic', 'premium', 'ieo'),
    allowNull: false,
    defaultValue: 'basic',
    field: 'listing_tier'
  },
  fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 50000
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'live'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paymentStatus: {
    type: DataTypes.ENUM('unpaid', 'paid', 'refunded'),
    allowNull: false,
    defaultValue: 'unpaid',
    field: 'payment_status'
  },
  paymentTxHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'payment_tx_hash'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  teamInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'team_info'
  },
  auditReport: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'audit_report'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  liveDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'live_date'
  }
}, {
  tableName: 'token_listings',
  timestamps: true,
  underscored: true
});

module.exports = TokenListing;
