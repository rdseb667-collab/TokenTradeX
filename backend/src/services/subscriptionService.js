const Subscription = require('../models/Subscription');
const User = require('../models/User');
const logger = require('./logger');

const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    feeDiscount: 0,
    features: [
      'Basic trading',
      'Standard order types',
      'Basic charts',
      'Email support'
    ],
    limits: {
      apiCallsPerMinute: 60,
      withdrawalsPerDay: 3,
      maxOrderSize: 10000
    }
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    feeDiscount: 15,
    features: [
      'Everything in Free',
      '15% trading fee discount',
      'Advanced charts & indicators',
      'Price alerts',
      'Priority support',
      'API access (6,000 req/min)',
      'Export trading history'
    ],
    limits: {
      apiCallsPerMinute: 6000,
      withdrawalsPerDay: 10,
      maxOrderSize: 100000
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 199.99,
    feeDiscount: 30,
    features: [
      'Everything in Pro',
      '30% trading fee discount',
      'Advanced analytics dashboard',
      'Trading signals',
      'Portfolio tracker',
      'Tax reports',
      'Dedicated account manager',
      'API access (18,000 req/min)',
      'OTC desk access',
      'Custom integrations'
    ],
    limits: {
      apiCallsPerMinute: 18000,
      withdrawalsPerDay: 50,
      maxOrderSize: 1000000
    }
  }
};

class SubscriptionService {
  async getUserSubscription(userId) {
    try {
      let subscription = await Subscription.findOne({
        where: {
          userId,
          status: 'active'
        }
      });

      if (!subscription) {
        // Create free tier by default
        subscription = await Subscription.create({
          userId,
          tier: 'free',
          status: 'active',
          price: 0
        });
      }

      return {
        ...subscription.toJSON(),
        tierInfo: SUBSCRIPTION_TIERS[subscription.tier]
      };
    } catch (error) {
      logger.error('Error getting user subscription', { error: error.message, userId });
      throw error;
    }
  }

  async upgradeTier(userId, newTier, paymentMethod = 'ttx') {
    try {
      if (!SUBSCRIPTION_TIERS[newTier]) {
        throw new Error('Invalid subscription tier');
      }

      const currentSub = await this.getUserSubscription(userId);
      
      if (currentSub.tier === newTier) {
        throw new Error('Already subscribed to this tier');
      }

      // Cancel current subscription
      if (currentSub.tier !== 'free') {
        await Subscription.update(
          { status: 'cancelled' },
          { where: { id: currentSub.id } }
        );
      }

      // Create new subscription
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

      const newSub = await Subscription.create({
        userId,
        tier: newTier,
        status: 'active',
        price: SUBSCRIPTION_TIERS[newTier].price,
        endDate,
        paymentMethod,
        autoRenew: true
      });

      // Collect subscription revenue (Stream #2)
      const subscriptionPrice = SUBSCRIPTION_TIERS[newTier].price;
      const revenueCollector = require('../helpers/revenueCollector');
      setImmediate(async () => {
        try {
          await revenueCollector.collectRevenue(
            2, 
            subscriptionPrice, 
            `Premium subscription: ${newTier} tier`
          );
          console.log(`💎 Subscription revenue collected: $${subscriptionPrice} (${newTier})`);
        } catch (error) {
          console.error('Failed to collect subscription revenue:', error.message);
        }
      });

      logger.info('Subscription upgraded', {
        userId,
        oldTier: currentSub.tier,
        newTier,
        price: SUBSCRIPTION_TIERS[newTier].price
      });

      return {
        ...newSub.toJSON(),
        tierInfo: SUBSCRIPTION_TIERS[newTier]
      };
    } catch (error) {
      logger.error('Error upgrading subscription', { error: error.message, userId, newTier });
      throw error;
    }
  }

  async cancelSubscription(userId) {
    try {
      const subscription = await Subscription.findOne({
        where: {
          userId,
          status: 'active'
        }
      });

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      if (subscription.tier === 'free') {
        throw new Error('Cannot cancel free tier');
      }

      await Subscription.update(
        { 
          status: 'cancelled',
          autoRenew: false
        },
        { where: { id: subscription.id } }
      );

      logger.info('Subscription cancelled', { userId, tier: subscription.tier });

      return { success: true, message: 'Subscription cancelled' };
    } catch (error) {
      logger.error('Error cancelling subscription', { error: error.message, userId });
      throw error;
    }
  }

  getTierInfo(tier = 'free') {
    return SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.free;
  }

  getAllTiers() {
    return SUBSCRIPTION_TIERS;
  }

  calculateFeeDiscount(tier) {
    return SUBSCRIPTION_TIERS[tier]?.feeDiscount || 0;
  }

  async checkFeatureAccess(userId, feature) {
    const subscription = await this.getUserSubscription(userId);
    const tierInfo = SUBSCRIPTION_TIERS[subscription.tier];
    
    return tierInfo.features.some(f => 
      f.toLowerCase().includes(feature.toLowerCase())
    );
  }
}

module.exports = new SubscriptionService();
