const { sequelize } = require('../config/database');
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
const CopyTradingSubscription = require('./CopyTradingSubscription');
const ApiKey = require('./ApiKey');
const NFTPosition = require('./NFTPosition');
const LendingPosition = require('./LendingPosition');
const WhiteLabelPartner = require('./WhiteLabelPartner');
const RevenueStream = require('./RevenueStream');
const RevenueEvent = require('./RevenueEvent');
const AsyncJob = require('./AsyncJob');
const UserReward = require('./UserReward');

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

// CopyTradingSubscription associations
CopyTradingSubscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(CopyTradingSubscription, { foreignKey: 'userId', as: 'copyTradingSubscriptions' });

// ApiKey associations
ApiKey.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(ApiKey, { foreignKey: 'userId', as: 'apiKeys' });

// NFTPosition associations
NFTPosition.belongsTo(User, { foreignKey: 'originalOwnerId', as: 'originalOwner' });
NFTPosition.belongsTo(User, { foreignKey: 'currentOwnerId', as: 'currentOwner' });
User.hasMany(NFTPosition, { foreignKey: 'originalOwnerId', as: 'createdNFTs' });
User.hasMany(NFTPosition, { foreignKey: 'currentOwnerId', as: 'ownedNFTs' });

// LendingPosition associations
LendingPosition.belongsTo(User, { foreignKey: 'userId', as: 'user' });
LendingPosition.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });
LendingPosition.belongsTo(Token, { foreignKey: 'collateralTokenId', as: 'collateralToken' });
User.hasMany(LendingPosition, { foreignKey: 'userId', as: 'lendingPositions' });
Token.hasMany(LendingPosition, { foreignKey: 'tokenId', as: 'lendingPositions' });

// WhiteLabelPartner associations
WhiteLabelPartner.belongsTo(User, { foreignKey: 'userId', as: 'user' });
WhiteLabelPartner.belongsTo(ApiKey, { foreignKey: 'apiKeyId', as: 'apiKey' });
User.hasMany(WhiteLabelPartner, { foreignKey: 'userId', as: 'whiteLabelPartnerships' });
ApiKey.hasOne(WhiteLabelPartner, { foreignKey: 'apiKeyId', as: 'whiteLabelPartner' });

// RevenueEvent associations
RevenueEvent.belongsTo(RevenueStream, { foreignKey: 'streamId', as: 'stream' });
RevenueStream.hasMany(RevenueEvent, { foreignKey: 'streamId', as: 'events' });

// UserReward associations
UserReward.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(UserReward, { foreignKey: 'userId', as: 'rewards' });

module.exports = {
  sequelize,
  User,
  Token,
  Wallet,
  Order,
  Trade,
  Transaction,
  StakingPosition,
  SyntheticPosition,
  DividendLottery,
  AuditLog,
  CopyTradingSubscription,
  ApiKey,
  NFTPosition,
  LendingPosition,
  WhiteLabelPartner,
  RevenueStream,
  RevenueEvent,
  AsyncJob,
  UserReward
};
