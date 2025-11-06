const TokenListing = require('../models/TokenListing');
const logger = require('./logger');

const LISTING_TIERS = {
  basic: {
    name: 'Basic Listing',
    fee: 50000,
    features: [
      'Token listed on exchange',
      'Basic trading pairs (USDT, BTC)',
      'Standard support'
    ],
    paymentMethods: ['BTC', 'ETH', 'USDT', 'Bank Transfer']
  },
  premium: {
    name: 'Premium Listing',
    fee: 100000,
    features: [
      'Everything in Basic',
      'Marketing campaign (email + social)',
      'Featured on homepage',
      'Multiple trading pairs',
      'Priority support',
      'Market making support'
    ],
    paymentMethods: ['BTC', 'ETH', 'USDT', 'Bank Transfer']
  },
  ieo: {
    name: 'IEO Launch',
    fee: 250000,
    features: [
      'Everything in Premium',
      'Full IEO launch pad',
      'KYC verification for buyers',
      'Token sale management',
      'Dedicated marketing team',
      'Press release',
      'Guaranteed liquidity',
      'Post-launch support'
    ],
    paymentMethods: ['BTC', 'ETH', 'USDT', 'Bank Transfer'],
    revenueShare: '5% of token sale'
  }
};

class TokenListingService {
  async submitListing(data) {
    try {
      const tierInfo = LISTING_TIERS[data.listingTier];
      
      if (!tierInfo) {
        throw new Error('Invalid listing tier');
      }

      const listing = await TokenListing.create({
        projectName: data.projectName,
        tokenSymbol: data.tokenSymbol,
        contactEmail: data.contactEmail,
        contactName: data.contactName,
        website: data.website,
        whitepaper: data.whitepaper,
        contractAddress: data.contractAddress,
        listingTier: data.listingTier,
        fee: tierInfo.fee,
        description: data.description,
        teamInfo: data.teamInfo,
        auditReport: data.auditReport,
        status: 'pending',
        paymentStatus: 'unpaid'
      });

      logger.info('Token listing submitted', {
        id: listing.id,
        project: data.projectName,
        tier: data.listingTier,
        fee: tierInfo.fee
      });

      return {
        ...listing.toJSON(),
        tierInfo,
        paymentInstructions: this.getPaymentInstructions(listing.id, tierInfo.fee)
      };
    } catch (error) {
      logger.error('Error submitting token listing', { error: error.message });
      throw error;
    }
  }

  async getAllListings(filters = {}) {
    try {
      const where = {};
      
      if (filters.status) {
        where.status = filters.status;
      }
      
      if (filters.paymentStatus) {
        where.paymentStatus = filters.paymentStatus;
      }

      const listings = await TokenListing.findAll({
        where,
        order: [['createdAt', 'DESC']]
      });

      return listings.map(listing => ({
        ...listing.toJSON(),
        tierInfo: LISTING_TIERS[listing.listingTier]
      }));
    } catch (error) {
      logger.error('Error getting listings', { error: error.message });
      throw error;
    }
  }

  async getListing(id) {
    try {
      const listing = await TokenListing.findByPk(id);
      
      if (!listing) {
        throw new Error('Listing not found');
      }

      return {
        ...listing.toJSON(),
        tierInfo: LISTING_TIERS[listing.listingTier]
      };
    } catch (error) {
      logger.error('Error getting listing', { error: error.message, id });
      throw error;
    }
  }

  async approveListing(id, userId) {
    try {
      const listing = await TokenListing.findByPk(id);
      
      if (!listing) {
        throw new Error('Listing not found');
      }

      if (listing.paymentStatus !== 'paid') {
        throw new Error('Payment not confirmed');
      }

      await listing.update({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date()
      });

      logger.info('Token listing approved', { id, projectName: listing.projectName });

      return { success: true, message: 'Listing approved' };
    } catch (error) {
      logger.error('Error approving listing', { error: error.message, id });
      throw error;
    }
  }

  async rejectListing(id, reason) {
    try {
      const listing = await TokenListing.findByPk(id);
      
      if (!listing) {
        throw new Error('Listing not found');
      }

      await listing.update({
        status: 'rejected',
        notes: reason
      });

      logger.info('Token listing rejected', { id, reason });

      return { success: true, message: 'Listing rejected' };
    } catch (error) {
      logger.error('Error rejecting listing', { error: error.message, id });
      throw error;
    }
  }

  async confirmPayment(id, txHash) {
    try {
      const listing = await TokenListing.findByPk(id);
      
      if (!listing) {
        throw new Error('Listing not found');
      }

      await listing.update({
        paymentStatus: 'paid',
        paymentTxHash: txHash
      });

      logger.info('Payment confirmed for listing', { id, txHash, fee: listing.fee });

      return { success: true, message: 'Payment confirmed' };
    } catch (error) {
      logger.error('Error confirming payment', { error: error.message, id });
      throw error;
    }
  }

  async goLive(id, liveDate = new Date()) {
    try {
      const listing = await TokenListing.findByPk(id);
      
      if (!listing) {
        throw new Error('Listing not found');
      }

      if (listing.status !== 'approved') {
        throw new Error('Listing must be approved first');
      }

      await listing.update({
        status: 'live',
        liveDate
      });

      logger.info('Token listing went live', { id, projectName: listing.projectName });

      return { success: true, message: 'Token is now live' };
    } catch (error) {
      logger.error('Error making listing live', { error: error.message, id });
      throw error;
    }
  }

  getTierInfo(tier = 'basic') {
    return LISTING_TIERS[tier] || LISTING_TIERS.basic;
  }

  getAllTiers() {
    return LISTING_TIERS;
  }

  getPaymentInstructions(listingId, amount) {
    return {
      amount,
      methods: {
        btc: {
          address: 'YOUR_BTC_ADDRESS_HERE',
          amount: `${(amount / 45000).toFixed(8)} BTC`,
          note: `Include listing ID: ${listingId} in transaction`
        },
        eth: {
          address: 'YOUR_ETH_ADDRESS_HERE',
          amount: `${(amount / 3000).toFixed(6)} ETH`,
          note: `Include listing ID: ${listingId} in transaction`
        },
        usdt: {
          address: 'YOUR_USDT_ADDRESS_HERE',
          amount: `${amount} USDT`,
          network: 'ERC-20 or TRC-20',
          note: `Include listing ID: ${listingId} in transaction`
        },
        bank: {
          instructions: 'Contact support@tokentradex.com for wire transfer details',
          note: `Reference: Listing #${listingId}`
        }
      },
      reference: `LISTING-${listingId}`
    };
  }

  async getRevenueStats() {
    try {
      const paid = await TokenListing.findAll({
        where: { paymentStatus: 'paid' }
      });

      const totalRevenue = paid.reduce((sum, listing) => sum + parseFloat(listing.fee), 0);
      
      const pending = await TokenListing.count({
        where: { status: 'pending' }
      });

      const live = await TokenListing.count({
        where: { status: 'live' }
      });

      return {
        totalRevenue,
        paidListings: paid.length,
        pendingListings: pending,
        liveTokens: live,
        breakdown: paid.map(l => ({
          project: l.projectName,
          fee: parseFloat(l.fee),
          tier: l.listingTier,
          paidAt: l.updatedAt
        }))
      };
    } catch (error) {
      logger.error('Error getting revenue stats', { error: error.message });
      throw error;
    }
  }
}

module.exports = new TokenListingService();
