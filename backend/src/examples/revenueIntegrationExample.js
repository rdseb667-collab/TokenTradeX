/**
 * Revenue System Integration Examples
 * Shows how to integrate fee calculators and revenue recording into existing flows
 */

const { recordRevenue } = require('../services/revenueEventService');
const { expectedTradeFee, expectedWithdrawalFee, getCongestion, isFeeExempt } = require('../helpers/feeCalculators');

/**
 * EXAMPLE 1: Trading Fee Collection (on trade fill)
 * Integrate this into your orderMatchingService or tradeController
 */
async function onTradeFillCommitted(fill) {
  const { 
    orderId, 
    tradeId,
    userId, 
    role,        // 'MAKER' or 'TAKER'
    notional,    // trade value in USD
    pair,        // e.g., 'BTC-USD'
    tokenId 
  } = fill;

  try {
    // Check if user is exempt from fees
    if (await isFeeExempt(userId)) {
      console.log('User is fee-exempt, skipping fee collection', { userId });
      return { feeCharged: 0, exempted: true };
    }

    // Calculate expected fee
    const { fee, bps } = expectedTradeFee({
      role,
      notional,
      pair
    });

    // Record revenue event (idempotent via refId)
    const { event, isNew } = await recordRevenue({
      stream: 'TRADING_FEES',
      userId,
      amount: fee,
      asset: 'USD',
      notional,
      feeBps: bps,
      refId: `trade:${tradeId}`,  // Idempotent key
      metadata: {
        orderId,
        tradeId,
        pair,
        role,
        tokenId,
        calculatedAt: new Date()
      }
    });

    console.log('Trading fee recorded', {
      userId,
      tradeId,
      fee,
      role,
      isNew  // false if already recorded (idempotent retry)
    });

    return { feeCharged: fee, exempted: false, eventId: event.id };

  } catch (error) {
    console.error('Failed to record trading fee', {
      userId,
      tradeId,
      error: error.message
    });
    // Don't fail the trade - log to DLQ for retry
    throw error;
  }
}

/**
 * EXAMPLE 2: Withdrawal Fee Collection
 * Integrate this into your walletController.withdraw
 */
async function onWithdrawalConfirmed(withdrawal) {
  const {
    id,           // withdrawal transaction ID
    userId,
    tokenSymbol,  // e.g., 'BTC', 'ETH', 'USD'
    amount,
    isInternal    // internal transfers are free
  } = withdrawal;

  try {
    // Skip fee for internal transfers
    if (isInternal) {
      console.log('Internal transfer, no fee', { id, userId });
      return { feeCharged: 0, internal: true };
    }

    // Check exemption
    if (await isFeeExempt(userId)) {
      console.log('User is fee-exempt for withdrawal', { userId });
      return { feeCharged: 0, exempted: true };
    }

    // Get current network congestion
    const congestion = getCongestion(tokenSymbol);

    // Calculate withdrawal fee
    const { fee, baseFee, congestionMultiplier } = expectedWithdrawalFee({
      asset: tokenSymbol,
      amount,
      congestionMultiplier: congestion
    });

    // Record revenue event
    const { event, isNew } = await recordRevenue({
      stream: 'WITHDRAWAL_FEES',
      userId,
      amount: fee,
      asset: tokenSymbol,
      refId: `withdrawal:${id}`,  // Idempotent key
      metadata: {
        withdrawalId: id,
        tokenSymbol,
        amount,
        baseFee,
        congestionMultiplier,
        networkCongestion: congestion
      }
    });

    console.log('Withdrawal fee recorded', {
      userId,
      withdrawalId: id,
      fee,
      congestion,
      isNew
    });

    return { feeCharged: fee, exempted: false, eventId: event.id };

  } catch (error) {
    console.error('Failed to record withdrawal fee', {
      userId,
      withdrawalId: id,
      error: error.message
    });
    throw error;
  }
}

/**
 * EXAMPLE 3: Subscription Payment (from webhook or internal)
 */
async function onSubscriptionPayment(payment) {
  const {
    userId,
    planId,
    amount,
    currency,
    paymentId,
    provider  // 'stripe', 'coinbase', 'internal'
  } = payment;

  try {
    const { event, isNew } = await recordRevenue({
      stream: 'PREMIUM_SUBS',
      userId,
      amount,
      asset: currency,
      refId: `sub_payment:${paymentId}`,
      metadata: {
        planId,
        provider,
        paymentId,
        billingCycle: 'monthly'
      }
    });

    console.log('Subscription payment recorded', {
      userId,
      paymentId,
      amount,
      isNew
    });

    return { recorded: true, eventId: event.id };

  } catch (error) {
    console.error('Failed to record subscription payment', {
      userId,
      paymentId,
      error: error.message
    });
    throw error;
  }
}

/**
 * EXAMPLE 4: Subscription Refund
 */
async function onSubscriptionRefund(refund) {
  const {
    userId,
    originalPaymentId,
    refundAmount,
    reason
  } = refund;

  try {
    // Record negative revenue event
    const { event, isNew } = await recordRevenue({
      stream: 'PREMIUM_SUBS',
      userId,
      amount: -Math.abs(refundAmount),  // Negative amount
      asset: 'USD',
      refId: `sub_refund:${originalPaymentId}`,
      metadata: {
        reason,
        originalPaymentId,
        isRefund: true
      }
    });

    console.log('Subscription refund recorded', {
      userId,
      originalPaymentId,
      refundAmount,
      isNew
    });

    return { recorded: true, eventId: event.id };

  } catch (error) {
    console.error('Failed to record subscription refund', {
      userId,
      originalPaymentId,
      error: error.message
    });
    throw error;
  }
}

/**
 * EXAMPLE 5: Copy Trading Fee (performance fee with high-water mark)
 */
async function onCopyTradingSettlement(settlement) {
  const {
    followerId,
    traderId,
    periodEndDate,
    totalProfit,
    performanceFeePct  // e.g., 20 (20%)
  } = settlement;

  try {
    // Calculate performance fee
    const fee = (totalProfit * performanceFeePct) / 100;

    // Record fee split between platform and trader
    const platformShare = fee * 0.15;  // 15% to platform
    const traderShare = fee * 0.85;    // 85% to trader

    // Record platform revenue
    const { event } = await recordRevenue({
      stream: 'COPY_TRADING_FEES',
      userId: followerId,
      counterpartyId: traderId,
      amount: platformShare,
      asset: 'USD',
      refId: `copy_fee:${followerId}:${traderId}:${periodEndDate.toISOString()}`,
      metadata: {
        totalProfit,
        performanceFeePct,
        traderShare,
        platformShare,
        periodEnd: periodEndDate
      }
    });

    console.log('Copy trading fee recorded', {
      followerId,
      traderId,
      totalProfit,
      fee,
      platformShare
    });

    return { recorded: true, eventId: event.id, traderShare };

  } catch (error) {
    console.error('Failed to record copy trading fee', {
      followerId,
      traderId,
      error: error.message
    });
    throw error;
  }
}

/**
 * EXAMPLE 6: Lending Interest
 */
async function onLendingInterestAccrued(accrual) {
  const {
    lendingPositionId,
    lenderId,
    borrowerId,
    interestAmount,
    tokenSymbol,
    period
  } = accrual;

  try {
    const platformFee = interestAmount * 0.15;  // 15% platform commission

    const { event } = await recordRevenue({
      stream: 'LENDING_INTEREST',
      userId: lenderId,
      counterpartyId: borrowerId,
      amount: platformFee,
      asset: tokenSymbol,
      refId: `lending_interest:${lendingPositionId}:${period}`,
      metadata: {
        lendingPositionId,
        totalInterest: interestAmount,
        lenderShare: interestAmount - platformFee,
        platformFee,
        period
      }
    });

    console.log('Lending interest recorded', {
      lendingPositionId,
      platformFee,
      totalInterest: interestAmount
    });

    return { recorded: true, eventId: event.id };

  } catch (error) {
    console.error('Failed to record lending interest', {
      lendingPositionId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  onTradeFillCommitted,
  onWithdrawalConfirmed,
  onSubscriptionPayment,
  onSubscriptionRefund,
  onCopyTradingSettlement,
  onLendingInterestAccrued
};
