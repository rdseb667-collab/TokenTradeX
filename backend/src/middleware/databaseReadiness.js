const { testConnection, sequelize } = require('../config/database');

// Track database readiness state
let isDatabaseReady = false;
let databaseCheckPromise = null;
let hasInitializedServices = false; // Track if services have been initialized

// Store references to services that need initialization
let feePoolService = null;
let cronJobService = null;
let postTradeWorker = null;
let onChainRevenueRetryWorker = null;
let revenueAggregator = null;

/**
 * Initialize database-dependent services
 * This should only be called once when database becomes available
 */
async function initializeDatabaseServices() {
  if (hasInitializedServices) {
    return;
  }

  try {
    console.log('🔄 Initializing database-dependent services...');
    
    // Sync database models
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synchronized');
    
    // Initialize fee pools
    feePoolService = require('../services/feePoolService');
    await feePoolService.initializePools();
    console.log('✅ Fee pools initialized');
    
    // Initialize cron jobs
    cronJobService = require('../services/cronJobService');
    cronJobService.start();
    console.log('✅ Cron jobs started');
    
    // Initialize post-trade worker
    postTradeWorker = require('../services/postTradeWorker');
    await postTradeWorker.start();
    console.log('✅ Post-trade worker started');
    
    // Initialize on-chain revenue retry worker
    onChainRevenueRetryWorker = require('../services/onChainRevenueRetryWorker');
    await onChainRevenueRetryWorker.start();
    console.log('✅ On-chain revenue retry worker started');
    
    // Initialize revenue aggregator
    revenueAggregator = require('../jobs/revenueAggregator');
    revenueAggregator.startPeriodic(5 * 60 * 1000);
    console.log('✅ Revenue aggregator started');
    
    hasInitializedServices = true;
    console.log('🎉 All database-dependent services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database services:', error.message);
  }
}

/**
 * Check database readiness
 * @returns {Promise<boolean>} True if database is ready, false otherwise
 */
async function checkDatabaseReadiness() {
  // If we're already checking, return the existing promise
  if (databaseCheckPromise) {
    return databaseCheckPromise;
  }

  // Create a new check promise
  databaseCheckPromise = testConnection()
    .then(async success => {
      const wasReady = isDatabaseReady;
      isDatabaseReady = success;
      databaseCheckPromise = null;
      
      // If database just became ready and we haven't initialized services yet
      if (success && !wasReady && !hasInitializedServices) {
        await initializeDatabaseServices();
      }
      
      return success;
    })
    .catch(() => {
      isDatabaseReady = false;
      databaseCheckPromise = null;
      return false;
    });

  return databaseCheckPromise;
}

/**
 * Database readiness middleware
 * Returns 503 if database is not ready and ALLOW_START_WITHOUT_DB is set
 */
function databaseReadinessMiddleware(req, res, next) {
  // If ALLOW_START_WITHOUT_DB is not set, proceed normally
  if (process.env.ALLOW_START_WITHOUT_DB !== 'true') {
    return next();
  }

  // If database is ready, proceed normally
  if (isDatabaseReady) {
    return next();
  }

  // Database is not ready and we're allowing startup without DB
  // Return 503 for routes that require database access
  const dbRequiredRoutes = [
    '/api/auth',
    '/api/users',
    '/api/wallet',
    '/api/orders',
    '/api/trades',
    '/api/tokens',
    '/api/referrals',
    '/api/activity',
    '/api/rewards',
    '/api/earnings',
    '/api/rwa',
    '/api/fractional-shares',
    '/api/automation',
    '/api/admin',
    '/api/staking',
    '/api/dividend-mining',
    '/api/margin',
    '/api/copy-trading',
    '/api/2fa',
    '/api/licensing',
    '/api/nft-positions',
    '/api/lending',
    '/api/white-label',
    '/api/defi',
    '/api/volume-rebates'
  ];

  // Check if this route requires database access
  for (const route of dbRequiredRoutes) {
    if (req.path.startsWith(route)) {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable - Database connection required for this endpoint',
        error: 'DATABASE_UNAVAILABLE',
        retryAfter: 30
      });
    }
  }

  // For other routes (like health check), proceed normally
  next();
}

/**
 * Initialize database readiness check
 */
async function initializeDatabaseReadiness() {
  await checkDatabaseReadiness();
  
  // Get poll interval from environment or default to 30 seconds
  const pollInterval = parseInt(process.env.DB_POLL_INTERVAL_MS) || 30000;
  
  // Periodically check database readiness
  setInterval(async () => {
    await checkDatabaseReadiness();
  }, pollInterval);
}

module.exports = {
  databaseReadinessMiddleware,
  initializeDatabaseReadiness,
  checkDatabaseReadiness,
  isDatabaseReady: () => isDatabaseReady,
  hasInitializedServices: () => hasInitializedServices, // Export function to check initialization status
  initializeDatabaseServices // Export for testing
};