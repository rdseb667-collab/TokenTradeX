const User = require('./User');
const Token = require('./Token');
const Wallet = require('./Wallet');
const Order = require('./Order');
const Trade = require('./Trade');
const Transaction = require('./Transaction');
const StakingPosition = require('./StakingPosition');
const SyntheticPosition = require('./SyntheticPosition');
const DividendLottery = require('./DividendLottery');
const AuditLog = require('./AuditLog');

// User associations
User.hasMany(Wallet, { foreignKey: 'userId', as: 'wallets' });
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });

// Token associations
Token.hasMany(Wallet, { foreignKey: 'tokenId', as: 'wallets' });
Token.hasMany(Order, { foreignKey: 'tokenId', as: 'orders' });
Token.hasMany(Trade, { foreignKey: 'tokenId', as: 'trades' });
Token.hasMany(Transaction, { foreignKey: 'tokenId', as: 'transactions' });

// Wallet associations
Wallet.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Wallet.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });

// Order associations
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });

// Trade associations
Trade.belongsTo(Order, { foreignKey: 'buyOrderId', as: 'buyOrder' });
Trade.belongsTo(Order, { foreignKey: 'sellOrderId', as: 'sellOrder' });
Trade.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Trade.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Trade.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });

// Transaction associations
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Transaction.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });

// StakingPosition associations
StakingPosition.belongsTo(User, { foreignKey: 'userId', as: 'user' });
StakingPosition.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });
User.hasMany(StakingPosition, { foreignKey: 'userId', as: 'stakingPositions' });
Token.hasMany(StakingPosition, { foreignKey: 'tokenId', as: 'stakingPositions' });

// SyntheticPosition associations
SyntheticPosition.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(SyntheticPosition, { foreignKey: 'userId', as: 'syntheticPositions' });

// DividendLottery associations
DividendLottery.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });
DividendLottery.belongsTo(User, { foreignKey: 'winnerId', as: 'winner' });
Token.hasMany(DividendLottery, { foreignKey: 'tokenId', as: 'lotteries' });
User.hasMany(DividendLottery, { foreignKey: 'winnerId', as: 'lotteryWins' });

// AuditLog associations
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

module.exports = {
  User,
  Token,
  Wallet,
  Order,
  Trade,
  Transaction,
  StakingPosition,
  SyntheticPosition,
  DividendLottery,
  AuditLog
};
