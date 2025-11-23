const { Order, Token, Wallet, User, sequelize } = require('./src/models');

async function fillPendingOrders() {
  try {
    const pending = await Order.findAll({
      where: { status: 'pending' },
      include: [{ model: Token, as: 'token' }]
    });
    
    console.log('Found', pending.length, 'pending orders');
    
    for (const order of pending) {
      const token = order.token;
      const quantity = parseFloat(order.quantity);
      const price = parseFloat(token.currentPrice);
      const totalValue = quantity * price;
      
      console.log('Filling order:', order.id, order.side, quantity, token.symbol, 'at', price);
      
      // Update order to filled
      await order.update({
        filledQuantity: quantity,
        status: 'filled',
        price: price,
        filledAt: new Date()
      });
      
      console.log(' Filled order', order.id);
    }
    
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fillPendingOrders();
