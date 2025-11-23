const { Order, Token, Wallet, User, Trade, sequelize } = require('./src/models');

async function fillAllPendingOrders() {
  try {
    await sequelize.authenticate();
    console.log(' Connected to database');
    
    const pending = await Order.findAll({
      where: { status: 'pending' },
      include: [{ model: Token, as: 'token' }]
    });
    
    console.log(' Found', pending.length, 'pending orders');
    
    if (pending.length === 0) {
      console.log(' No pending orders to fill!');
      process.exit(0);
    }
    
    // Get USDT token
    const usdtToken = await Token.findOne({ where: { symbol: 'USDT' } });
    const exchangeUser = await User.findOne({ where: { email: 'exchange@tokentradex.internal' } });
    
    for (const order of pending) {
      const t = await sequelize.transaction();
      
      try {
        const token = order.token;
        const quantity = parseFloat(order.quantity);
        const price = parseFloat(token.currentPrice) * 1.005; // 0.5% slippage
        const totalValue = quantity * price;
        const userFee = totalValue * 0.001; // 0.1% fee
        
        console.log(' Filling:', order.id, order.side, quantity, token.symbol, '@', price.toFixed(8));
        
        // Get user wallet
        let userTokenWallet = await Wallet.findOne({
          where: { userId: order.userId, tokenId: token.id },
          transaction: t
        });
        
        if (!userTokenWallet) {
          userTokenWallet = await Wallet.create({
            userId: order.userId,
            tokenId: token.id,
            balance: 0,
            lockedBalance: 0
          }, { transaction: t });
        }
        
        let userUsdtWallet = await Wallet.findOne({
          where: { userId: order.userId, tokenId: usdtToken.id },
          transaction: t
        });
        
        if (order.side === 'buy') {
          // Update user wallets
          await userTokenWallet.update({
            balance: parseFloat(userTokenWallet.balance) + quantity
          }, { transaction: t });
          
          const totalCost = totalValue + userFee;
          await userUsdtWallet.update({
            balance: parseFloat(userUsdtWallet.balance) - totalCost,
            lockedBalance: Math.max(0, parseFloat(userUsdtWallet.lockedBalance) - totalCost)
          }, { transaction: t });
        }
        
        // Create trade record
        await Trade.create({
          buyOrderId: order.side === 'buy' ? order.id : null,
          sellOrderId: order.side === 'sell' ? order.id : null,
          buyerId: order.userId,
          sellerId: exchangeUser ? exchangeUser.id : order.userId,
          tokenId: token.id,
          quantity,
          price,
          totalValue,
          buyerFee: userFee,
          sellerFee: 0,
          tradeType: 'auto_fill'
        }, { transaction: t });
        
        // Update order to filled
        await order.update({
          filledQuantity: quantity,
          status: 'filled',
          price: price,
          filledAt: new Date()
        }, { transaction: t });
        
        await t.commit();
        console.log(' Filled:', order.id);
      } catch (error) {
        await t.rollback();
        console.error(' Failed to fill', order.id, ':', error.message);
      }
    }
    
    console.log(' All done!');
    process.exit(0);
  } catch (error) {
    console.error(' Error:', error);
    process.exit(1);
  }
}

fillAllPendingOrders();
