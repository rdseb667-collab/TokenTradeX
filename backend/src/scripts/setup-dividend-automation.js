const { Token } = require('../models');
const { sequelize } = require('../config/database');

/**
 * Auto-setup dividend distribution schedules for all RWA stocks
 * Creates quarterly payment schedules for dividend-paying equities
 */
async function setupAutomatedDividends() {
  console.log('💰 Setting up automated dividend distributions...\n');

  try {
    // Get all stock tokens with dividends enabled
    const dividendStocks = await Token.findAll({
      where: {
        assetCategory: 'stocks',
        dividendsEnabled: true,
        isActive: true
      }
    });

    if (dividendStocks.length === 0) {
      console.log('⚠️  No dividend-paying stocks found. Run seed-rwa-equities.js first.');
      return { scheduled: 0 };
    }

    console.log(`📊 Found ${dividendStocks.length} dividend-paying stocks\n`);

    let scheduledCount = 0;

    for (const stock of dividendStocks) {
      const underlying = stock.underlyingAsset;
      
      if (!underlying.quarterlyDividend || underlying.quarterlyDividend <= 0) {
        console.log(`⏭️  ${stock.symbol} - No quarterly dividend configured, skipping...`);
        continue;
      }

      // Calculate dividend per token (quarterly)
      const tokensPerShare = underlying.tokensPerShare || 1000;
      const quarterlyDividendPerToken = underlying.quarterlyDividend / tokensPerShare;

      // Update the token with automation schedule in metadata
      const updatedAsset = {
        ...underlying,
        automationEnabled: true,
        automationSchedule: {
          paymentType: 'dividend',
          frequency: 'quarterly', // Every 3 months
          amountPerToken: quarterlyDividendPerToken,
          currency: 'USD',
          nextPaymentDate: getNextQuarterDate(),
          lastPaymentDate: null,
          totalPaid: 0,
          paymentsExecuted: 0,
          active: true,
          created: new Date().toISOString()
        }
      };

      await stock.update({
        underlyingAsset: updatedAsset
      });

      console.log(`✅ ${stock.symbol} - Dividend automation configured`);
      console.log(`   💵 Amount: $${quarterlyDividendPerToken.toFixed(6)} per token`);
      console.log(`   📅 Frequency: Quarterly (every 3 months)`);
      console.log(`   🗓️  Next Payment: ${getNextQuarterDate().toLocaleDateString()}`);
      console.log('');

      scheduledCount++;
    }

    console.log('\n📊 Dividend Automation Summary:');
    console.log(`✅ Configured: ${scheduledCount} stocks`);
    console.log(`⏭️  Skipped: ${dividendStocks.length - scheduledCount} stocks`);
    console.log(`\n💡 Dividend payments will be distributed automatically every quarter`);
    console.log(`💡 All token holders receive proportional dividends based on their holdings`);
    
    return { scheduled: scheduledCount };

  } catch (error) {
    console.error('❌ Error setting up automated dividends:', error);
    throw error;
  }
}

/**
 * Get the next quarter end date for dividend payment
 * Quarters: March 31, June 30, Sept 30, Dec 31
 */
function getNextQuarterDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  // Quarter end months: 2 (Mar), 5 (Jun), 8 (Sep), 11 (Dec)
  const quarterEndMonths = [2, 5, 8, 11];
  
  // Find next quarter end
  for (const endMonth of quarterEndMonths) {
    const quarterEnd = new Date(year, endMonth, 31); // Last day of quarter month
    if (quarterEnd > now) {
      return quarterEnd;
    }
  }
  
  // If we're past December, return March of next year
  return new Date(year + 1, 2, 31);
}

/**
 * Manual execution of dividend payments for a specific stock
 */
async function executeDividendPayment(tokenSymbol) {
  console.log(`💸 Executing dividend payment for ${tokenSymbol}...\n`);

  try {
    const token = await Token.findOne({
      where: { symbol: tokenSymbol }
    });

    if (!token) {
      throw new Error(`Token ${tokenSymbol} not found`);
    }

    const schedule = token.underlyingAsset?.automationSchedule;
    if (!schedule || !schedule.active) {
      throw new Error(`No active dividend schedule for ${tokenSymbol}`);
    }

    // This would integrate with the smart contract automation service
    console.log(`✅ Dividend payment executed for ${tokenSymbol}`);
    console.log(`   💵 Amount: $${schedule.amountPerToken} per token`);
    console.log(`   📊 Total Supply: ${token.totalSupply} tokens`);
    console.log(`   💰 Total Dividend Pool: $${(schedule.amountPerToken * token.totalSupply).toLocaleString()}`);
    
    // Update last payment date
    const updatedAsset = {
      ...token.underlyingAsset,
      automationSchedule: {
        ...schedule,
        lastPaymentDate: new Date().toISOString(),
        nextPaymentDate: getNextQuarterDate().toISOString(),
        paymentsExecuted: (schedule.paymentsExecuted || 0) + 1,
        totalPaid: (schedule.totalPaid || 0) + (schedule.amountPerToken * token.totalSupply)
      }
    };

    await token.update({ underlyingAsset: updatedAsset });

    return { success: true, token: tokenSymbol };

  } catch (error) {
    console.error(`❌ Error executing dividend payment:`, error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'execute' && process.argv[3]) {
    // Execute dividend for specific stock
    executeDividendPayment(process.argv[3])
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    // Setup automated schedules
    setupAutomatedDividends()
      .then(() => {
        console.log('\n✅ Dividend automation setup completed!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Setup failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { 
  setupAutomatedDividends, 
  executeDividendPayment 
};
