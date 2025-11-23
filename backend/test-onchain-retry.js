/**
 * Test Script: On-Chain Revenue Retry Worker
 * 
 * This script tests the on-chain revenue retry mechanism:
 * 1. Creates a revenue event with failed on-chain delivery
 * 2. Checks the failure report
 * 3. Simulates retry attempts
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { RevenueEvent, RevenueStream } = require('./src/models');
const onChainRevenueRetryWorker = require('./src/services/onChainRevenueRetryWorker');

async function testOnChainRetry() {
  try {
    console.log('🧪 Testing On-Chain Revenue Retry Worker\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Step 1: Create a test revenue event with failed delivery
    console.log('📝 Step 1: Creating test revenue event with failed delivery...');
    
    const testEvent = await RevenueEvent.create({
      streamId: 0, // Trading fees
      sourceType: 'test',
      sourceId: `test-retry-${Date.now()}`,
      currency: 'USD',
      grossAmount: 10.00,
      netAmount: 10.00,
      holderShare: 1.50, // 15%
      reserveShare: 8.50, // 85%
      description: 'Test event for retry mechanism',
      metadata: {
        timestamp: new Date().toISOString(),
        streamName: 'Trading Fees',
        onChainDeliveryStatus: 'failed',
        retryAttempts: 0,
        lastError: 'Simulated failure for testing'
      }
    });

    console.log(`✅ Created test event: ${testEvent.id}\n`);

    // Step 2: Get failure report
    console.log('📊 Step 2: Getting failure report...');
    const report = await onChainRevenueRetryWorker.getFailureReport(null, 1);
    
    console.log('\n📈 Failure Report Summary:');
    console.log(`   Total Failures: ${report.summary.totalFailures}`);
    console.log(`   Critical Failures: ${report.summary.criticalFailures}`);
    console.log(`   Total Holder Share Pending: $${report.summary.totalHolderSharePending}`);
    console.log(`   Period: ${report.summary.period}\n`);

    if (report.byStream.length > 0) {
      console.log('📋 By Stream:');
      report.byStream.forEach(stream => {
        console.log(`   - ${stream.streamName} (${stream.streamId}): ${stream.count} failures, $${stream.totalHolderShare.toFixed(2)} pending`);
      });
      console.log('');
    }

    // Step 3: Check worker status
    console.log('⚙️ Step 3: Checking worker status...');
    const status = onChainRevenueRetryWorker.getStatus();
    
    console.log('\n🔧 Worker Status:');
    console.log(`   Running: ${status.isRunning}`);
    console.log(`   Enabled: ${status.enabled}`);
    console.log(`   Poll Interval: ${status.pollIntervalMs}ms`);
    console.log(`   Batch Size: ${status.batchSize}`);
    console.log(`   Max Retry Attempts: ${status.maxRetryAttempts}\n`);

    // Step 4: Simulate a retry (only if contract is configured)
    if (process.env.CONTRACT_MODE === 'production' && process.env.TTX_TOKEN_ADDRESS) {
      console.log('🔄 Step 4: Simulating retry attempt...');
      
      // Trigger a single batch process
      await onChainRevenueRetryWorker.processBatch();
      
      // Reload event to check status
      await testEvent.reload();
      const newStatus = testEvent.metadata?.onChainDeliveryStatus;
      const retryCount = testEvent.metadata?.retryAttempts || 0;
      
      console.log(`✅ Retry attempt completed`);
      console.log(`   New Status: ${newStatus}`);
      console.log(`   Retry Attempts: ${retryCount}\n`);
    } else {
      console.log('⚠️ Step 4: Skipping retry simulation (contract not in production mode)\n');
      console.log('   To test actual retries, set:');
      console.log('   - CONTRACT_MODE=production');
      console.log('   - TTX_TOKEN_ADDRESS=<your contract address>\n');
    }

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    try {
      await testEvent.destroy();
      console.log('✅ Test event deleted\n');
    } catch (cleanupError) {
      console.log('⚠️  Cleanup warning (non-fatal):', cleanupError.message);
    }

    console.log('✅ All tests completed successfully!\n');
    console.log('💡 Integration Points:');
    console.log('   - Admin API: GET /api/admin/revenue/onchain-failures');
    console.log('   - Worker Status: GET /api/admin/revenue/onchain-worker-status');
    console.log('   - Auto-retry runs every 60 seconds (configurable via ONCHAIN_RETRY_POLL_MS)\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testOnChainRetry();
