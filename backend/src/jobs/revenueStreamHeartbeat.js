const logger = require('../services/logger');
const { RevenueStream, RevenueEvent } = require('../models');
const { Op } = require('sequelize');

/**
 * REVENUE STREAM HEARTBEAT JOB
 * 
 * Runs hourly to monitor revenue stream health
 * Alerts if any stream shows zero intake despite platform activity
 * Provides operational visibility for revenue tracking
 */

async function revenueStreamHeartbeat() {
  try {
    logger.info('💓 Revenue Stream Heartbeat - Checking stream health...');

    // Get all active streams
    const streams = await RevenueStream.findAll({
      where: { isActive: true }
    });

    // Check for events in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const alerts = [];
    
    for (const stream of streams) {
      const recentEvents = await RevenueEvent.count({
        where: {
          streamId: stream.id,
          createdAt: { [Op.gte]: oneHourAgo }
        }
      });

      const totalCollected = parseFloat(stream.collected || 0);
      const targetMonthly = parseFloat(stream.targetMonthly || 0);
      const progress = targetMonthly > 0 ? (totalCollected / targetMonthly) * 100 : 0;

      // Alert if stream has target but zero recent activity and hasn't met target
      if (targetMonthly > 0 && recentEvents === 0 && progress < 100) {
        alerts.push({
          streamId: stream.id,
          streamName: stream.name,
          issue: 'No revenue events in last hour',
          collected: totalCollected,
          target: targetMonthly,
          progress: progress.toFixed(1) + '%'
        });
      }

      logger.info(`📊 Stream ${stream.id} (${stream.name}): ${recentEvents} events, $${totalCollected.toFixed(2)} collected (${progress.toFixed(1)}% of target)`);
    }

    // Log alerts
    if (alerts.length > 0) {
      logger.warn('⚠️ Revenue stream alerts detected:', { 
        alertCount: alerts.length,
        alerts 
      });
    } else {
      logger.info('✅ All revenue streams healthy');
    }

    // Calculate overall health metrics
    const totalCollected = streams.reduce((sum, s) => sum + parseFloat(s.collected || 0), 0);
    const totalTarget = streams.reduce((sum, s) => sum + parseFloat(s.targetMonthly || 0), 0);
    const overallProgress = totalTarget > 0 ? (totalCollected / totalTarget) * 100 : 0;

    logger.info('💰 Revenue Summary', {
      totalStreams: streams.length,
      totalCollected: totalCollected.toFixed(2),
      totalTarget: totalTarget.toFixed(2),
      overallProgress: overallProgress.toFixed(1) + '%',
      alerts: alerts.length
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      streams: streams.length,
      alerts: alerts.length,
      totalCollected,
      overallProgress
    };

  } catch (error) {
    logger.error('❌ Revenue stream heartbeat failed', { 
      error: error.message, 
      stack: error.stack 
    });
    throw error;
  }
}

module.exports = revenueStreamHeartbeat;
