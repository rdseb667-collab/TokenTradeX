const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'tokentradex-api' },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all errors to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    // Write trade-specific logs
    new winston.transports.File({
      filename: path.join(logsDir, 'trades.log'),
      level: 'info',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Helper functions for specific log types
logger.logTrade = function(tradeData) {
  this.info('Trade executed', {
    type: 'trade',
    ...tradeData
  });
};

logger.logOrder = function(orderData) {
  this.info('Order created', {
    type: 'order',
    ...orderData
  });
};

logger.logAuth = function(authData) {
  this.info('Authentication event', {
    type: 'auth',
    ...authData
  });
};

logger.logSecurity = function(securityData) {
  this.warn('Security event', {
    type: 'security',
    ...securityData
  });
};

logger.logPerformance = function(perfData) {
  this.info('Performance metric', {
    type: 'performance',
    ...perfData
  });
};

module.exports = logger;
