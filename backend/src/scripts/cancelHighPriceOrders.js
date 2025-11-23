const { Order, Token, Wallet, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Cancel unrealistic high-price limit orders
 * 
 * Usage: node backend/src/scripts/cancelHighPriceOrders.js
 */

async function cancelHighPriceOrders() {
  try {
    console.log('🔍 Finding unrealistic high-price limit orders...\n');

    // Find all pending/partial limit orders
    const orders = await Order.findAll({
      where: {
        orderType: 'limit',
        status: { [Op.in]: ['pending', 'partial'] }
      },
      include: [{
        model: Token,
        as: 'token',
        attributes: ['symbol', 'currentPrice']
      }]
    });

    console.log(`📊 Found ${orders.length} active limit orders\n`);

    let cancelledCount = 0;

    for (const order of orders) {
      const currentPrice = parseFloat(order.token.currentPrice);
      const orderPrice = parseFloat(order.price);
      
      // Calculate price difference percentage
      const priceDiff = Math.abs(((orderPrice - currentPrice) / currentPrice) * 100);
      
      // Cancel if price is >20% away from current market price
      if (priceDiff > 20) {
        console.log(`❌ Cancelling unrealistic order:`);
        console.log(`   ${order.token.symbol} ${order.side.toUpperCase()} at $${orderPrice.toFixed(2)}`);
        console.log(`   Current price: $${currentPrice.toFixed(2)} (${priceDiff.toFixed(1)}% away)`);
        console.log(`   Order ID: ${order.id}\n`);
        
        // Cancel the order
        await order.update({
          status: 'cancelled',
          cancelledAt: new Date()
        });

        // Unlock funds
        const wallet = await Wallet.findOne({
          where: {
            userId: order.userId,
            tokenId: order.side === 'sell' ? order.tokenId : (await Token.findOne({ where: { symbol: 'USDT' } })).id
          }
        });

        if (wallet) {
          const lockedAmount = order.side === 'sell'
            ? parseFloat(order.quantity) - parseFloat(order.filledQuantity || 0)
            : (parseFloat(order.quantity) - parseFloat(order.filledQuantity || 0)) * orderPrice;

          await wallet.update({
            lockedBalance: Math.max(0, parseFloat(wallet.lockedBalance) - lockedAmount)
          });

          console.log(`   💰 Unlocked ${lockedAmount.toFixed(8)} ${order.side === 'sell' ? order.token.symbol : 'USDT'}\n`);
        }

        cancelledCount++;
      }
    }

    if (cancelledCount === 0) {
      console.log('✅ No unrealistic orders found - all prices are within 20% of market');
    } else {
      console.log(`\n🎉 Cancelled ${cancelledCount} unrealistic order(s)`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the script
cancelHighPriceOrders()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
