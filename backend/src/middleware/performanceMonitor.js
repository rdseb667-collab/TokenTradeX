const logger = require('../services/logger');

/**
 * Performance monitoring middleware
 * Tracks request duration and logs slow requests
 */
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Capture original end function
  const originalEnd = res.end;
  
  // Override end function
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    // Log performance data
    const perfData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip
    };
    
    // Log slow requests (over 1 second)
    if (duration > 1000) {
      logger.warn('Slow request detected', perfData);
    } else if (duration > 500) {
      logger.info('Moderate request', perfData);
    }
    
    // Log errors
    if (res.statusCode >= 400) {
      logger.error('Error response', perfData);
    }
    
    // Call original end
    originalEnd.apply(res, args);
  };
  
  next();
};

module.exports = performanceMonitor;
