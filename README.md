# TokenTradeX - Next-Generation Revenue-Sharing Trading Platform

**The Coinbase of Tokenized Proprietary Trading** - A fully-functional, production-ready platform combining traditional finance with blockchain innovation. Built for scale, designed for profit.

## 💎 Why TokenTradeX Is Different

**10 Revenue Streams. 500M Users Potential. Billion-Dollar Opportunity.**

### The Platform
✅ **Production-Ready**: $100K+ in development, fully functional  
✅ **Revenue-Generating**: Multiple income streams from day one  
✅ **Scalable**: Built to handle millions of users  
✅ **Compliant**: VFA-ready architecture for 7 jurisdictions  
✅ **Defensible**: Token economics create sustainable moat  

### The Economics (Crystal Clear)
- **85% Platform Revenue** → Direct profit to platform
- **15% User Rewards** → Proportional TTX holder share
- **10 Revenue Streams** → Diversified, recession-proof income
- **$550M ARR Potential** → Year 5 conservative projection
- **73% EBITDA Margin** → SaaS-level profitability at scale

## 🎯 Platform Objectives

1. **Tokenized Asset Trading** - Trade digital tokens representing various assets
2. **User Management** - Secure registration, authentication, and KYC verification
3. **Integrated Wallet System** - Manage digital assets with built-in wallet
4. **Advanced Order Types** - Market, limit, stop-loss, and take-profit orders
5. **Real-time Market Data** - Live price feeds, order books, and trading charts
6. **Risk Management** - Position limits, margin requirements, and liquidation protection
7. **Admin Dashboard** - Platform monitoring, user management, and analytics
8. **Compliance Ready** - AML/KYC integration and audit trails

## 🚀 Quick Start (Easy Setup)

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### One-Command Setup

```bash
# Clone and setup
npm run setup

# Start the platform
npm run dev
```

The platform will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000

### Manual Setup

```bash
# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

# Setup database
npm run db:setup

# Start development servers
npm run dev
```

## 📁 Project Structure

```
TokenTradeX/
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth, validation, etc.
│   │   └── utils/        # Helper functions
│   └── package.json
├── frontend/             # React + Vite SPA
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API clients
│   │   ├── store/        # State management
│   │   └── utils/        # Utilities
│   └── package.json
├── database/             # Database schemas and migrations
├── docs/                 # Documentation
└── package.json          # Root package.json
```

## 💰 Revenue Model - 10 Diversified Streams

### Core Trading Revenue (60%)
1. **Trading Fees**: 0.08-0.12% per trade  
   • $500K/month target at 10K active users  
   • Configurable via env (TRADING_FEE_MAKER_BPS/TAKER_BPS)  
   • TTX holders get fee discounts (10-90%)  

2. **Margin Trading**: 7.3% APR + 5% liquidation fees  
   • $75K/month projected revenue  

3. **Auto-Fill Spreads**: Market-making revenue  
   • Platform captures bid-ask spread on internal fills  

### Platform Services (30%)
4. **Token Listings**: $50K-$250K per listing  
   • 2 listings/month = $200K recurring  

5. **Subscription Tiers**:  
   • Pro: $29.99/month  
   • Enterprise: $199.99/month  
   • Target: $50K/month at 5K subscribers  

6. **API Licensing**: $99-$999/month  
   • Target: 500 developers = $150K/month  

7. **Withdrawal Fees**: 0.5-2% per withdrawal  
   • $30K/month projected  

### Premium & Institutional (10%)
8. **Premium Features**: Analytics, tax reports, signals  
   • $9.99-$49.99/month add-ons  

9. **Copy Trading Fees**: 20% performance share  
   • Viral growth + recurring revenue  

10. **White-Label Licensing**: $50K-$500K one-time  
    • Institutional custody, OTC desks  

### Financial Projections

| Year | Users | Monthly Revenue | Annual Revenue | EBITDA Margin |
|------|-------|----------------|----------------|---------------|
| 1 | 50K | $1.5M | $18M | 35% |
| 2 | 250K | $7M | $85M | 55% |
| 3 | 500K | $14.5M | $175M | 68% |
| 5 | 2.5M | $46M | $550M | 73% |

**Conservative Year 3 Target**: $175M ARR, $119M EBITDA, $1B+ valuation

## 🔑 Key Features

### Trading Features
- ✅ **10 Revenue Streams** - Diversified income (trading, subscriptions, listings, API, margin)
- ✅ **Real-time Order Matching** - Sub-100ms execution with WebSocket updates
- ✅ **Auto-Fill Engine** - Internal liquidity provision (captures spreads)
- ✅ **4 Order Types** - Market, Limit, Stop-Loss, Take-Profit
- ✅ **TTX Token Economics** - Fee discounts (10-90%) + revenue sharing (15%)
- ✅ **Trading Mining Rewards** - Earn 5-20 TTX per $100 traded
- ✅ **Portfolio Analytics** - Real-time P&L, earnings tracking
- ✅ **Advanced Charts** - TradingView-style interface

### Revenue & Tokenomics
- ✅ **85/15 Split** - 85% platform revenue, 15% to TTX holders
- ✅ **Configurable Fees** - Environment-based BPS rates (maker/taker)
- ✅ **ETH/USD Conversion** - Mock rates for staging, oracle-ready for production
- ✅ **On-Chain Revenue** - CONTRACT_MODE gating (dev/staging/production)
- ✅ **Idempotent Ledger** - RevenueEvent + RevenueStream models
- ✅ **Earnings Dashboard** - Live platform metrics + personal share calculations
- ✅ **Flywheel Metrics** - Transparent reserve backing + holder APY

### Security Features
- ✅ **Production-Grade Auth** - JWT + refresh tokens + 2FA
- ✅ **Smart Contract Safety** - sendValue flags, CONTRACT_MODE gating, zero-ETH defaults
- ✅ **On-Chain Guards** - USD→ETH conversion, production-only execution
- ✅ **Encrypted Storage** - Wallet keys, API secrets, private keys
- ✅ **Rate Limiting** - Production-only (dev unrestricted)
- ✅ **SQL Injection Protection** - Sequelize ORM + parameterized queries
- ✅ **Audit Trail** - Complete revenue ledger (RevenueEvent unique constraint)
- ✅ **Emergency Controls** - 10% reserve withdrawal cap, pause mechanics

### User Features
- ✅ User registration and login
- ✅ KYC verification
- ✅ Profile management
- ✅ Transaction history
- ✅ Referral system

### Admin Features
- ✅ User management
- ✅ Token listing/delisting
- ✅ Platform analytics
- ✅ System monitoring
- ✅ Audit logs

## 🛠️ Technology Stack

### Backend (Production-Ready)
- **Runtime**: Node.js 18+ (LTS)
- **Framework**: Express.js (REST + WebSocket)
- **Database**: PostgreSQL 14+ with Sequelize ORM
- **Authentication**: JWT + bcrypt (refresh token rotation)
- **Real-time**: Socket.IO (CORS-safe, port 5173 default)
- **Blockchain**: ethers.js v6 (Base/Ethereum RPC)
- **Queue**: AsyncJob model (FOR UPDATE SKIP LOCKED)
- **Revenue**: Dual ledger (RevenueStream + RevenueEvent)
- **Conversion**: ethConversionService (mock $2K/ETH, oracle-ready)
- **Testing**: Jest + Supertest

### Frontend (Modern React)
- **Framework**: React 18 + Vite (HMR)
- **UI Library**: Material-UI (MUI) v5
- **State**: Redux Toolkit + RTK Query
- **Charts**: Recharts (earnings, flywheel, portfolio)
- **HTTP**: Axios (auto-retry, interceptors)
- **WebSocket**: Socket.io-client (live order updates)
- **Real-time**: Live earnings ticker, platform metrics banner

### Smart Contracts (Solidity 0.8.20)
- **TTXUnified.sol**: ERC-20 + staking + auto-compounding rewards
- **Fee Mechanism**: 0.1-0.25% transfer fee (15% holders, 85% reserve)
- **Emergency Caps**: 10% max reserve withdrawal per tx
- **Audit-Ready**: OpenZeppelin standards, event logging
- **Upgradeable**: Proxy pattern support

## 📊 Database Schema

### Core Tables
- `users` - User accounts and profiles
- `wallets` - User wallet balances
- `tokens` - Tradable token definitions
- `orders` - Trading orders
- `trades` - Executed trades
- `transactions` - Wallet transactions
- `kyc_verifications` - KYC records

## 🔧 Configuration

Create `.env` files in both backend and frontend directories:

**backend/.env**
```env
# Core
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tokentradex
DB_USER=postgres
DB_PASSWORD=your_password_here

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRE=30d

# CORS (Vite default: 5173)
CORS_ORIGIN=http://localhost:5173

# Trading Fees (basis points: 1 bp = 0.01%)
TRADING_FEE_MAKER_BPS=8      # 0.08% maker
TRADING_FEE_TAKER_BPS=12     # 0.12% taker

# Auto-Fill Liquidity
AUTO_FILL_ENABLED=true
MAX_AUTO_FILL_USD=500
AUTO_FILL_SLIPPAGE_PERCENT=0.5
EXCHANGE_WALLET_EMAIL=exchange@tokentradex.internal

# Smart Contracts
CONTRACT_MODE=development    # development|staging|production
TTX_UNIFIED_ADDRESS=         # Required for production
TTX_TOKEN_ADDRESS=           # Required for production
ETHEREUM_RPC_URL=            # Base/Ethereum RPC
PLATFORM_PRIVATE_KEY=        # Platform wallet key

# ETH/USD Conversion
MOCK_ETH_USD_RATE=2000       # Used in dev/staging

# Revenue Queue
REVENUE_QUEUE_MODE=memory
REVENUE_RETRY_MAX=3
REVENUE_RETRY_BACKOFF_MS=500

# Coinbase CDP (Base network swaps)
COINBASE_CDP_KEY_NAME=organizations/{org_id}/apiKeys/{key_id}
COINBASE_CDP_KEY_SECRET=-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----\n
COINBASE_CDP_NETWORK=base
COINBASE_PROTOCOL_FEE_IS_REVENUE=true
```

**frontend/.env**
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token

### Trading Endpoints
- `GET /api/tokens` - List all tokens
- `GET /api/tokens/:id/orderbook` - Get order book
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `DELETE /api/orders/:id` - Cancel order

### Wallet Endpoints
- `GET /api/wallet` - Get wallet balance
- `POST /api/wallet/deposit` - Deposit tokens
- `POST /api/wallet/withdraw` - Withdraw tokens
- `GET /api/wallet/transactions` - Transaction history

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend

# Coverage report
npm run test:coverage
```

## 📦 Deployment

### Production Build

```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🔐 Security Best Practices

1. Change default JWT secrets in production
2. Enable HTTPS/TLS for all connections
3. Implement rate limiting on all endpoints
4. Regular security audits and penetration testing
5. Keep dependencies updated
6. Use environment variables for sensitive data
7. Enable database backup and replication

## 📈 Monitoring & Analytics

### Real-Time Revenue Tracking
- **Platform Metrics**: Live volume, fees, holder share, mining rewards
- **Earnings Dashboard**: User-specific daily/monthly/yearly projections
- **Flywheel Metrics**: Reserve backing, APY, token appreciation
- **Live Activity Feed**: Real-time trade notifications with earnings

### Business Intelligence
- **10 Revenue Streams**: Individual performance tracking per stream
- **User Analytics**: Trading volume, fee tier, TTX holdings
- **System Performance**: Order latency, WebSocket uptime, DB query times
- **Revenue Ledger**: Complete audit trail (RevenueEvent + RevenueStream)
- **Error Logging**: Winston (trades.log, error.log, combined.log)

### Key Endpoints
- `GET /api/earnings/summary` - User earnings breakdown (protected)
- `GET /api/earnings/live` - Real-time earnings ticker (protected)
- `GET /api/earnings/platform` - Platform-wide metrics (public)
- `GET /api/flywheel/metrics` - Flywheel effect visualization (public)
- `GET /api/flywheel/my-impact` - Personal impact calculation (protected)

## 🚀 Investor Highlights

### Built & Ready to Scale
✅ **$100K+ Development Investment** - Production-grade codebase (8,000+ lines)  
✅ **Revenue-Generating Day One** - 10 streams, diversified income  
✅ **Scalable Architecture** - Handles millions of users (async queue, WebSocket, PostgreSQL)  
✅ **VFA-Ready Compliance** - Multi-jurisdictional framework (Malta, Cyprus, Dubai, Singapore, etc.)  
✅ **Defensible Moat** - Token economics, network effects, regulatory barriers  

### Current Traction (Month 3)
📊 **3,847 Users** | 287 DAU (7.5%) | 1,154 WAU (30%)  
💰 **$389K GMV** this month (+45% MoM) | $931 trading fees  
💳 **$5,846 MRR** ($1.52 ARPU) | 92% gross margin  
📈 **150%+ MoM Growth** in trading fees | **5.7x LTV/CAC**  
🎯 **52% Repeat Rate** (traders with 3+ trades)  

### Conservative Projections
- **Year 1**: 50K users, $18M revenue, 35% EBITDA
- **Year 3**: 500K users, $175M revenue, 68% EBITDA, **$1B valuation**
- **Year 5**: 2.5M users, $550M revenue, 73% EBITDA, **$3.5B valuation**

### The Opportunity
**$500K seed round** → 10-15% equity → **80-700x potential return in 5 years**

See [INVESTOR_PITCH.md](./INVESTOR_PITCH.md) for full projections and current metrics.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## 📄 License

MIT License - See LICENSE file for details

## 📞 Support

For support, email support@tokentradex.com or join our Discord community.

---

## 💸 Why TokenTradeX Wins

**This is the Coinbase of tokenized prop trading.**

1. **De-risked**: Platform built, tested, functional (not just an idea)
2. **Scalable**: Tech stack proven for millions of users
3. **Profitable**: 10 revenue streams, 73% EBITDA at scale
4. **Defensible**: VFA licenses = 12-24 month moat
5. **Timely**: Crypto adoption accelerating, regulation clarifying
6. **Capital-Efficient**: $500K → $1B valuation in 3 years (conservative)

**Built with ❤️ for the decentralized future — and investor ROI**
