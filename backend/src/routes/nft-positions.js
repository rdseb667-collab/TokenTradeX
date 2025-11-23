const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const NFTPosition = require('../models/NFTPosition');
const { Order, Token, User } = require('../models');
const revenueStreamService = require('../services/revenueStreamService');

/**
 * NFT POSITION TRADING - Stream #9
 * Revolutionary marketplace for trading positions as NFTs
 */

// GET /api/nft-positions/marketplace - Browse all listed NFTs
router.get('/marketplace', async (req, res) => {
  try {
    const { positionType, minPrice, maxPrice, sortBy = 'createdAt', order = 'DESC' } = req.query;
    
    const where = { status: 'listed' };
    if (positionType) where.positionType = positionType;
    if (minPrice) where.listingPrice = { [Op.gte]: parseFloat(minPrice) };
    if (maxPrice) where.listingPrice = { ...where.listingPrice, [Op.lte]: parseFloat(maxPrice) };
    
    const nfts = await NFTPosition.findAll({
      where,
      include: [
        { model: User, as: 'originalOwner', attributes: ['id', 'username'] },
        { model: User, as: 'currentOwner', attributes: ['id', 'username'] }
      ],
      order: [[sortBy, order]],
      limit: 50
    });
    
    res.json({ success: true, nfts, count: nfts.length });
  } catch (error) {
    console.error('Get marketplace error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/nft-positions/my-nfts - Get user's NFT positions
router.get('/my-nfts', protect, async (req, res) => {
  try {
    const nfts = await NFTPosition.findAll({
      where: { currentOwnerId: req.user.id },
      include: [
        { model: User, as: 'originalOwner', attributes: ['id', 'username'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Calculate total portfolio value
    const totalValue = nfts.reduce((sum, nft) => {
      return sum + parseFloat(nft.unrealizedPnL || 0);
    }, 0);
    
    res.json({
      success: true,
      nfts,
      portfolio: {
        totalNFTs: nfts.length,
        totalValue,
        listed: nfts.filter(n => n.status === 'listed').length,
        active: nfts.filter(n => n.status === 'active').length
      }
    });
  } catch (error) {
    console.error('Get my NFTs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/nft-positions/mint - Mint position as NFT
router.post('/mint', protect, async (req, res) => {
  try {
    const { orderId, name, description, royaltyPercent = 5 } = req.body;
    
    if (!orderId || !name) {
      return res.status(400).json({ success: false, error: 'orderId and name required' });
    }
    
    // Get the filled order
    const order = await Order.findOne({
      where: { id: orderId, userId: req.user.id, status: 'filled' },
      include: [{ model: Token, as: 'token' }]
    });
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Filled order not found' });
    }
    
    // Check if already minted
    const existing = await NFTPosition.findOne({
      where: { tokenId: `pos_${orderId}` }
    });
    
    if (existing) {
      return res.status(400).json({ success: false, error: 'Position already minted as NFT' });
    }
    
    // Calculate current P/L
    const entryPrice = parseFloat(order.price);
    const currentPrice = parseFloat(order.token.currentPrice);
    const quantity = parseFloat(order.filledQuantity);
    const leverage = 1.0; // Default for spot
    
    const unrealizedPnL = order.side === 'buy'
      ? (currentPrice - entryPrice) * quantity
      : (entryPrice - currentPrice) * quantity;
    
    const unrealizedPnLPercent = ((unrealizedPnL / (entryPrice * quantity)) * 100);
    
    // Mint NFT
    const nft = await NFTPosition.create({
      tokenId: `pos_${orderId}`,
      name,
      description: description || `${order.side.toUpperCase()} ${quantity} ${order.token.symbol} @ $${entryPrice}`,
      originalOwnerId: req.user.id,
      currentOwnerId: req.user.id,
      positionType: 'spot',
      tokenSymbol: order.token.symbol,
      entryPrice,
      quantity,
      leverage,
      currentPrice,
      unrealizedPnL,
      unrealizedPnLPercent,
      status: 'active',
      royaltyPercent: parseFloat(royaltyPercent),
      platformFeePercent: 2.5,
      transactionHash: `0x${Date.now().toString(16)}`
    });
    
    res.json({
      success: true,
      message: `Position minted as NFT! Token ID: ${nft.tokenId}`,
      nft
    });
  } catch (error) {
    console.error('Mint NFT error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/nft-positions/:nftId/list - List NFT for sale
router.post('/:nftId/list', protect, async (req, res) => {
  try {
    const { listingPrice, minOffer } = req.body;
    
    if (!listingPrice) {
      return res.status(400).json({ success: false, error: 'listingPrice required' });
    }
    
    const nft = await NFTPosition.findOne({
      where: { id: req.params.nftId, currentOwnerId: req.user.id }
    });
    
    if (!nft) {
      return res.status(404).json({ success: false, error: 'NFT not found or not owned by you' });
    }
    
    if (nft.status === 'listed') {
      return res.status(400).json({ success: false, error: 'NFT already listed' });
    }
    
    await nft.update({
      status: 'listed',
      listingPrice: parseFloat(listingPrice),
      minOffer: minOffer ? parseFloat(minOffer) : parseFloat(listingPrice) * 0.9,
      listedAt: new Date()
    });
    
    res.json({
      success: true,
      message: `NFT listed for $${listingPrice}`,
      nft
    });
  } catch (error) {
    console.error('List NFT error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/nft-positions/:nftId/buy - Purchase NFT
router.post('/:nftId/buy', protect, async (req, res) => {
  try {
    const { offerPrice } = req.body;
    
    const nft = await NFTPosition.findOne({
      where: { id: req.params.nftId, status: 'listed' },
      include: [
        { model: User, as: 'originalOwner', attributes: ['id', 'username'] },
        { model: User, as: 'currentOwner', attributes: ['id', 'username'] }
      ]
    });
    
    if (!nft) {
      return res.status(404).json({ success: false, error: 'NFT not listed for sale' });
    }
    
    if (nft.currentOwnerId === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot buy your own NFT' });
    }
    
    const salePrice = offerPrice ? parseFloat(offerPrice) : parseFloat(nft.listingPrice);
    
    // Check if offer meets minimum
    if (salePrice < parseFloat(nft.minOffer)) {
      return res.status(400).json({ 
        success: false, 
        error: `Offer too low. Minimum: $${nft.minOffer}` 
      });
    }
    
    // Calculate fees (Stream #9)
    const platformFee = salePrice * (parseFloat(nft.platformFeePercent) / 100); // 2.5%
    const royaltyFee = salePrice * (parseFloat(nft.royaltyPercent) / 100); // 5%
    const sellerProceeds = salePrice - platformFee - royaltyFee;
    
    // Update NFT ownership
    const previousOwnerId = nft.currentOwnerId;
    await nft.update({
      currentOwnerId: req.user.id,
      status: 'active',
      lastSalePrice: salePrice,
      lastSaleDate: new Date(),
      totalSales: nft.totalSales + 1,
      totalVolume: parseFloat(nft.totalVolume) + salePrice,
      totalRoyaltiesPaid: parseFloat(nft.totalRoyaltiesPaid) + royaltyFee,
      totalPlatformFees: parseFloat(nft.totalPlatformFees) + platformFee,
      listingPrice: null,
      listedAt: null
    });
    
    // Collect NFT marketplace fee (Stream #9)
    setImmediate(async () => {
      try {
        await require('../helpers/revenueCollector').collectRevenue(
          9,
          platformFee,
          `NFT Sale: ${nft.name} - $${salePrice}`
        );
        console.log(`🖼️ NFT marketplace fee: $${platformFee.toFixed(2)} (2.5% of $${salePrice})`);
      } catch (error) {
        console.error('Failed to collect NFT fee:', error.message);
      }
    });
    
    res.json({
      success: true,
      message: `NFT purchased for $${salePrice}!`,
      sale: {
        nft: nft.name,
        salePrice,
        platformFee,
        royaltyFee,
        sellerProceeds,
        buyer: req.user.username,
        seller: nft.currentOwner.username,
        originalCreator: nft.originalOwner.username,
        breakdown: {
          seller: `$${sellerProceeds.toFixed(2)}`,
          creator: `$${royaltyFee.toFixed(2)} (royalty)`,
          platform: `$${platformFee.toFixed(2)} (fee)`
        }
      },
      nft
    });
  } catch (error) {
    console.error('Buy NFT error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/nft-positions/:nftId/unlist - Remove listing
router.delete('/:nftId/unlist', protect, async (req, res) => {
  try {
    const nft = await NFTPosition.findOne({
      where: { id: req.params.nftId, currentOwnerId: req.user.id }
    });
    
    if (!nft) {
      return res.status(404).json({ success: false, error: 'NFT not found' });
    }
    
    await nft.update({
      status: 'active',
      listingPrice: null,
      listedAt: null
    });
    
    res.json({
      success: true,
      message: 'NFT unlisted successfully'
    });
  } catch (error) {
    console.error('Unlist NFT error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/nft-positions/leaderboard - Top NFT sellers
router.get('/leaderboard', async (req, res) => {
  try {
    const { sequelize } = require('../models');
    
    // Get top creators by total royalties earned
    const topCreators = await NFTPosition.findAll({
      attributes: [
        'originalOwnerId',
        [sequelize.fn('SUM', sequelize.col('total_royalties_paid')), 'totalEarned'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'nftsCreated']
      ],
      include: [{
        model: User,
        as: 'originalOwner',
        attributes: ['id', 'username']
      }],
      group: ['original_owner_id', 'originalOwner.id', 'originalOwner.username'],
      order: [[sequelize.fn('SUM', sequelize.col('total_royalties_paid')), 'DESC']],
      limit: 10
    });
    
    res.json({
      success: true,
      leaderboard: topCreators,
      message: 'Top 10 NFT position creators by royalty earnings'
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
