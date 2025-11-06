# TokenTradeX - Tokenized Proprietary Trading Platform

A comprehensive tokenized proprietary trading platform with real-time market data, advanced order management, and integrated wallet functionality.

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

## 🔑 Key Features

### Trading Features
- ✅ Real-time order book
- ✅ Multiple order types (Market, Limit, Stop-Loss, Take-Profit)
- ✅ Portfolio tracking
- ✅ Trade history and analytics
- ✅ Price alerts

### Security Features
- ✅ JWT authentication
- ✅ Two-factor authentication (2FA)
- ✅ Encrypted wallet storage
- ✅ Rate limiting
- ✅ SQL injection protection

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

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT + bcrypt
- **WebSocket**: Socket.io
- **Validation**: Joi
- **Testing**: Jest + Supertest

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: Redux Toolkit
- **Charts**: Recharts
- **HTTP Client**: Axios
- **WebSocket**: Socket.io-client

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
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/tokentradex
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
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

- Real-time trading volume tracking
- User activity monitoring
- System performance metrics
- Error logging and alerting
- Transaction audit trails

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## 📄 License

MIT License - See LICENSE file for details

## 📞 Support

For support, email support@tokentradex.com or join our Discord community.

---

**Built with ❤️ for the decentralized future**
