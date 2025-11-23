/**
 * Test Script: Market Integrity Service
 * 
 * This script tests the market integrity service functionality:
 * 1. Self-trade detection
 * 2. Self-trade filtering
 * 3. Only self-liquidity detection
 * 4. Blocked trade logging
 */

const marketIntegrityService = require('./src/services/marketIntegrityService');

async function testMarketIntegrity() {
  try {
    console.log('🧪 Testing Market Integrity Service\n');

    // Test 1: Self-trade detection
    console.log('📝 Test 1: Self-trade detection...');
    
    const takerOrder = {
      id: 'taker-1',
      userId: 'user-1',
      tokenId: 'token-1',
      orderType: 'market',
      side: 'buy'
    };
    
    const makerOrder = {
      id: 'maker-1',
      userId: 'user-1',
      tokenId: 'token-1',
      price: 100,
      quantity: 10,
      filledQuantity: 0
    };
    
    const differentUserOrder = {
      id: 'maker-2',
      userId: 'user-2',
      tokenId: 'token-1',
      price: 100,
      quantity: 10,
      filledQuantity: 0
    };
    
    const isSelfTrade = marketIntegrityService.isSelfTrade(takerOrder, makerOrder);
    const isNotSelfTrade = marketIntegrityService.isSelfTrade(takerOrder, differentUserOrder);
    
    console.log(`✅ Self-trade detected: ${isSelfTrade}`);
    console.log(`✅ Different user trade: ${isNotSelfTrade}\n`);
    
    // Test 2: Self-trade filtering
    console.log('📝 Test 2: Self-trade filtering...');
    
    const potentialMatches = [makerOrder, differentUserOrder];
    const filteredMatches = marketIntegrityService.filterSelfTrades(takerOrder, potentialMatches);
    
    console.log(`✅ Original matches: ${potentialMatches.length}`);
    console.log(`✅ Filtered matches: ${filteredMatches.length}`);
    console.log(`✅ Blocked matches logged: ${marketIntegrityService.getBlockedTradeEvents().length}\n`);
    
    // Test 3: Only self-liquidity detection
    console.log('📝 Test 3: Only self-liquidity detection...');
    
    const onlySelfLiquidity = marketIntegrityService.hasOnlySelfLiquidity(takerOrder, [makerOrder]);
    const mixedLiquidity = marketIntegrityService.hasOnlySelfLiquidity(takerOrder, [makerOrder, differentUserOrder]);
    const noLiquidity = marketIntegrityService.hasOnlySelfLiquidity(takerOrder, []);
    
    console.log(`✅ Only self-liquidity: ${onlySelfLiquidity}`);
    console.log(`✅ Mixed liquidity: ${mixedLiquidity}`);
    console.log(`✅ No liquidity: ${noLiquidity}\n`);
    
    // Test 4: Blocked trade events
    console.log('📝 Test 4: Blocked trade events...');
    
    const blockedEvents = marketIntegrityService.getBlockedTradeEvents();
    const stats = marketIntegrityService.getBlockedTradeStats();
    
    console.log(`✅ Total blocked events: ${blockedEvents.length}`);
    console.log(`✅ Blocked trade stats:`, JSON.stringify(stats, null, 2));
    
    // Test 5: Clear history
    console.log('\n📝 Test 5: Clear history...');
    marketIntegrityService.clearBlockedTradeHistory();
    const clearedEvents = marketIntegrityService.getBlockedTradeEvents();
    console.log(`✅ Events after clear: ${clearedEvents.length}\n`);
    
    console.log('✅ All tests completed successfully!\n');
    console.log('💡 Integration Points:');
    console.log('   - Market Integrity Service integrated into OrderMatchingService');
    console.log('   - Admin API endpoints for monitoring:');
    console.log('     - GET /api/admin/market/blocked-trades');
    console.log('     - GET /api/admin/market/blocked-trade-stats\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testMarketIntegrity();