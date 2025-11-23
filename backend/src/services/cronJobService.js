const cron = require('node-cron');
const automationService = require('./smartContractAutomationService');
const stakingService = require('./stakingService');
const volumeRebateService = require('./volumeRebateService');
const revenueStreamHeartbeat = require('../jobs/revenueStreamHeartbeat');
const revenueDefenseService = require('./revenueDefenseService');
const privacyComplianceService = require('./privacyComplianceService');
const logger = require('./logger');

/**
 * CRON JOB SERVICE
 * 
 * Automatically executes scheduled payments without human intervention
 * Runs like a smart contract - set once, runs forever
 * 
 * SCHEDULE: Every hour at minute 0
 * Checks all tokens for due payments and executes them
 */

class CronJobService {
  constructor() {
    this.jobs = [];
  }
  
  /**
   * START ALL CRON JOBS
   */
  start() {
    console.log('🤖 Starting automated payment cron jobs...');
    
    // Execute automated payments every hour
    const paymentJob = cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running automated payment check...');
      
      try {
        const result = await automationService.executeDuePayments();
        
        if (result.results.length > 0) {
          console.log(`✅ Executed ${result.results.length} automated payments`);
          result.results.forEach(r => {
            if (r.success) {
              console.log(`  💰 ${r.symbol}: ${r.execution?.totalDistributed} distributed to ${r.execution?.totalHolders} holders`);
            }
          });
        } else {
          console.log('  ℹ️  No payments due at this time');
        }
      } catch (error) {
        console.error('❌ Error executing automated payments:', error);
        logger.error('Cron job error:', error);
      }
    }, {
      scheduled: false
    });
    
    this.jobs.push({
      name: 'automated-payments',
      job: paymentJob,
      schedule: 'Every hour at minute 0'
    });
    
    // Update staking rewards daily at midnight
    const stakingJob = cron.schedule('0 0 * * *', async () => {
      console.log('💰 Running daily staking rewards update...');
      
      try {
        const result = await stakingService.updateAllRewards();
        console.log(`✅ Updated ${result.updated} positions, distributed ${result.totalRewardsDistributed.toFixed(2)} in rewards`);
      } catch (error) {
        console.error('❌ Error updating staking rewards:', error);
        logger.error('Staking cron error:', error);
      }
    }, {
      scheduled: false
    });
    
    this.jobs.push({
      name: 'staking-rewards',
      job: stakingJob,
      schedule: 'Daily at midnight'
    });
    
    // Process monthly volume rebates on first day of month at 1 AM
    const rebateJob = cron.schedule('0 1 1 * *', async () => {
      console.log('🎁 Running monthly volume rebate distribution...');
      
      try {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = lastMonth.getFullYear();
        const month = lastMonth.getMonth() + 1;
        
        const result = await volumeRebateService.processMonthlyRebates(year, month);
        console.log(`✅ Distributed ${result.totalRebateUSD.toFixed(2)} USD (${result.totalRebateTTX.toFixed(2)} TTX) in rebates to ${result.successful} users`);
      } catch (error) {
        console.error('❌ Error processing volume rebates:', error);
        logger.error('Volume rebate cron error:', error);
      }
    }, {
      scheduled: false
    });
    
    this.jobs.push({
      name: 'volume-rebates',
      job: rebateJob,
      schedule: 'Monthly on 1st at 1 AM'
    });
    
    // Revenue stream health check every hour at 30 minutes past
    const heartbeatJob = cron.schedule('30 * * * *', async () => {
      console.log('💓 Running revenue stream health check...');
      
      try {
        const result = await revenueStreamHeartbeat();
        console.log(`✅ Health check complete: ${result.streams} streams, ${result.alerts} alerts`);
      } catch (error) {
        console.error('❌ Error running revenue heartbeat:', error);
        logger.error('Revenue heartbeat cron error:', error);
      }
    }, {
      scheduled: false
    });
    
    this.jobs.push({
      name: 'revenue-heartbeat',
      job: heartbeatJob,
      schedule: 'Every hour at 30 minutes past'
    });
    
    // Revenue defense checks daily at 2 AM
    const defenseJob = cron.schedule('0 2 * * *', async () => {
      console.log('🛡️ Running daily revenue defense checks...');
      
      try {
        const results = await revenueDefenseService.runDefenseChecks();
        
        // Log summary
        if (results.checks?.concentration?.warning) {
          logger.warn('⚠️ Revenue concentration alert', results.checks.concentration);
        }
        
        if (results.checks?.negativeFlows?.count > 0) {
          logger.warn(`⚠️ ${results.checks.negativeFlows.count} users with negative net flows detected`);
        }
        
        if (results.checks?.missingEvents?.streams > 0) {
          logger.error(`❌ Missing revenue events in ${results.checks.missingEvents.streams} streams`);
        }
        
        console.log(`✅ Defense checks complete: ${results.checks?.concentration?.warning ? 'WARNINGS' : 'OK'}`);
      } catch (error) {
        console.error('❌ Error running defense checks:', error);
        logger.error('Revenue defense cron error:', error);
      }
    }, {
      scheduled: false
    });
    
    this.jobs.push({
      name: 'revenue-defense',
      job: defenseJob,
      schedule: 'Daily at 2 AM'
    });
    
    // GDPR/CCPA data deletion processing daily at 3 AM
    const dataDeletionJob = cron.schedule('0 3 * * *', async () => {
      console.log('🗑️ Processing scheduled data deletions (GDPR/CCPA)...');
      
      try {
        const results = await privacyComplianceService.processScheduledDeletions();
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        if (successful > 0) {
          logger.warn(`✅ Processed ${successful} data deletion requests`);
        }
        
        if (failed > 0) {
          logger.error(`❌ ${failed} data deletions failed`);
        }
        
        console.log(`✅ Data deletion processing complete: ${successful} successful, ${failed} failed`);
      } catch (error) {
        console.error('❌ Error processing data deletions:', error);
        logger.error('Data deletion cron error:', error);
      }
    }, {
      scheduled: false
    });
    
    this.jobs.push({
      name: 'gdpr-data-deletion',
      job: dataDeletionJob,
      schedule: 'Daily at 3 AM'
    });
    
    // Start all jobs
    this.jobs.forEach(({ name, job, schedule }) => {
      job.start();
      console.log(`  ✅ ${name} - ${schedule}`);
    });
    
    console.log('🚀 All cron jobs started');
  }
  
  /**
   * STOP ALL CRON JOBS
   */
  stop() {
    console.log('🛑 Stopping all cron jobs...');
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`  Stopped: ${name}`);
    });
  }
  
  /**
   * GET JOB STATUS
   */
  getStatus() {
    return this.jobs.map(({ name, schedule }) => ({
      name,
      schedule,
      running: true
    }));
  }
  
  /**
   * MANUAL TRIGGER (for testing)
   */
  async manualTrigger() {
    console.log('🔧 Manual trigger: Executing automated payments...');
    try {
      const result = await automationService.executeDuePayments();
      console.log(`✅ Manually executed ${result.results.length} payments`);
      return result;
    } catch (error) {
      console.error('❌ Manual trigger error:', error);
      throw error;
    }
  }
}

module.exports = new CronJobService();
