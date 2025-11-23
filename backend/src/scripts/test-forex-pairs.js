/**
 * Test script to verify forex pairs integration
 * This script checks that forex pairs are properly configured and will work in the system
 */

const { Token } = require('../models');

async function testForexPairs() {
  console.log('🧪 Testing forex pairs integration...\n');
  
  // Forex pairs to test
  const forexPairs = [
    'EUR/USD',
    'GBP/USD',
    'USD/JPY',
    'USD/CHF',
    'AUD/USD',
    'USD/CAD',
    'NZD/USD',
    'EUR/GBP',
    'EUR/JPY'
  ];
  
  try {
    console.log('🔍 Checking forex pairs in database...');
    
    for (const symbol of forexPairs) {
      const token = await Token.findOne({ where: { symbol } });
      
      if (token) {
        console.log(`✅ Found ${symbol}:`);
        console.log(`   Name: ${token.name}`);
        console.log(`   Price: $${token.currentPrice}`);
        console.log(`   24h Change: ${token.priceChange24h}%`);
        console.log(`   Volume: $${token.volume24h.toLocaleString()}`);
        console.log(`   Market Cap: $${token.marketCap.toLocaleString()}`);
        console.log(`   Min Trade: ${token.minTradeAmount}`);
        console.log(`   Max Trade: ${token.maxTradeAmount}`);
        console.log(`   Active: ${token.isActive ? 'Yes' : 'No'}`);
        console.log(`   Trading Enabled: ${token.isTradingEnabled ? 'Yes' : 'No'}`);
        console.log(`   Category: ${token.assetCategory || 'N/A'}`);
        console.log('');
      } else {
        console.log(`❌ ${symbol} not found in database`);
      }
    }
    
    console.log('📋 Summary:');
    console.log(`   Total forex pairs expected: ${forexPairs.length}`);
    const foundPairs = await Token.count({ 
      where: { 
        symbol: forexPairs 
      } 
    });
    console.log(`   Total forex pairs found: ${foundPairs}`);
    
    if (foundPairs === forexPairs.length) {
      console.log('\n🎉 All forex pairs are properly configured!');
      console.log('✅ Ready for trading');
    } else {
      console.log('\n⚠️  Some forex pairs are missing');
      console.log('💡 Run the seed-forex.js script to add missing pairs');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testForexPairs();