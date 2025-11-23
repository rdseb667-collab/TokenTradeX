const logger = require('../services/logger');

/**
 * Runtime Configuration Validator
 * Validates environment variables and applies safe defaults
 */

// Default values
const DEFAULTS = {
  CORS_ORIGIN: 'http://localhost:5173,http://localhost:5174',
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  MAX_MARKET_SLIPPAGE_BPS: 500, // 5% in basis points
  AUTO_FILL_SLIPPAGE_PERCENT: 0.5, // 0.5%
  JWT_SECRET_MIN_LENGTH: 32
};

// Validation functions
const validators = {
  corsOrigin: (origins) => {
    if (!origins || typeof origins !== 'string') {
      return { valid: false, error: 'CORS_ORIGIN must be a comma-separated string of origins' };
    }
    
    const originList = origins.split(',').map(o => o.trim());
    for (const origin of originList) {
      if (origin !== '*' && !origin.startsWith('http://') && !origin.startsWith('https://')) {
        return { valid: false, error: `Invalid CORS origin: ${origin}. Must start with http:// or https://` };
      }
    }
    
    return { valid: true, value: originList };
  },
  
  jwtSecret: (secret) => {
    if (!secret) {
      return { valid: false, error: 'JWT_SECRET is required' };
    }
    
    if (secret.length < DEFAULTS.JWT_SECRET_MIN_LENGTH) {
      return { valid: false, error: `JWT_SECRET must be at least ${DEFAULTS.JWT_SECRET_MIN_LENGTH} characters` };
    }
    
    return { valid: true, value: secret };
  },
  
  slippage: (slippageBps, paramName = 'MAX_MARKET_SLIPPAGE_BPS') => {
    const value = parseInt(slippageBps, 10);
    
    if (isNaN(value)) {
      return { valid: false, error: `${paramName} must be a valid integer` };
    }
    
    if (value < 0 || value > 10000) {
      return { valid: false, error: `${paramName} must be between 0 and 10000 basis points (0-100%)` };
    }
    
    return { valid: true, value };
  },
  
  rateLimit: (windowMs, maxRequests) => {
    const windowValue = parseInt(windowMs, 10);
    const maxValue = parseInt(maxRequests, 10);
    
    if (isNaN(windowValue) || windowValue <= 0) {
      return { valid: false, error: 'RATE_LIMIT_WINDOW_MS must be a positive integer' };
    }
    
    if (isNaN(maxValue) || maxValue <= 0) {
      return { valid: false, error: 'RATE_LIMIT_MAX_REQUESTS must be a positive integer' };
    }
    
    return { valid: true, windowMs: windowValue, maxRequests: maxValue };
  }
};

/**
 * Validate and load runtime configuration
 */
function validateRuntimeConfig() {
  const config = {};
  const errors = [];
  
  // Validate CORS origins
  const corsOrigins = process.env.CORS_ORIGIN || DEFAULTS.CORS_ORIGIN;
  const corsValidation = validators.corsOrigin(corsOrigins);
  if (corsValidation.valid) {
    config.allowedOrigins = corsValidation.value;
    logger.info('CORS origins validated', { origins: config.allowedOrigins });
  } else {
    errors.push(corsValidation.error);
    config.allowedOrigins = DEFAULTS.CORS_ORIGIN.split(',');
    logger.warn('Using default CORS origins due to validation error', { 
      error: corsValidation.error, 
      defaultOrigins: config.allowedOrigins 
    });
  }
  
  // Validate JWT secret
  const jwtSecret = process.env.JWT_SECRET;
  const jwtValidation = validators.jwtSecret(jwtSecret);
  if (jwtValidation.valid) {
    config.jwtSecret = jwtValidation.value;
    logger.info('JWT secret validated');
  } else {
    errors.push(jwtValidation.error);
    logger.error('JWT secret validation failed', { error: jwtValidation.error });
  }
  
  // Validate max market slippage
  const maxSlippage = process.env.MAX_MARKET_SLIPPAGE_BPS || DEFAULTS.MAX_MARKET_SLIPPAGE_BPS;
  const slippageValidation = validators.slippage(maxSlippage, 'MAX_MARKET_SLIPPAGE_BPS');
  if (slippageValidation.valid) {
    config.maxMarketSlippageBps = slippageValidation.value;
    logger.info('Market slippage validated', { bps: config.maxMarketSlippageBps });
  } else {
    errors.push(slippageValidation.error);
    config.maxMarketSlippageBps = DEFAULTS.MAX_MARKET_SLIPPAGE_BPS;
    logger.warn('Using default market slippage due to validation error', { 
      error: slippageValidation.error, 
      defaultBps: config.maxMarketSlippageBps 
    });
  }
  
  // Validate auto-fill slippage
  const autoFillSlippage = process.env.AUTO_FILL_SLIPPAGE_PERCENT || DEFAULTS.AUTO_FILL_SLIPPAGE_PERCENT;
  const autoFillValidation = validators.slippage(parseFloat(autoFillSlippage) * 100, 'AUTO_FILL_SLIPPAGE_PERCENT');
  if (autoFillValidation.valid) {
    config.autoFillSlippagePercent = parseFloat(autoFillSlippage);
    logger.info('Auto-fill slippage validated', { percent: config.autoFillSlippagePercent });
  } else {
    errors.push(autoFillValidation.error);
    config.autoFillSlippagePercent = DEFAULTS.AUTO_FILL_SLIPPAGE_PERCENT;
    logger.warn('Using default auto-fill slippage due to validation error', { 
      error: autoFillValidation.error, 
      defaultPercent: config.autoFillSlippagePercent 
    });
  }
  
  // Validate rate limiting
  const rateWindow = process.env.RATE_LIMIT_WINDOW_MS || DEFAULTS.RATE_LIMIT_WINDOW_MS;
  const rateMax = process.env.RATE_LIMIT_MAX_REQUESTS || DEFAULTS.RATE_LIMIT_MAX_REQUESTS;
  const rateValidation = validators.rateLimit(rateWindow, rateMax);
  if (rateValidation.valid) {
    config.rateLimitWindowMs = rateValidation.windowMs;
    config.rateLimitMaxRequests = rateValidation.maxRequests;
    logger.info('Rate limit settings validated', { 
      windowMs: config.rateLimitWindowMs, 
      maxRequests: config.rateLimitMaxRequests 
    });
  } else {
    errors.push(rateValidation.error);
    config.rateLimitWindowMs = DEFAULTS.RATE_LIMIT_WINDOW_MS;
    config.rateLimitMaxRequests = DEFAULTS.RATE_LIMIT_MAX_REQUESTS;
    logger.warn('Using default rate limit settings due to validation error', { 
      error: rateValidation.error, 
      defaultWindowMs: config.rateLimitWindowMs,
      defaultMaxRequests: config.rateLimitMaxRequests
    });
  }
  
  // Log any validation errors
  if (errors.length > 0) {
    logger.warn('Configuration validation completed with warnings', { errors });
  } else {
    logger.info('Configuration validation completed successfully');
  }
  
  return {
    config,
    errors,
    isValid: errors.length === 0 || (errors.length > 0 && jwtSecret) // Only critical error is missing JWT
  };
}

module.exports = {
  validateRuntimeConfig,
  DEFAULTS
};