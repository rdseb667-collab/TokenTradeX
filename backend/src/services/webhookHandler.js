const { recordRevenue } = require('./revenueEventService');
const logger = require('./logger');

/**
 * Dead Letter Queue for failed webhook processing
 * In production, use Redis/SQS/RabbitMQ
 */
class WebhookDLQ {
  constructor() {
    this.queue = [];
    this.maxSize = 1000;
  }

  async enqueue(item) {
    if (this.queue.length >= this.maxSize) {
      logger.warn('DLQ is full, dropping oldest item');
      this.queue.shift();
    }

    this.queue.push({
      ...item,
      enqueuedAt: new Date(),
      retryCount: 0
    });

    logger.error('Webhook event added to DLQ', {
      provider: item.provider,
      type: item.type,
      error: item.error
    });

    // TODO: Persist to database or external queue
    // await prisma.webhookDLQ.create({ data: item });
  }

  async getRetryable(maxRetries = 3) {
    return this.queue.filter(item => item.retryCount < maxRetries);
  }

  async processRetries() {
    const retryable = await this.getRetryable();
    
    for (const item of retryable) {
      try {
        logger.info('Retrying DLQ item', {
          provider: item.provider,
          type: item.type,
          attempt: item.retryCount + 1
        });

        // Retry the original handler
        await this.handleWebhookEvent(item.provider, item.payload);

        // Success - remove from queue
        this.queue = this.queue.filter(i => i !== item);
        logger.info('DLQ item processed successfully', {
          provider: item.provider,
          type: item.type
        });

      } catch (error) {
        item.retryCount++;
        item.lastError = error.message;
        logger.warn('DLQ retry failed', {
          provider: item.provider,
          type: item.type,
          attempt: item.retryCount,
          error: error.message
        });
      }
    }
  }

  async handleWebhookEvent(provider, event) {
    switch (provider) {
      case 'stripe':
        return handleStripeWebhook(event);
      case 'coinbase':
        return handleCoinbaseWebhook(event);
      default:
        throw new Error(`Unknown webhook provider: ${provider}`);
    }
  }
}

const dlq = new WebhookDLQ();

/**
 * Stripe webhook handler
 */
async function handleStripeWebhook(event) {
  try {
    switch (event.type) {
      case 'invoice.paid':
        await recordRevenue({
          stream: 'PREMIUM_SUBS',
          userId: event.data.object.customer,
          amount: event.data.object.amount_paid / 100, // Convert cents to dollars
          refId: `stripe:${event.data.object.id}`,
          asset: event.data.object.currency?.toUpperCase() || 'USD',
          metadata: {
            provider: 'stripe',
            invoiceId: event.data.object.id,
            subscriptionId: event.data.object.subscription,
            planId: event.data.object.lines?.data[0]?.plan?.id
          }
        });
        logger.info('Stripe invoice.paid processed', {
          invoiceId: event.data.object.id,
          amount: event.data.object.amount_paid / 100
        });
        break;

      case 'invoice.payment_failed':
        logger.warn('Stripe payment failed', {
          invoiceId: event.data.object.id,
          customer: event.data.object.customer
        });
        // TODO: Handle failed payment (suspend subscription, notify user)
        break;

      case 'customer.subscription.deleted':
        logger.info('Stripe subscription cancelled', {
          subscriptionId: event.id,
          customer: event.data.object.customer
        });
        // TODO: Handle subscription cancellation
        break;

      case 'charge.refunded':
        // Record negative revenue event for refund
        await recordRevenue({
          stream: 'PREMIUM_SUBS',
          userId: event.data.object.customer,
          amount: -(event.data.object.amount_refunded / 100),
          refId: `stripe_refund:${event.data.object.id}`,
          asset: event.data.object.currency?.toUpperCase() || 'USD',
          metadata: {
            provider: 'stripe',
            chargeId: event.data.object.id,
            reason: 'refund',
            originalCharge: event.data.object.charge
          }
        });
        logger.info('Stripe refund processed', {
          chargeId: event.data.object.id,
          amount: event.data.object.amount_refunded / 100
        });
        break;

      default:
        logger.debug('Unhandled Stripe webhook event', {
          type: event.type
        });
    }

  } catch (error) {
    await dlq.enqueue({
      provider: 'stripe',
      type: event.type,
      payload: event,
      error: error.message
    });
    throw error;
  }
}

/**
 * Coinbase Commerce webhook handler
 */
async function handleCoinbaseWebhook(event) {
  try {
    switch (event.type) {
      case 'charge:confirmed':
        await recordRevenue({
          stream: 'PREMIUM_SUBS',
          userId: event.data.metadata?.userId,
          amount: parseFloat(event.data.pricing.local.amount),
          refId: `coinbase:${event.data.code}`,
          asset: event.data.pricing.local.currency,
          metadata: {
            provider: 'coinbase',
            chargeCode: event.data.code,
            cryptoAmount: event.data.pricing.cryptocurrency.amount,
            cryptoCurrency: event.data.pricing.cryptocurrency.currency
          }
        });
        logger.info('Coinbase charge confirmed', {
          chargeCode: event.data.code,
          amount: event.data.pricing.local.amount
        });
        break;

      case 'charge:failed':
        logger.warn('Coinbase charge failed', {
          chargeCode: event.data.code,
          userId: event.data.metadata?.userId
        });
        break;

      default:
        logger.debug('Unhandled Coinbase webhook event', {
          type: event.type
        });
    }

  } catch (error) {
    await dlq.enqueue({
      provider: 'coinbase',
      type: event.type,
      payload: event,
      error: error.message
    });
    throw error;
  }
}

/**
 * Start DLQ retry worker (call from server.js)
 */
function startDLQWorker(intervalMs = 5 * 60 * 1000) {
  logger.info('Starting webhook DLQ retry worker', {
    interval: `${intervalMs}ms`
  });

  setInterval(() => {
    dlq.processRetries().catch(err => {
      logger.error('DLQ retry worker error', { error: err.message });
    });
  }, intervalMs);
}

module.exports = {
  handleStripeWebhook,
  handleCoinbaseWebhook,
  startDLQWorker,
  dlq
};
