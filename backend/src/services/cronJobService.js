const cron = require('node-cron');
const automationService = require('./smartContractAutomationService');
const stakingService = require('./stakingService');
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
