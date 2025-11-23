const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { sequelize, Wallet, Token, User, StakingPosition, LendingPosition } = require('../models');
const revenueCollector = require('../helpers/revenueCollector');

/**
 * Test endpoints to trigger revenue streams
 * These simulate user actions that generate revenue
 */

// Test Stream 1: Withdrawal Fee
router.post('/test-withdrawal-fee', protect, async (req, res) => {
  try {
    // Simulate a withdrawal with fee
    const amount = 10; // 10 USDT withdrawal
    const feePercent = 0.5;
    const fee = amount * (feePercent / 100);
    const feeUSD = fee * 1; // USDT = $1
    
    await revenueCollector.collectRevenue(
      1,
      feeUSD,
      'Test withdrawal fee collection'
    );
    
    res.json({
      success: true,
      message: 'Withdrawal fee test successful',
      collected: feeUSD
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Stream 3: API Licensing (create a test API key)
router.post('/test-api-license', protect, async (req, res) => {
  try {
    const tier = 'professional'; // $99/month
    const monthlyFee = 99;
    
    await revenueCollector.collectRevenue(
      3,
      monthlyFee,
      `Test API License: ${tier} tier`
    );
    
    res.json({
      success: true,
      message: 'API license fee test successful',
      tier,
      collected: monthlyFee
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Stream 5: Lending Interest
router.post('/test-lending-fee', protect, async (req, res) => {
  try {
    const principal = 1000; // $1000 lent
    const interestRate = 0.12; // 12% APR
    const days = 30;
    const interest = principal * (interestRate / 365) * days;
    const platformFee = interest * 0.15; // 15% of interest
    
    await revenueCollector.collectRevenue(
      5,
      platformFee,
      `Test lending interest: 15% of $${interest.toFixed(2)}`
    );
    
    res.json({
      success: true,
      message: 'Lending fee test successful',
      interest: interest.toFixed(2),
      collected: platformFee.toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Stream 6: Staking Commission
router.post('/test-staking-fee', protect, async (req, res) => {
  try {
    const stakedAmount = 1000; // 1000 TTX
    const rewardRate = 0.20; // 20% APY
    const days = 30;
    const rewards = stakedAmount * (rewardRate / 365) * days;
    const commission = rewards * 0.10; // 10% commission
    const commissionUSD = commission * 0.065; // TTX price ~$0.065
    
    await revenueCollector.collectRevenue(
      6,
      commissionUSD,
      `Test staking commission: 10% of ${rewards.toFixed(2)} TTX rewards`
    );
    
    res.json({
      success: true,
      message: 'Staking commission test successful',
      rewards: rewards.toFixed(2),
      commission: commission.toFixed(2),
      collected: commissionUSD.toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Stream 7: Copy Trading Fee
router.post('/test-copy-trading-fee', protect, async (req, res) => {
  try {
    const profit = 500; // Follower made $500 profit
    const performanceFee = 0.20; // 20% performance fee
    const fee = profit * performanceFee;
    
    await revenueCollector.collectRevenue(
      7,
      fee,
      `Test copy trading: 20% of $${profit} profit`
    );
    
    res.json({
      success: true,
      message: 'Copy trading fee test successful',
      profit,
      feePercent: performanceFee * 100,
      collected: fee
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Stream 8: White Label Licensing
router.post('/test-white-label-fee', protect, async (req, res) => {
  try {
    const tier = 'enterprise'; // $999/month
    const monthlyFee = 999;
    
    await revenueCollector.collectRevenue(
      8,
      monthlyFee,
      `Test white label license: ${tier} tier`
    );
    
    res.json({
      success: true,
      message: 'White label license test successful',
      tier,
      collected: monthlyFee
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Stream 9: NFT Position Fee
router.post('/test-nft-position-fee', protect, async (req, res) => {
  try {
    const mintPrice = 0.1; // 0.1 ETH
    const ethPrice = 2000; // $2000/ETH
    const mintFee = mintPrice * ethPrice;
    
    await revenueCollector.collectRevenue(
      9,
      mintFee,
      `Test NFT position mint: ${mintPrice} ETH`
    );
    
    res.json({
      success: true,
      message: 'NFT position fee test successful',
      mintPrice,
      ethPrice,
      collected: mintFee
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test all streams at once
router.post('/test-all-streams', protect, async (req, res) => {
  try {
    const results = [];
    
    // Stream 1: Withdrawal Fee ($0.05)
    await revenueCollector.collectRevenue(1, 0.05, 'Test: Withdrawal fee');
    results.push({ stream: 1, name: 'Withdrawal Fees', amount: 0.05 });
    
    // Stream 3: API Licensing ($99)
    await revenueCollector.collectRevenue(3, 99, 'Test: API license');
    results.push({ stream: 3, name: 'API Licensing', amount: 99 });
    
    // Stream 5: Lending Interest ($1.48)
    await revenueCollector.collectRevenue(5, 1.48, 'Test: Lending interest');
    results.push({ stream: 5, name: 'Lending Interest', amount: 1.48 });
    
    // Stream 6: Staking Commission ($1.07)
    await revenueCollector.collectRevenue(6, 1.07, 'Test: Staking commission');
    results.push({ stream: 6, name: 'Staking Commissions', amount: 1.07 });
    
    // Stream 7: Copy Trading ($100)
    await revenueCollector.collectRevenue(7, 100, 'Test: Copy trading fee');
    results.push({ stream: 7, name: 'Copy Trading Fees', amount: 100 });
    
    // Stream 8: White Label ($999)
    await revenueCollector.collectRevenue(8, 999, 'Test: White label license');
    results.push({ stream: 8, name: 'White Label Licensing', amount: 999 });
    
    // Stream 9: NFT Position ($200)
    await revenueCollector.collectRevenue(9, 200, 'Test: NFT position mint');
    results.push({ stream: 9, name: 'NFT Position Fees', amount: 200 });
    
    const total = results.reduce((sum, r) => sum + r.amount, 0);
    
    res.json({
      success: true,
      message: 'All 7 inactive streams tested successfully!',
      results,
      totalCollected: total.toFixed(2),
      note: 'These are test collections. Real revenue will come from actual user activity.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
