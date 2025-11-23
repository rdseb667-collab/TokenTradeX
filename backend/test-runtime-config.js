/**
 * Test script for runtime configuration validation
 */

const { validateRuntimeConfig } = require('./src/config/runtimeConfig');

console.log('🧪 Testing Runtime Configuration Validation...\n');

// Test 1: Valid configuration
console.log('Test 1: Valid configuration');
process.env.CORS_ORIGIN = 'http://localhost:5173,https://app.tokentradex.com';
process.env.JWT_SECRET = 'this_is_a_very_long_secret_key_for_testing_purposes';
process.env.MAX_MARKET_SLIPPAGE_BPS = '500';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';

const result1 = validateRuntimeConfig();
console.log('Result:', result1.isValid ? '✅ PASS' : '❌ FAIL');
console.log('Config:', result1.config);
console.log('Errors:', result1.errors);
console.log('---\n');

// Test 2: Invalid CORS origin
console.log('Test 2: Invalid CORS origin');
process.env.CORS_ORIGIN = 'invalid_origin';
const result2 = validateRuntimeConfig();
console.log('Result:', result2.errors.length > 0 ? '✅ PASS (Expected validation error)' : '❌ FAIL');
console.log('Errors:', result2.errors);
console.log('---\n');

// Test 3: Missing JWT secret
console.log('Test 3: Missing JWT secret');
delete process.env.JWT_SECRET;
const result3 = validateRuntimeConfig();
console.log('Result:', result3.errors.length > 0 ? '✅ PASS (Expected validation error)' : '❌ FAIL');
console.log('Errors:', result3.errors);
console.log('---\n');

// Test 4: Invalid slippage value
console.log('Test 4: Invalid slippage value');
process.env.JWT_SECRET = 'this_is_a_very_long_secret_key_for_testing_purposes';
process.env.MAX_MARKET_SLIPPAGE_BPS = '15000'; // Too high
const result4 = validateRuntimeConfig();
console.log('Result:', result4.errors.length > 0 ? '✅ PASS (Expected validation error)' : '❌ FAIL');
console.log('Errors:', result4.errors);
console.log('---\n');

console.log('✅ Runtime configuration validation tests completed!');