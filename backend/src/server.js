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
const { validateRuntimeConfig } = require('./config/runtimeConfig');
const errorHandler = require('./middleware/errorHandler');
const performanceMonitor = require('./middleware/performanceMonitor');
const requestContext = require('./middleware/requestContext');
const { databaseReadinessMiddleware, initializeDatabaseReadiness } = require('./middleware/databaseReadiness');
const RealPriceService = require('./services/realPriceService');
const cronJobService = require('./services/cronJobService');
const postTradeWorker = require('./services/postTradeWorker');
const onChainRevenueRetryWorker = require('./services/onChainRevenueRetryWorker');
const revenueAggregator = require('./jobs/revenueAggregator');
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
const twoFactorRoutes = require('./routes/twoFactor');
const apiLicensingRoutes = require('./routes/api-licensing');
const nftPositionsRoutes = require('./routes/nft-positions');
const lendingRoutes = require('./routes/lending');
const whiteLabelRoutes = require('./routes/white-label');
const defiRoutes = require('./routes/defi');
const volumeRebateRoutes = require('./routes/volume-rebates');
const revenueTestRoutes = require('./routes/revenue-test');
const metricsRoutes = require('./routes/metrics');
const privacyRoutes = require('./routes/privacy');

const app = express();
const server = http.createServer(app);

// Validate runtime configuration
const { config: runtimeConfig, errors: configErrors, isValid: isConfigValid } = validateRuntimeConfig();

// Log configuration validation results
if (configErrors.length > 0) {
  console.warn('⚠️  Configuration validation warnings:', configErrors);
}

// Use validated CORS origins
const allowedOrigins = runtimeConfig.allowedOrigins;

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(requestContext);
app.use(databaseReadinessMiddleware);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

// CORS with explicit error handling
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-2FA-Token'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.use(compression());

// Body size limits to prevent DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(performanceMonitor);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting - DISABLED for development
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: runtimeConfig.rateLimitWindowMs,
    max: runtimeConfig.rateLimitMaxRequests,
    message: 'Too many requests from this IP, please try again later'
  });
  app.use('/api/', limiter);
}
// In development, no rate limiting!

// Health check
app.get('/health', async (req, res) => {
  // Check database readiness if ALLOW_START_WITHOUT_DB is set
  let databaseStatus = 'unknown';
  let databaseServicesStatus = 'unknown';
  let overallStatus = 'ok';
  let statusCode = 200;
  
  if (process.env.ALLOW_START_WITHOUT_DB === 'true') {
    const { isDatabaseReady, hasInitializedServices } = require('./middleware/databaseReadiness');
    const dbReady = isDatabaseReady();
    databaseStatus = dbReady ? 'connected' : 'disconnected';
    
    // Check if database services have been initialized
    databaseServicesStatus = dbReady && hasInitializedServices() ? 'initialized' : 'pending';
    
    // Set overall status and HTTP status code
    if (!dbReady) {
      overallStatus = 'degraded';
      statusCode = 503; // Service Unavailable
    }
  } else {
    // When not in stub mode, check actual database connection
    const dbConnected = await testConnection();
    databaseStatus = dbConnected ? 'connected' : 'disconnected';
    databaseServicesStatus = dbConnected ? 'initialized' : 'unavailable';
    
    if (!dbConnected) {
      overallStatus = 'degraded';
      statusCode = 503; // Service Unavailable
    }
  }
  
  const healthData = { 
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      connection: databaseStatus,
      services: databaseServicesStatus
    },
    features: {
      autoFill: process.env.AUTO_FILL_ENABLED === 'true',
      asyncPostTrade: process.env.ASYNC_POST_TRADE === 'true',
      contractMode: process.env.CONTRACT_MODE || 'simulation',
      revenueQueueMode: process.env.REVENUE_QUEUE_MODE || 'memory',
      rateLimitEnabled: process.env.NODE_ENV === 'production',
      cdpSwapEnabled: !!(process.env.COINBASE_CDP_KEY_NAME && process.env.COINBASE_CDP_KEY_SECRET),
      cdpNetwork: process.env.COINBASE_CDP_NETWORK || 'base',
      allowStartWithoutDb: process.env.ALLOW_START_WITHOUT_DB === 'true',
      dbPollInterval: process.env.DB_POLL_INTERVAL_MS || 30000
    }
  };
  
  // Add stub mode metadata when in stub mode
  if (process.env.ALLOW_START_WITHOUT_DB === 'true') {
    healthData.stubMode = {
      enabled: true,
      description: 'Running in stub mode - database connection is optional',
      expectedBehavior: 'API will return 503 for database-dependent endpoints when database is unavailable'
    };
  } else {
    healthData.stubMode = {
      enabled: false,
      description: 'Running in normal mode - database connection is required'
    };
  }
  
  res.status(statusCode).json(healthData);
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
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/licensing', apiLicensingRoutes);
app.use('/api/nft-positions', nftPositionsRoutes);
app.use('/api/lending', lendingRoutes);
app.use('/api/white-label', whiteLabelRoutes);
app.use('/api/defi', defiRoutes);
app.use('/api/volume-rebates', volumeRebateRoutes);
app.use('/api/revenue-test', revenueTestRoutes);
app.use('/metrics', metricsRoutes);
app.use('/api/privacy', privacyRoutes);

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

// Initialize real price service (CoinGecko - FREE!)
const realPriceService = new RealPriceService(io);
app.set('priceService', realPriceService);

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
let dbConnected = false; // Track database connection status at module level

const startServer = async () => {
  try {
    // Initialize database readiness check
    await initializeDatabaseReadiness();
    
    // Test database connection
    dbConnected = await testConnection();
    
    // If database is not connected and ALLOW_START_WITHOUT_DB is not set, exit
    if (!dbConnected && process.env.ALLOW_START_WITHOUT_DB !== 'true') {
      console.error('❌ Database connection failed and ALLOW_START_WITHOUT_DB is not set');
      process.exit(1);
    }
    
    // Only sync models if database is connected initially
    if (dbConnected) {
      await sequelize.sync({ alter: false });
      console.log('✅ Database models synchronized');
      
      // Initialize fee pools
      const feePoolService = require('./services/feePoolService');
      await feePoolService.initializePools();
      console.log('✅ Fee pools initialized');
    } else {
      console.log('⚠️  Database not connected - running in stub mode');
      console.log('🔄 Database services will be initialized automatically when database becomes available');
    }

    // Initialize smart contract services
    if (process.env.CONTRACT_MODE === 'production') {
      const ttxUnifiedService = require('./services/ttxUnifiedService');
      const ttxReserveService = require('./services/ttxReserveService');
      
      await ttxUnifiedService.initialize();
      await ttxReserveService.initialize();
      console.log('✅ Smart contract services initialized');
    } else {
      console.log('⚠️  Smart contract services in simulation mode');
    }

    // Start real price service (CoinGecko FREE API)
    await realPriceService.start();
    
    // Start automated payment cron jobs (only if database is connected initially)
    if (dbConnected) {
      cronJobService.start();
      console.log('✅ Cron jobs started');
    } else {
      console.log('⏭️  Skipping cron jobs - will start automatically when database becomes available');
    }

    // Start post-trade job worker (only if database is connected initially)
    if (dbConnected) {
      await postTradeWorker.start();
      console.log('✅ Post-trade worker started');
    } else {
      console.log('⏭️  Skipping post-trade worker - will start automatically when database becomes available');
    }

    // Start on-chain revenue retry worker (only if database is connected initially)
    if (dbConnected) {
      await onChainRevenueRetryWorker.start();
      console.log('✅ On-chain revenue retry worker started');
    } else {
      console.log('⏭️  Skipping on-chain revenue retry worker - will start automatically when database becomes available');
    }

    // Start revenue aggregator (runs every 5 minutes) (only if database is connected initially)
    if (dbConnected) {
      revenueAggregator.startPeriodic(5 * 60 * 1000);
      console.log('✅ Revenue aggregator started');
    } else {
      console.log('⏭️  Skipping revenue aggregator - will start automatically when database becomes available');
    }

    // Start server
    server.listen(PORT, () => {
      // Display feature toggles
      const autoFill = process.env.AUTO_FILL_ENABLED === 'true' ? '✅ ON' : '❌ OFF';
      const asyncPost = process.env.ASYNC_POST_TRADE === 'true' ? '✅ ON' : '❌ OFF';
      const contractMode = process.env.CONTRACT_MODE || 'simulation';
      const revenueQueue = process.env.REVENUE_QUEUE_MODE || 'memory';
      
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
║  ⚙️  Feature Toggles:                                      ║
║     • Auto-Fill: ${autoFill}                                  ║
║     • Async Post-Trade: ${asyncPost}                          ║
║     • Contract Mode: ${contractMode}                       ║
║     • Revenue Queue: ${revenueQueue}                          ║
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
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  await shutdown();
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  await shutdown();
});

// Graceful shutdown function
async function shutdown() {
  try {
    // Stop cron jobs first
    cronJobService.stop();
    console.log('✅ Cron jobs stopped');
    
    // Stop price simulator
    if (typeof realPriceService.stop === 'function') {
      realPriceService.stop();
      console.log('✅ Price simulator stopped');
    }
    
    // Stop revenue aggregator
    revenueAggregator.stopPeriodic();
    console.log('✅ Revenue aggregator stopped');
    
    // Stop on-chain revenue retry worker
    await onChainRevenueRetryWorker.stop();
    console.log('✅ On-chain revenue retry worker stopped');
    
    // Stop post-trade worker
    await postTradeWorker.stop();
    console.log('✅ Post-trade worker stopped');
    
    // Close Socket.IO connections
    if (io) {
      console.log('🔌 Closing Socket.IO connections...');
      // Close all socket connections
      for (const socket of Object.values(io.sockets.sockets)) {
        socket.disconnect(true);
      }
      console.log('✅ Socket.IO connections closed');
    }
    
    // Close HTTP server (only if it's listening)
    if (server.listening) {
      console.log('🔌 Closing HTTP server...');
      server.close(() => {
        console.log('✅ HTTP server closed');
      });
    } else {
      console.log('⏭️  HTTP server not listening, skipping close');
    }
    
    // Close database connections (only if database was connected)
    if (dbConnected) {
      console.log('🔌 Closing database connections...');
      await sequelize.close();
      console.log('✅ Database connections closed');
    } else {
      console.log('⏭️  No database connections to close');
    }
    
    // Exit after a timeout to ensure all cleanup is done
    setTimeout(() => {
      console.log('👋 Shutdown complete');
      process.exit(0);
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
}

module.exports = { app, server, io };
