/**
 * Flywheel Input Validation and Sanitization Helper
 * Provides shared non-negative parsing and input caps for flywheel calculators
 */

// Input validation constants
const INPUT_LIMITS = {
  TTX_AMOUNT_MAX: 100000000, // 100M TTX tokens
  MONTHLY_VOLUME_MAX: 1000000000, // $1B monthly trading volume
  PLATFORM_REVENUE_MAX: 100000000 // $100M platform revenue
};

/**
 * Parse and validate a numeric input with non-negative constraint
 * @param {any} value - Input value to parse
 * @param {number} defaultValue - Default value if parsing fails
 * @param {number} maxValue - Maximum allowed value
 * @param {string} fieldName - Name of the field for error messages
 * @returns {number} Validated numeric value
 * @throws {Error} If value is invalid, negative, or exceeds limits
 */
function parseNonNegativeNumber(value, defaultValue, maxValue, fieldName) {
  // Handle undefined/null values
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  // Convert to number
  const num = parseFloat(value);
  
  // Check for NaN
  if (isNaN(num)) {
    throw new Error(`Invalid ${fieldName}: must be a valid number`);
  }
  
  // Check for negative values
  if (num < 0) {
    throw new Error(`Invalid ${fieldName}: must be non-negative`);
  }
  
  // Check for excessive values
  if (num > maxValue) {
    throw new Error(`Invalid ${fieldName}: must not exceed ${maxValue.toLocaleString()}`);
  }
  
  return num;
}

/**
 * Validate TTX amount input
 * @param {any} ttxAmount - TTX amount to validate
 * @returns {number} Validated TTX amount
 */
function validateTTXAmount(ttxAmount) {
  return parseNonNegativeNumber(
    ttxAmount, 
    1000, 
    INPUT_LIMITS.TTX_AMOUNT_MAX, 
    'TTX amount'
  );
}

/**
 * Validate monthly trading volume input
 * @param {any} monthlyVolume - Monthly volume to validate
 * @returns {number} Validated monthly volume
 */
function validateMonthlyVolume(monthlyVolume) {
  return parseNonNegativeNumber(
    monthlyVolume, 
    10000, 
    INPUT_LIMITS.MONTHLY_VOLUME_MAX, 
    'monthly trading volume'
  );
}

/**
 * Validate platform revenue input
 * @param {any} platformRevenue - Platform revenue to validate
 * @returns {number} Validated platform revenue
 */
function validatePlatformRevenue(platformRevenue) {
  return parseNonNegativeNumber(
    platformRevenue, 
    null, // No default for platform revenue - will be fetched from service
    INPUT_LIMITS.PLATFORM_REVENUE_MAX, 
    'platform revenue'
  );
}

/**
 * Check if TTX token is seeded in the database
 * @param {Object} Token - Token model
 * @returns {Promise<boolean>} True if TTX token exists
 */
async function isTTXTokenSeeded(Token) {
  try {
    const ttxToken = await Token.findOne({ where: { symbol: 'TTX' } });
    return !!ttxToken;
  } catch (error) {
    console.warn('Error checking TTX token seeding:', error.message);
    return false; // Assume not seeded if there's an error
  }
}

/**
 * Sanitize wallet balance to prevent NaN results
 * @param {any} balance - Wallet balance to sanitize
 * @returns {number} Sanitized balance
 */
function sanitizeWalletBalance(balance) {
  const num = parseFloat(balance);
  return isNaN(num) || num < 0 ? 0 : num;
}

/**
 * Sanitize order value to prevent NaN results
 * @param {any} value - Order value to sanitize
 * @returns {number} Sanitized value
 */
function sanitizeOrderValue(value) {
  const num = parseFloat(value);
  return isNaN(num) || num < 0 ? 0 : num;
}

module.exports = {
  INPUT_LIMITS,
  parseNonNegativeNumber,
  validateTTXAmount,
  validateMonthlyVolume,
  validatePlatformRevenue,
  isTTXTokenSeeded,
  sanitizeWalletBalance,
  sanitizeOrderValue
};