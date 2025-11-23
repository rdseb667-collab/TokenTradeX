/**
 * Verification script for fee distribution system
 */

const { sequelize } = require('./src/config/database');
const models = require('./src/models');

async function verify() {
  try {
    console.log('\n🔍 VERIFICATION REPORT\n');
    console.log('='.repeat(60));
    
    // 1. Check models are registered
    console.log('\n1. MODEL REGISTRATION:');
    console.log('   FeePool:', models.FeePool ? '✅ Registered' : '❌ Missing');
    console.log('   FeePoolTransaction:', models.FeePoolTransaction ? '✅ Registered' : '❌ Missing');
    
    // 2. Check tables exist
    console.log('\n2. DATABASE TABLES:');
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('fee_pools', 'fee_pool_transactions')"
    );
    console.log('   fee_pools table:', tables.find(t => t.table_name === 'fee_pools') ? '✅ Exists' : '❌ Missing');
    console.log('   fee_pool_transactions table:', tables.find(t => t.table_name === 'fee_pool_transactions') ? '✅ Exists' : '❌ Missing');
    
    // 3. Check pool initialization
    if (models.FeePool) {
      console.log('\n3. FEE POOLS INITIALIZED:');
      const pools = await models.FeePool.findAll({ order: [['id', 'ASC']] });
      if (pools.length === 0) {
        console.log('   ❌ No pools found - run initialization!');
      } else {
        pools.forEach(pool => {
          console.log(`   Pool ${pool.id}: ${pool.name} (${pool.allocationPercentage}%) ✅`);
        });
      }
    }
    
    // 4. Check service files exist
    console.log('\n4. SERVICE FILES:');
    const fs = require('fs');
    const feePoolServiceExists = fs.existsSync('./src/services/feePoolService.js');
    console.log('   feePoolService.js:', feePoolServiceExists ? '✅ Exists' : '❌ Missing');
    
    // 5. Check migration file
    console.log('\n5. MIGRATION FILES:');
    const migrationExists = fs.existsSync('./src/migrations/20241112000000-create-fee-pools.js');
    console.log('   20241112000000-create-fee-pools.js:', migrationExists ? '✅ Exists' : '❌ Missing');
    
    // 6. Check code implementation
    console.log('\n6. CODE IMPLEMENTATION:');
    const orderMatchingCode = fs.readFileSync('./src/services/orderMatchingService.js', 'utf8');
    const has15Split = orderMatchingCode.includes('const holderShare = totalFees * 0.15');
    const has85Split = orderMatchingCode.includes('const platformShare = totalFees * 0.85');
    const hasFeePoolCall = orderMatchingCode.includes('feePoolService.distributeFees');
    
    console.log('   15%/85% split:', has15Split && has85Split ? '✅ Implemented' : '❌ Missing');
    console.log('   feePoolService call:', hasFeePoolCall ? '✅ Implemented' : '❌ Missing');
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Verification complete!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verify();
