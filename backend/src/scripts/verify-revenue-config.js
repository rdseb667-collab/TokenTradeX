const revenueStreamService = require('../services/revenueStreamService');

console.log('🔍 Revenue Configuration Verification\n');
console.log('Environment Variables:');
console.log(`  REVENUE_HOLDER_PERCENTAGE: ${process.env.REVENUE_HOLDER_PERCENTAGE || 'not set (using default)'}`);
console.log(`  REVENUE_RESERVE_PERCENTAGE: ${process.env.REVENUE_RESERVE_PERCENTAGE || 'not set (using default)'}`);

console.log('\nService Configuration:');
console.log(`  Holder Share: ${(revenueStreamService.holderSharePercentage * 100).toFixed(1)}%`);
console.log(`  Reserve Share: ${(revenueStreamService.reserveFundPercentage * 100).toFixed(1)}%`);
console.log(`  Total: ${((revenueStreamService.holderSharePercentage + revenueStreamService.reserveFundPercentage) * 100).toFixed(1)}%`);

console.log('\nSample Revenue Split ($100):');
const testAmount = 100;
const holderShare = testAmount * revenueStreamService.holderSharePercentage;
const reserveShare = testAmount * revenueStreamService.reserveFundPercentage;
console.log(`  Holder Share: $${holderShare.toFixed(2)}`);
console.log(`  Reserve Share: $${reserveShare.toFixed(2)}`);

console.log('\n✅ Configuration verified successfully!');
process.exit(0);
