const logger = require('../services/logger');
const rateLimit = require('express-rate-limit');

// Track failed login attempts
const failedAttempts = new Map(); // IP -> { count, firstAttempt, lastAttempt }
const blockedIPs = new Set();

// Suspicious activity patterns
const SUSPICIOUS_PATTERNS = {
  MAX_FAILED_LOGINS: 5,
  BLOCK_DURATION: 15 * 60 * 1000, // 15 minutes
  RESET_WINDOW: 60 * 60 * 1000 // 1 hour
};

/**
 * Track failed login attempts
 */
function trackFailedLogin(ip, email) {
  const now = Date.now();
  const attempts = failedAttempts.get(ip) || { count: 0, firstAttempt: now, lastAttempt: now, emails: new Set() };
  
  attempts.count++;
  attempts.lastAttempt = now;
  attempts.emails.add(email);
  
  failedAttempts.set(ip, attempts);
  
  // Check if should block
  if (attempts.count >= SUSPICIOUS_PATTERNS.MAX_FAILED_LOGINS) {
    blockedIPs.add(ip);
    
    logger.logSecurity({
      action: 'IP_BLOCKED',
      ip,
      reason: 'Too many failed login attempts',
      attempts: attempts.count,
      emails: Array.from(attempts.emails)
    });
    
    // Auto-unblock after duration
    setTimeout(() => {
      blockedIPs.delete(ip);
      failedAttempts.delete(ip);
      logger.logSecurity({ action: 'IP_UNBLOCKED', ip });
    }, SUSPICIOUS_PATTERNS.BLOCK_DURATION);
  }
}

/**
 * Track successful login
 */
function trackSuccessfulLogin(ip) {
  failedAttempts.delete(ip);
}

/**
 * Check if IP is blocked
 */
function isIPBlocked(ip) {
  return blockedIPs.has(ip);
}

/**
 * Security monitoring middleware
 */
const securityMonitor = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  // Check if IP is blocked
  if (isIPBlocked(ip)) {
    logger.logSecurity({
      action: 'BLOCKED_IP_ATTEMPT',
      ip,
      path: req.path,
      method: req.method
    });
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. Too many failed attempts. Please try again later.'
    });
  }
  
  // Monitor suspicious patterns
  const userAgent = req.get('user-agent');
  
  // Detect potential bot activity
  if (!userAgent || userAgent.length < 10) {
    logger.logSecurity({
      action: 'SUSPICIOUS_USER_AGENT',
      ip,
      userAgent,
      path: req.path
    });
  }
  
  // Monitor for rapid requests
  const requestKey = `${ip}:${req.path}`;
  // This would integrate with Redis in production
  
  next();
};

/**
 * Enhanced rate limiter for sensitive endpoints
 */
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = req.ip;
    logger.logSecurity({
      action: 'RATE_LIMIT_EXCEEDED',
      ip,
      path: req.path,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }
});

module.exports = {
  securityMonitor,
  strictRateLimiter,
  trackFailedLogin,
  trackSuccessfulLogin,
  isIPBlocked
};
