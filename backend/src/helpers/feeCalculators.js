const { Op } = require('sequelize');
const { FeeExemptAllowlist } = require('../models');

/**
 * Check if user has fee exemption
 */
async function hasFeeExemption(userId) {
  try {
    const exemption = await FeeExemptAllowlist.findOne({
      where: {
        userId,
        expiresAt: {
          [Op.gt]: new Date()
        }
      }
    });
    return !!exemption;
  } catch (error) {
    console.error('Error checking fee exemption:', error);
    return false;
  }
}

// Convert to 8-decimal integer
const toDec = (n) => BigInt(Math.round(Number(n) * 1e8));

// Convert from 8-decimal integer
const fromDec = (n) => Number(n) / 1e8;

/**
 * Calculate basis points fee
 * @param {number} amount 
 * @param {number} bps - Basis points (100 bps = 1%)
 * @returns {number}
 */
function calcBps(amount, bps) {
  // Use high precision
  const amountDec = toDec(amount);
  const bpsDec = BigInt(Math.round(bps));
  const feeDec = (amountDec * bpsDec) / BigInt(10000);
  return fromDec(feeDec);
}

/**
 * Apply minimum fee enforcement
 */
function applyMinFee(calculatedFee, minAbsolute) {
  return Math.max(calculatedFee, minAbsolute);
}

/**
 * Calculate fee with minimum enforcement
 */
function minFee(amount, bps, minAbsolute) {
  const fee = calcBps(amount, bps);
  return applyMinFee(fee, minAbsolute);
}

/**
 * Fee table configurations
 */
const DEFAULT_FEE_TABLES = {
  // Trading fees per pair
  trading: {
    'TTX-USD': { makerBps: 8, takerBps: 12, minAbs: 0.01 },
    'BTC-USD': { makerBps: 10, takerBps: 15, minAbs: 0.01 },
    'ETH-USD': { makerBps: 10, takerBps: 15, minAbs: 0.01 },
    // Forex pairs
    'EUR/USD': { makerBps: 5, takerBps: 8, minAbs: 0.01 },
    'GBP/USD': { makerBps: 5, takerBps: 8, minAbs: 0.01 },
    'USD/JPY': { makerBps: 5, takerBps: 8, minAbs: 0.01 },
    'USD/CHF': { makerBps: 5, takerBps: 8, minAbs: 0.01 },
    'AUD/USD': { makerBps: 5, takerBps: 8, minAbs: 0.01 },
    'USD/CAD': { makerBps: 5, takerBps: 8, minAbs: 0.01 },
    'NZD/USD': { makerBps: 5, takerBps: 8, minAbs: 0.01 },
    'EUR/GBP': { makerBps: 5, takerBps: 8, minAbs: 0.01 },
    'EUR/JPY': { makerBps: 5, takerBps: 8, minAbs: 0.01 },
    'DEFAULT': { makerBps: 12, takerBps: 18, minAbs: 0.01 }
  },
  
  // Withdrawal fees per asset
  withdrawal: {
    'USD': { base: 0.50, bps: 50, minAbs: 1.00 },  // $0.50 + 0.5%
    'BTC': { base: 0.0001, bps: 10, minAbs: 0.0001 },
    'ETH': { base: 0.001, bps: 10, minAbs: 0.001 },
    'TTX': { base: 1.0, bps: 25, minAbs: 2.00 },
    // Forex pairs base currencies
    'EUR': { base: 0.50, bps: 50, minAbs: 1.00 },
    'GBP': { base: 0.50, bps: 50, minAbs: 1.00 },
    'JPY': { base: 50, bps: 50, minAbs: 100 },
    'CHF': { base: 0.50, bps: 50, minAbs: 1.00 },
    'AUD': { base: 0.50, bps: 50, minAbs: 1.00 },
    'CAD': { base: 0.50, bps: 50, minAbs: 1.00 },
    'NZD': { base: 0.50, bps: 50, minAbs: 1.00 },
    'DEFAULT': { base: 1.0, bps: 50, minAbs: 1.00 }
  }
};

/**
 * Calculate expected trading fee
 * @param {Object} opts
 * @param {'MAKER'|'TAKER'} opts.role
 * @param {number} opts.notional - Trade value in quote currency
 * @param {string} opts.pair - Trading pair (e.g., 'BTC-USD')
 * @param {Object} opts.feeTable - Optional custom fee table
 */
function expectedTradeFee(opts) {
  const { role, notional, pair, feeTable = DEFAULT_FEE_TABLES.trading } = opts;
  
  const config = feeTable[pair] || feeTable['DEFAULT'];
  if (!config) {
    throw new Error(`No fee configuration for pair: ${pair}`);
  }

  const bps = role === 'MAKER' ? config.makerBps : config.takerBps;
  const fee = minFee(notional, bps, config.minAbs);

  return {
    fee: parseFloat(fee.toFixed(8)),
    bps,
    minAbs: config.minAbs,
    role
  };
}

/**
 * Calculate expected withdrawal fee
 * @param {Object} opts
 * @param {string} opts.asset
 * @param {number} opts.amount
 * @param {Object} opts.table - Optional custom fee table
 * @param {number} opts.congestionMultiplier - Network congestion (1.0 = normal, 3.0 = high)
 */
function expectedWithdrawalFee(opts) {
  const { 
    asset, 
    amount, 
    table = DEFAULT_FEE_TABLES.withdrawal,
    congestionMultiplier = 1.0 
  } = opts;

  const config = table[asset] || table['DEFAULT'];
  if (!config) {
    throw new Error(`No withdrawal fee configuration for asset: ${asset}`);
  }

  // Calculate variable fee
  const variableFee = calcBps(amount, config.bps);

  // Base + variable
  const baseFee = config.base + variableFee;
  
  // Apply congestion multiplier
  const finalFee = baseFee * congestionMultiplier;
  
  // Enforce minimum
  const fee = Math.max(finalFee, config.minAbs);

  return {
    fee: parseFloat(fee.toFixed(8)),
    baseFee: parseFloat(baseFee.toFixed(8)),
    congestionMultiplier,
    config
  };
}

/**
 * Get network congestion multiplier
 * TODO: Integrate with real network monitoring
 */
function getCongestion(asset) {
  // Placeholder - integrate with actual network monitoring
  const congestionMap = {
    'BTC': 1.2,  // Slightly congested
    'ETH': 1.5,  // Moderately congested
    'USD': 1.0,  // No congestion (fiat)
    'DEFAULT': 1.0
  };
  
  return congestionMap[asset] || congestionMap['DEFAULT'];
}

module.exports = {
  toDec,
  fromDec,
  calcBps,
  applyMinFee,
  minFee,
  hasFeeExemption,
  expectedTradeFee,
  expectedWithdrawalFee,
  getCongestion,
  DEFAULT_FEE_TABLES
};