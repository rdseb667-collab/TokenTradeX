const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const performanceMonitor = require('./middleware/performanceMonitor');
const PriceSimulatorService = require('./services/priceSimulatorService');
const cronJobService = require('./services/cronJobService');
const logger = require('./services/logger');

// Import routes
const authRoutes = require('./routes/auth');
const tokenRoutes = require('./routes/tokens');
const orderRoutes = require('./routes/orders');
const walletRoutes = require('./routes/wallet');
const priceRoutes = require('./routes/prices');
const tradeRoutes = require('./routes/trades');
const referralRoutes = require('./routes/referrals');
const activityRoutes = require('./routes/activity');
const flywheelRoutes = require('./routes/flywheel');
const dexRoutes = require('./routes/dex');
const ttxUnifiedRoutes = require('./routes/ttx-unified');
const subscriptionRoutes = require('./routes/subscriptions');
const apiKeyRoutes = require('./routes/api-keys');
const tokenListingRoutes = require('./routes/token-listings');
const rewardRoutes = require('./routes/rewards');
const earningsRoutes = require('./routes/earnings');
const whaleProtectionRoutes = require('./routes/whale-protection');
const rwaRoutes = require('./routes/rwa');
const fractionalShareRoutes = require('./routes/fractional-shares');
const automationRoutes = require('./routes/automation');
const adminRoutes = require('./routes/admin');
const stakingRoutes = require('./routes/staking');
const dividendMiningRoutes = require('./routes/dividend-mining');
const marginRoutes = require('./routes/margin');
const copyTradingRoutes = require('./routes/copy-trading');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(performanceMonitor);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting - DISABLED for development
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later'
  });
  app.use('/api/', limiter);
}
// In development, no rate limiting!

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/flywheel', flywheelRoutes);
app.use('/api/dex', dexRoutes);
app.use('/api/ttx-unified', ttxUnifiedRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/token-listings', tokenListingRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/whale-protection', whaleProtectionRoutes);
app.use('/api/rwa', rwaRoutes);
app.use('/api/fractional-shares', fractionalShareRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staking', stakingRoutes);
app.use('/api/dividend-mining', dividendMiningRoutes);
app.use('/api/margin', marginRoutes);
app.use('/api/copy-trading', copyTradingRoutes);

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe', (data) => {
    const { channel, tokenId } = data;
    socket.join(`${channel}:${tokenId}`);
    console.log(`Client ${socket.id} subscribed to ${channel}:${tokenId}`);
  });

  socket.on('unsubscribe', (data) => {
    const { channel, tokenId } = data;
    socket.leave(`${channel}:${tokenId}`);
    console.log(`Client ${socket.id} unsubscribed from ${channel}:${tokenId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to controllers
app.set('io', io);

// Initialize price simulator
const priceSimulator = new PriceSimulatorService(io);
app.set('priceSimulator', priceSimulator);

// Error handler (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Sync database models
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synchronized');

    // Start price simulator
    await priceSimulator.start();
    
    // Start automated payment cron jobs
    cronJobService.start();

    // Start server
    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          TokenTradeX API Server                           ║
║                                                           ║
║  🚀 Server running on port ${PORT}                          ║
║  🌐 Environment: ${process.env.NODE_ENV || 'development'}                     ║
║  📡 WebSocket: ws://localhost:${PORT}                       ║
║  🔗 API: http://localhost:${PORT}/api                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = { app, server, io };
