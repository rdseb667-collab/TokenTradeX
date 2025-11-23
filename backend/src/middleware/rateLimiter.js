const rateLimit = require('express-rate-limit');

// Helper to get user ID from request (after auth middleware)
const getUserKey = (req) => {
  return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
};

// Strict rate limiter for authentication endpoints (IP-based)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Medium rate limiter for trading operations (per-user)
const tradingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 trades per minute per user
  keyGenerator: getUserKey,
  message: {
    success: false,
    message: 'Trading rate limit exceeded. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Loose rate limiter for general API calls
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for withdrawal requests (per-user)
const withdrawalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 withdrawals per hour per user
  keyGenerator: getUserKey,
  message: {
    success: false,
    message: 'Withdrawal rate limit exceeded. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-user profile update limiter
const profileLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 profile updates per 5 minutes
  keyGenerator: getUserKey,
  message: {
    success: false,
    message: 'Too many profile updates. Please try again in a few minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-user order cancellation limiter
const cancelLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 cancellations per minute
  keyGenerator: getUserKey,
  message: {
    success: false,
    message: 'Order cancellation rate limit exceeded.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  tradingLimiter,
  apiLimiter,
  withdrawalLimiter,
  profileLimiter,
  cancelLimiter
};
