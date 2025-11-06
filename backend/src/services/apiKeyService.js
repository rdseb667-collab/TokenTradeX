const ApiKey = require('../models/ApiKey');
const logger = require('./logger');

const API_TIERS = {
  free: {
    name: 'Free Tier',
    price: 0,
    requestsPerMinute: 1200,
    requestsPerMonth: 1000000,
    features: ['Read-only access', 'Market data', 'Public endpoints'],
    maxKeys: 2
  },
  standard: {
    name: 'Standard API',
    price: 99,
    requestsPerMinute: 6000,
    requestsPerMonth: 10000000,
    features: ['Everything in Free', 'Trading API', 'Order management', 'Account data'],
    maxKeys: 5
  },
  professional: {
    name: 'Professional API',
    price: 299,
    requestsPerMinute: 18000,
    requestsPerMonth: 50000000,
    features: ['Everything in Standard', 'WebSocket access', 'Advanced analytics', 'Priority support'],
    maxKeys: 10
  },
  enterprise: {
    name: 'Enterprise API',
    price: 999,
    requestsPerMinute: 100000,
    requestsPerMonth: null, // Unlimited
    features: ['Everything in Professional', 'Dedicated infrastructure', 'Custom endpoints', 'SLA guarantee', '24/7 support'],
    maxKeys: 50
  }
};

class ApiKeyService {
  async createApiKey(userId, name, tier = 'free', permissions = {}) {
    try {
      // Check if user has reached max keys for tier
      const existingKeys = await ApiKey.count({
        where: { userId, status: 'active' }
      });

      const tierInfo = API_TIERS[tier];
      if (existingKeys >= tierInfo.maxKeys) {
        throw new Error(`Maximum ${tierInfo.maxKeys} API keys allowed for ${tier} tier`);
      }

      const { key, secret } = ApiKey.generateKey();

      const apiKey = await ApiKey.create({
        userId,
        name,
        key,
        secret,
        tier,
        permissions: {
          read: true,
          trade: permissions.trade || false,
          withdraw: permissions.withdraw || false
        }
      });

      logger.info('API key created', { userId, name, tier });

      return {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key,
        secret: apiKey.secret, // Only shown once!
        tier: apiKey.tier,
        permissions: apiKey.permissions,
        createdAt: apiKey.createdAt
      };
    } catch (error) {
      logger.error('Error creating API key', { error: error.message, userId });
      throw error;
    }
  }

  async getUserKeys(userId) {
    try {
      const keys = await ApiKey.findAll({
        where: { userId },
        attributes: ['id', 'name', 'key', 'tier', 'status', 'permissions', 'requestsUsed', 'lastUsedAt', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      return keys.map(key => ({
        ...key.toJSON(),
        tierInfo: API_TIERS[key.tier]
      }));
    } catch (error) {
      logger.error('Error getting user API keys', { error: error.message, userId });
      throw error;
    }
  }

  async revokeKey(userId, keyId) {
    try {
      const apiKey = await ApiKey.findOne({
        where: { id: keyId, userId }
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      await apiKey.update({ status: 'revoked' });

      logger.info('API key revoked', { userId, keyId });

      return { success: true, message: 'API key revoked' };
    } catch (error) {
      logger.error('Error revoking API key', { error: error.message, userId, keyId });
      throw error;
    }
  }

  async validateKey(key) {
    try {
      const apiKey = await ApiKey.findOne({
        where: { key, status: 'active' }
      });

      if (!apiKey) {
        return null;
      }

      // Update last used and request count
      await apiKey.update({
        lastUsedAt: new Date(),
        requestsUsed: apiKey.requestsUsed + 1
      });

      return {
        userId: apiKey.userId,
        tier: apiKey.tier,
        permissions: apiKey.permissions,
        tierInfo: API_TIERS[apiKey.tier]
      };
    } catch (error) {
      logger.error('Error validating API key', { error: error.message });
      return null;
    }
  }

  getTierInfo(tier = 'free') {
    return API_TIERS[tier] || API_TIERS.free;
  }

  getAllTiers() {
    return API_TIERS;
  }

  async getUsageStats(userId) {
    try {
      const keys = await ApiKey.findAll({
        where: { userId, status: 'active' }
      });

      const totalRequests = keys.reduce((sum, key) => sum + key.requestsUsed, 0);

      return {
        totalKeys: keys.length,
        activeKeys: keys.filter(k => k.lastUsedAt).length,
        totalRequests,
        keyBreakdown: keys.map(k => ({
          name: k.name,
          requests: k.requestsUsed,
          lastUsed: k.lastUsedAt
        }))
      };
    } catch (error) {
      logger.error('Error getting usage stats', { error: error.message, userId });
      throw error;
    }
  }
}

module.exports = new ApiKeyService();
