const uuid = require('uuid');
const logger = require('../services/logger');

/**
 * Request Context Middleware
 * Adds correlation IDs to requests for tracing and debugging
 */

const requestContext = (req, res, next) => {
  // Generate a unique request ID
  const requestId = uuid.v4();
  
  // Add request ID to request object
  req.requestId = requestId;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Enhance logger with request context
  const originalLogMethods = {
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
    debug: logger.debug.bind(logger)
  };
  
  // Wrap logger methods to include request context
  const wrapLoggerMethod = (method) => {
    return function(message, data = {}) {
      const context = {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        ...data
      };
      
      originalLogMethods[method](message, context);
    };
  };
  
  // Override logger methods with context-aware versions
  logger.info = wrapLoggerMethod('info');
  logger.warn = wrapLoggerMethod('warn');
  logger.error = wrapLoggerMethod('error');
  logger.debug = wrapLoggerMethod('debug');
  
  // Store original methods to restore later
  req._originalLogger = originalLogMethods;
  
  // Add request context to error responses
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    // If this is an error response, add request ID
    if (data && (data.success === false || data.error)) {
      data.requestId = requestId;
    }
    
    return originalJson(data);
  };
  
  // Restore logger on response finish
  res.on('finish', () => {
    // Restore original logger methods
    logger.info = req._originalLogger.info;
    logger.warn = req._originalLogger.warn;
    logger.error = req._originalLogger.error;
    logger.debug = req._originalLogger.debug;
  });
  
  next();
};

module.exports = requestContext;