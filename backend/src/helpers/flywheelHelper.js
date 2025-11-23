// Default platform revenue constant ($500K monthly)
const DEFAULT_PLATFORM_REVENUE = 500000;

const { Wallet, Token, Trade } = require('../models');
const revenueStreamService = require('../services/revenueStreamService');
const marketComparisonService = require('../services/marketComparisonService');
const { Op } = require('sequelize');
const { sanitizeWalletBalance, sanitizeOrderValue } = require('./flywheelInputValidator');

/**
 * Calculate user's flywheel impact metrics
 * Centralized helper for consistent TTX metrics across endpoints
 * 
 * @param {string} userId - User ID
 * @returns {Object} User's flywheel impact data
 */
async function calculateUserImpact(userId) {
  try {
    // Get user's actual TTX balance from wallet
    const ttxToken = await Token.findOne({ where: { symbol: 'TTX' } });
    let userTTXBalance = 0;
    
    if (ttxToken) {
      const ttxWallet = await Wallet.findOne({
        where: { userId, tokenId: ttxToken.id }
      });
      userTTXBalance = ttxWallet ? sanitizeWalletBalance(ttxWallet.balance) : 0;
    }
    
    // Calculate user's monthly trading volume from actual trades
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const userTrades = await Trade.findAll({
      where: {
        [Op.or]: [
          { buyerId: userId },
          { sellerId: userId }
        ],
        createdAt: { [Op.gte]: oneMonthAgo }
      }
    });
    
    const userMonthlyVolume = userTrades.reduce((sum, trade) => {
      return sum + sanitizeOrderValue(trade.totalValue || 0);
    }, 0);
    
    // Get actual platform revenue from revenue streams
    const flywheelMetrics = await revenueStreamService.getFlywheelMetrics();
    const actualPlatformRevenue = flywheelMetrics.totalPlatformRevenue || DEFAULT_PLATFORM_REVENUE; // Fallback to default if no revenue yet
    
    // Calculate earnings using actual platform revenue
    const earnings = revenueStreamService.calculateUserMonthlyEarnings(
      userTTXBalance,
      actualPlatformRevenue
    );
    
    // Get competitor comparison benefits
    const benefits = marketComparisonService.getUserBenefits(
      userMonthlyVolume,
      userTTXBalance
    );
    
    return {
      ttxHoldings: userTTXBalance,
      monthlyVolume: userMonthlyVolume,
      monthlyEarnings: earnings.monthlyEarnings,
      annualEarnings: earnings.annualEarnings,
      tier: earnings.tier,
      revenueMultiplier: earnings.revenueMultiplier,
      vsCompetitors: benefits,
      platformRevenue: actualPlatformRevenue,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to calculate user impact: ${error.message}`);
  }
}

/**
 * Convert user impact data to CSV format
 * 
 * @param {Object} impactData - User impact data from calculateUserImpact
 * @returns {string} CSV formatted string
 */
function formatImpactAsCSV(impactData) {
  const headers = [
    'Metric',
    'Value',
    'Details'
  ];
  
  const rows = [
    ['TTX Holdings', impactData.ttxHoldings.toFixed(2), 'Your current TTX token balance'],
    ['Monthly Trading Volume', `$${impactData.monthlyVolume.toFixed(2)}`, 'Your trading activity in the last 30 days'],
    ['Monthly Earnings', `$${impactData.monthlyEarnings.toFixed(2)}`, 'Passive income from revenue sharing'],
    ['Annual Earnings', `$${impactData.annualEarnings.toFixed(2)}`, 'Yearly passive income projection'],
    ['Tier', impactData.tier, 'Your current earnings tier'],
    ['Revenue Multiplier', impactData.revenueMultiplier, 'Earnings multiplier based on holdings'],
    ['Platform Revenue', `$${impactData.platformRevenue.toFixed(2)}`, 'Total platform revenue this month'],
    ['Vs Binance Savings', `$${impactData.vsCompetitors.binanceVsTTX.ttxTotal.toFixed(2)}`, 'Monthly savings vs Binance'],
    ['Vs Competitor Winner', impactData.vsCompetitors.binanceVsTTX.winner, 'Platform with better benefits'],
    ['Report Generated', impactData.timestamp, 'UTC timestamp']
  ];
  
  // Convert to CSV format
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(field => `"${field}"`).join(',') + '\n';
  });
  
  return csv;
}

/**
 * Generate personal improvement insights for a user
 * Provides actionable recommendations to increase TTX earnings
 * 
 * @param {Object} impactData - User impact data from calculateUserImpact
 * @returns {Object} Personal improvement insights and recommendations
 */
function generatePersonalInsights(impactData) {
  const insights = {
    currentStatus: {
      tier: impactData.tier,
      monthlyEarnings: impactData.monthlyEarnings,
      annualEarnings: impactData.annualEarnings,
      ttxHoldings: impactData.ttxHoldings,
      monthlyVolume: impactData.monthlyVolume
    },
    recommendations: [],
    potentialUpside: {
      maxMonthlyEarnings: 0,
      maxAnnualEarnings: 0,
      roiImprovement: 0
    }
  };
  
  // Recommendation 1: Increase TTX holdings for better tier
  const tierThresholds = [
    { minBalance: 100, name: 'Bronze' },
    { minBalance: 1000, name: 'Silver' },
    { minBalance: 10000, name: 'Gold' },
    { minBalance: 100000, name: 'Platinum' },
    { minBalance: 1000000, name: 'Diamond' }
  ];
  
  // Find next tier
  const nextTier = tierThresholds.find(tier => tier.minBalance > impactData.ttxHoldings);
  if (nextTier) {
    const additionalHoldings = nextTier.minBalance - impactData.ttxHoldings;
    const higherTierEarnings = revenueStreamService.calculateUserMonthlyEarnings(
      nextTier.minBalance,
      impactData.platformRevenue
    );
    
    insights.recommendations.push({
      id: 'increase_holdings',
      title: `Upgrade to ${nextTier.name} Tier`,
      description: `Acquire ${additionalHoldings.toFixed(0)} more TTX to unlock ${nextTier.name} benefits`,
      action: `Buy ${additionalHoldings.toFixed(0)} TTX tokens`,
      potentialGain: Math.max(0, higherTierEarnings.monthlyEarnings - impactData.monthlyEarnings),
      timeframe: 'Immediate'
    });
    
    insights.potentialUpside.maxMonthlyEarnings = Math.max(
      insights.potentialUpside.maxMonthlyEarnings,
      higherTierEarnings.monthlyEarnings
    );
  }
  
  // Recommendation 2: Increase trading volume
  if (impactData.monthlyVolume < 10000) {
    const additionalVolume = 10000 - impactData.monthlyVolume;
    // Estimate earnings increase from higher volume (proportional to volume)
    const volumeIncreaseRatio = additionalVolume / Math.max(impactData.monthlyVolume, 1);
    const estimatedEarningsIncrease = impactData.monthlyEarnings * volumeIncreaseRatio;
    
    insights.recommendations.push({
      id: 'increase_volume',
      title: 'Increase Trading Activity',
      description: `Trade $${additionalVolume.toFixed(0)} more monthly to maximize earnings`,
      action: `Execute trades worth $${additionalVolume.toFixed(0)}`,
      potentialGain: Math.max(0, estimatedEarningsIncrease),
      timeframe: 'Monthly'
    });
    
    insights.potentialUpside.maxMonthlyEarnings = Math.max(
      insights.potentialUpside.maxMonthlyEarnings,
      impactData.monthlyEarnings + estimatedEarningsIncrease
    );
  }
  
  // Recommendation 3: Staking benefits
  if (impactData.ttxHoldings > 0) {
    insights.recommendations.push({
      id: 'explore_staking',
      title: 'Explore Staking Opportunities',
      description: 'Consider staking TTX for additional yield',
      action: 'Visit staking section to learn more',
      potentialGain: impactData.monthlyEarnings * 0.2, // Estimate 20% additional from staking
      timeframe: 'Ongoing'
    });
  }
  
  // Calculate potential upside
  insights.potentialUpside.maxAnnualEarnings = insights.potentialUpside.maxMonthlyEarnings * 12;
  insights.potentialUpside.roiImprovement = insights.potentialUpside.maxAnnualEarnings > 0 ? 
    ((insights.potentialUpside.maxAnnualEarnings - impactData.annualEarnings) / impactData.annualEarnings) * 100 : 0;
  
  return insights;
}

module.exports = {
  calculateUserImpact,
  formatImpactAsCSV,
  generatePersonalInsights,
  DEFAULT_PLATFORM_REVENUE
};