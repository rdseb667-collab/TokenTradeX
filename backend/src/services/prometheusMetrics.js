const client = require('prom-client');
const logger = require('./logger');

/**
 * PROMETHEUS METRICS SERVICE
 * 
 * Lightweight metrics registry for operational monitoring
 * Exposes key revenue and system metrics in Prometheus format
 * Allows external monitoring tools to scrape /metrics endpoint
 */

class PrometheusMetrics {
  constructor() {
    // Create a Registry to hold all metrics
    this.register = new client.Registry();

    // Add default Node.js metrics (CPU, memory, event loop, etc.)
    client.collectDefaultMetrics({ 
      register: this.register,
      prefix: 'tokentradex_'
    });

    // Custom gauge for total revenue collected per stream
    this.revenueCollectedGauge = new client.Gauge({
      name: 'tokentradex_revenue_collected_usd',
      help: 'Total revenue collected in USD per stream',
      labelNames: ['stream_id', 'stream_name'],
      registers: [this.register]
    });

    // Custom gauge for revenue distributed to holders
    this.revenueDistributedGauge = new client.Gauge({
      name: 'tokentradex_revenue_distributed_usd',
      help: 'Revenue distributed to holders in USD per stream',
      labelNames: ['stream_id', 'stream_name'],
      registers: [this.register]
    });

    // Custom gauge for reserve fund total
    this.reserveFundGauge = new client.Gauge({
      name: 'tokentradex_reserve_fund_usd',
      help: 'Total reserve fund backing in USD',
      registers: [this.register]
    });

    // Custom gauge for TTX backing per token
    this.ttxBackingGauge = new client.Gauge({
      name: 'tokentradex_ttx_backing_per_token',
      help: 'Reserve backing per TTX token',
      registers: [this.register]
    });

    // Counter for revenue events
    this.revenueEventsCounter = new client.Counter({
      name: 'tokentradex_revenue_events_total',
      help: 'Total number of revenue collection events',
      labelNames: ['stream_id', 'stream_name', 'source_type'],
      registers: [this.register]
    });

    // Gauge for post-trade job queue
    this.postTradeJobsGauge = new client.Gauge({
      name: 'tokentradex_post_trade_jobs',
      help: 'Number of post-trade jobs by status',
      labelNames: ['status'],
      registers: [this.register]
    });

    logger.info('📊 Prometheus metrics registry initialized');
  }

  /**
   * Update revenue stream metrics
   */
  updateRevenueMetrics(streamId, streamName, collected, distributed) {
    this.revenueCollectedGauge.set(
      { stream_id: streamId, stream_name: streamName },
      parseFloat(collected || 0)
    );

    this.revenueDistributedGauge.set(
      { stream_id: streamId, stream_name: streamName },
      parseFloat(distributed || 0)
    );
  }

  /**
   * Update reserve fund metrics
   */
  updateReserveMetrics(totalReserve, backingPerToken) {
    this.reserveFundGauge.set(parseFloat(totalReserve || 0));
    this.ttxBackingGauge.set(parseFloat(backingPerToken || 0));
  }

  /**
   * Increment revenue event counter
   */
  recordRevenueEvent(streamId, streamName, sourceType = 'trade') {
    this.revenueEventsCounter.inc({
      stream_id: streamId,
      stream_name: streamName,
      source_type: sourceType
    });
  }

  /**
   * Update post-trade job queue metrics
   */
  updatePostTradeJobMetrics(jobStats) {
    if (jobStats) {
      this.postTradeJobsGauge.set({ status: 'pending' }, jobStats.pending || 0);
      this.postTradeJobsGauge.set({ status: 'processing' }, jobStats.processing || 0);
      this.postTradeJobsGauge.set({ status: 'completed' }, jobStats.completed || 0);
      this.postTradeJobsGauge.set({ status: 'failed' }, jobStats.failed || 0);
      this.postTradeJobsGauge.set({ status: 'dead_letter' }, jobStats.dead_letter || 0);
    }
  }

  /**
   * Get metrics in Prometheus text format
   */
  async getMetrics() {
    return await this.register.metrics();
  }

  /**
   * Get content type for Prometheus
   */
  getContentType() {
    return this.register.contentType;
  }
}

module.exports = new PrometheusMetrics();
