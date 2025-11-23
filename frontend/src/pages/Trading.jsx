import { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { toast } from 'react-toastify';

import { fetchTokens } from '../store/slices/tokensSlice';
import { createOrder } from '../store/slices/ordersSlice';
import { fetchWallet } from '../store/slices/walletSlice';
import InfoTooltip from '../components/InfoTooltip';
import TradingViewChart from '../components/TradingViewChart';
import OrderBook from '../components/OrderBook';
import RecentTrades from '../components/RecentTrades';
import MarketWatch from '../components/MarketWatch';
import OpenPositions from '../components/OpenPositions';
import websocket from '../services/websocket';

export default function Trading() {
  const dispatch = useDispatch();
  const { list: tokens } = useSelector((state) => state.tokens);
  const { creating, list: orders } = useSelector((state) => state.orders);
  const { wallets } = useSelector((state) => state.wallet);

  const [orderForm, setOrderForm] = useState({
    tokenId: '',
    orderType: 'market',
    side: 'buy',
    price: '',
    quantity: '',
    stopPrice: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [priceFlash, setPriceFlash] = useState(null); // 'up' or 'down'
  const lastToastRef = useRef(null); // Track last toast message to prevent duplicates
  const [inputMode, setInputMode] = useState('token'); // 'token' or 'usdt'
  const [usdtAmount, setUsdtAmount] = useState(''); // For USDT input mode

  useEffect(() => {
    dispatch(fetchTokens());
    dispatch(fetchWallet());
    
    // Connect WebSocket for real-time updates
    websocket.connect();
    
    return () => {
      websocket.disconnect();
    };
  }, [dispatch]);

  // Auto-select TTX token on load for simplicity
  useEffect(() => {
    if (tokens.length > 0 && !orderForm.tokenId) {
      const ttxToken = tokens.find(t => t.symbol === 'TTX');
      const defaultToken = ttxToken || tokens[0];
      if (defaultToken) {
        setOrderForm(prev => ({ ...prev, tokenId: defaultToken.id }));
      }
    }
  }, [tokens, orderForm.tokenId]);

  // Auto-refresh wallet when token changes
  useEffect(() => {
    if (orderForm.tokenId) {
      dispatch(fetchWallet());
    }
  }, [orderForm.tokenId, dispatch]);

  // Keyboard shortcuts for traders
  useEffect(() => {
    const handleKeyPress = (e) => {
      // B = Buy, S = Sell (when not typing in inputs)
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (e.key === 'b' || e.key === 'B') {
          setOrderForm(prev => ({ ...prev, side: 'buy' }));
          toast.info('BUY mode activated', { autoClose: 1000, position: 'bottom-right' });
        }
        if (e.key === 's' || e.key === 'S') {
          setOrderForm(prev => ({ ...prev, side: 'sell' }));
          toast.info('SELL mode activated', { autoClose: 1000, position: 'bottom-right' });
        }
        // M = Market order
        if (e.key === 'm' || e.key === 'M') {
          setOrderForm(prev => ({ ...prev, orderType: 'market' }));
          toast.info('Market order', { autoClose: 1000, position: 'bottom-right' });
        }
        // L = Limit order
        if (e.key === 'l' || e.key === 'L') {
          setOrderForm(prev => ({ ...prev, orderType: 'limit' }));
          toast.info('Limit order', { autoClose: 1000, position: 'bottom-right' });
        }
        // ? = Toggle shortcuts help
        if (e.key === '?') {
          setShowShortcuts(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const selectedToken = tokens.find(t => t.id === orderForm.tokenId);
  const wallet = wallets.find(w => w.tokenId === orderForm.tokenId);

  // Track price changes for flash effect
  const prevPriceRef = useRef(null);
  useEffect(() => {
    if (selectedToken?.currentPrice && prevPriceRef.current) {
      const prev = Number(prevPriceRef.current);
      const curr = Number(selectedToken.currentPrice);
      if (curr > prev) {
        setPriceFlash('up');
        setTimeout(() => setPriceFlash(null), 500);
      } else if (curr < prev) {
        setPriceFlash('down');
        setTimeout(() => setPriceFlash(null), 500);
      }
    }
    prevPriceRef.current = selectedToken?.currentPrice;
  }, [selectedToken?.currentPrice]);

  // Get appropriate decimal places based on token type
  const getTokenDecimals = (token) => {
    if (!token) return 4;
    
    // Standard crypto decimals
    const symbol = token.symbol?.toUpperCase();
    if (['BTC', 'ETH'].includes(symbol)) return 8;
    if (['USDT', 'USDC', 'DAI'].includes(symbol)) return 2;
    if (['BNB', 'SOL', 'ADA'].includes(symbol)) return 6;
    
    // Use minTradeAmount to determine decimals
    const minAmount = Number(token.minTradeAmount || 0.01);
    if (minAmount >= 1) return 2;
    if (minAmount >= 0.01) return 4;
    if (minAmount >= 0.0001) return 6;
    return 8;
  };

  // Get suggested starting quantity based on asset
  const getSuggestedQuantity = (token) => {
    if (!token) return '10';
    
    const symbol = token.symbol?.toUpperCase();
    const price = Number(token.currentPrice || 0);
    
    // For expensive assets (BTC, ETH), suggest small quantity
    if (price > 1000) return '0.01';
    if (price > 100) return '0.1';
    if (price > 10) return '1';
    if (price > 1) return '10';
    if (price > 0.1) return '100';
    return '1000'; // For very cheap tokens
  };

  const tokenDecimals = getTokenDecimals(selectedToken);

  // Helper to show toast without duplicates
  const showToast = (message, type = 'warn', options = {}) => {
    const toastKey = `${type}:${message}`;
    if (lastToastRef.current !== toastKey) {
      lastToastRef.current = toastKey;
      toast[type](message, { autoClose: 1500, ...options });
      // Clear the ref after toast auto-closes
      setTimeout(() => {
        if (lastToastRef.current === toastKey) {
          lastToastRef.current = null;
        }
      }, 1600);
    }
  };

  // Determine appropriate step size based on token
  const getQuantityStep = () => {
    if (!selectedToken) return '0.01';
    const minAmount = Number(selectedToken.minTradeAmount ?? 0.01);
    if (minAmount >= 1) return '1';
    if (minAmount >= 0.1) return '0.1';
    if (minAmount >= 0.01) return '0.01';
    if (minAmount >= 0.001) return '0.001';
    if (minAmount >= 0.0001) return '0.0001';
    return '0.00001';
  };

  // Auto-convert between USDT and token quantity
  const handleUsdtAmountChange = (value) => {
    setUsdtAmount(value);
    if (selectedToken && value) {
      const price = orderForm.orderType === 'market' 
        ? Number(selectedToken.currentPrice ?? 0)
        : Number(orderForm.price || selectedToken.currentPrice || 0);
      if (price > 0) {
        const tokenQty = (Number(value) / price).toFixed(tokenDecimals);
        setOrderForm(prev => ({ ...prev, quantity: tokenQty }));
      }
    } else if (!value) {
      setOrderForm(prev => ({ ...prev, quantity: '' }));
    }
  };

  const handleTokenQuantityChange = (value) => {
    setOrderForm(prev => ({ ...prev, quantity: value }));
    if (selectedToken && value) {
      const price = orderForm.orderType === 'market' 
        ? Number(selectedToken.currentPrice ?? 0)
        : Number(orderForm.price || selectedToken.currentPrice || 0);
      if (price > 0) {
        const usdtValue = (Number(value) * price).toFixed(2);
        setUsdtAmount(usdtValue);
      }
    } else if (!value) {
      setUsdtAmount('');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Smart quantity validation
    if (name === 'quantity' && selectedToken) {
      const qty = Number(value);
      const minTrade = Number(selectedToken.minTradeAmount || 0);
      
      // Get max based on side
      let maxQty = Infinity;
      if (orderForm.side === 'sell') {
        const available = wallet ? Number(wallet.balance ?? 0) - Number(wallet.lockedBalance ?? 0) : 0;
        maxQty = available;
      } else if (orderForm.side === 'buy') {
        const usdtWallet = wallets.find(w => w.token?.symbol === 'USDT');
        const balance = usdtWallet?.balance === 'NaN' ? 0 : Number(usdtWallet?.balance ?? 0);
        const locked = usdtWallet?.lockedBalance === 'NaN' ? 0 : Number(usdtWallet?.lockedBalance ?? 0);
        const availableUSDT = balance - locked;
        const price = orderForm.orderType === 'market' 
          ? Number(selectedToken.currentPrice ?? 0)
          : Number(orderForm.price || selectedToken.currentPrice || 0);
        if (price > 0) {
          maxQty = availableUSDT / price;
        }
      }
      
      // Clamp to valid range
      if (qty > 0 && qty < minTrade) {
        showToast(`Minimum ${minTrade} ${selectedToken.symbol}`);
      }
      if (qty > maxQty && maxQty > 0) {
        // Don't cap if result would be below minimum
        const cappedQty = Number(maxQty.toFixed(tokenDecimals));
        if (cappedQty < minTrade) {
          showToast(`Insufficient balance. Need at least ${minTrade} ${selectedToken.symbol}`, 'error', { autoClose: 3000 });
          setOrderForm({ ...orderForm, [name]: '' });
          return;
        }
        setOrderForm({ ...orderForm, [name]: cappedQty.toString() });
        showToast('Quantity capped to available balance');
        return;
      }
    }
    
    setOrderForm({ ...orderForm, [name]: value });
  };

  // Quick position sizing
  const handleQuickSize = (percentage) => {
    if (!selectedToken) return;
    
    const usdtWallet = wallets.find(w => w.token?.symbol === 'USDT');
    
    if (orderForm.side === 'buy') {
      // Calculate max buy amount based on USDT balance
      if (!usdtWallet) {
        toast.warn('USDT wallet not found', { autoClose: 2000 });
        return;
      }
      
      // Handle 'NaN' string from database
      const balance = usdtWallet.balance === 'NaN' ? 0 : Number(usdtWallet.balance ?? 0);
      const locked = usdtWallet.lockedBalance === 'NaN' ? 0 : Number(usdtWallet.lockedBalance ?? 0);
      const availableUSDT = balance - locked;
      
      console.log('💰 Quick Size BUY:', { percentage, balance, locked, availableUSDT });
      
      // Check if user has available balance
      if (availableUSDT <= 0) {
        toast.error(`No available USDT! You have $${balance.toFixed(2)} but $${locked.toFixed(2)} is locked in orders. Cancel pending orders to free up funds.`, { autoClose: 5000 });
        return;
      }
      
      const price = orderForm.orderType === 'market' 
        ? Number(selectedToken.currentPrice ?? 0) 
        : Number(orderForm.price || selectedToken.currentPrice || 0);
      
      if (price === 0 || isNaN(price)) {
        toast.warn('Please set a valid price first', { autoClose: 2000 });
        return;
      }
      
      const maxQuantity = availableUSDT / price;
      const targetQuantity = maxQuantity * (percentage / 100);
      
      // Check if quantity would be too small
      const minTrade = Number(selectedToken.minTradeAmount || 0);
      if (targetQuantity < minTrade) {
        toast.error(`${percentage}% of your available balance ($${availableUSDT.toFixed(2)}) = ${targetQuantity.toFixed(8)} ${selectedToken.symbol}, but minimum order is ${minTrade} ${selectedToken.symbol}. You need at least $${(minTrade * price).toFixed(2)} available.`, { autoClose: 5000 });
        return;
      }
      
      const quantity = targetQuantity.toFixed(tokenDecimals);
      
      console.log('📊 Calculated:', { maxQuantity, targetQuantity, quantity, price });
      
      // Use the new handler to update both quantity and USDT amount
      handleTokenQuantityChange(quantity);
    } else {
      // Calculate max sell amount based on token balance
      if (!wallet) {
        toast.warn('You don\'t own any ' + selectedToken.symbol, { autoClose: 2000 });
        return;
      }
      
      const availableTokens = Number(wallet?.balance ?? 0) - Number(wallet?.lockedBalance ?? 0);
      
      if (availableTokens <= 0) {
        toast.error(`No available ${selectedToken.symbol}! Cancel pending orders to free up tokens.`, { autoClose: 4000 });
        return;
      }
      
      const targetQuantity = availableTokens * (percentage / 100);
      const quantity = targetQuantity.toFixed(tokenDecimals);
      
      console.log('💰 Quick Size SELL:', { percentage, availableTokens, targetQuantity, quantity });
      
      // Use the new handler to update both quantity and USDT amount
      handleTokenQuantityChange(quantity);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔥 SUBMIT CLICKED', { orderForm, isSubmitting, inputMode, usdtAmount });
    
    if (isSubmitting) return;
    
    // Ensure quantity is set (critical fix)
    const finalQuantity = parseFloat(orderForm.quantity);
    if (!finalQuantity || isNaN(finalQuantity) || finalQuantity <= 0) {
      toast.error('Please enter a valid quantity', { autoClose: 3000 });
      return;
    }
    
    // Validate minimum trade amount
    if (selectedToken) {
      const minTrade = Number(selectedToken.minTradeAmount || 0);
      
      if (finalQuantity < minTrade) {
        toast.error(`Minimum order: ${minTrade} ${selectedToken.symbol}`, { autoClose: 3000 });
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const orderData = {
        tokenId: orderForm.tokenId,
        orderType: orderForm.orderType,
        side: orderForm.side,
        price: orderForm.orderType === 'market' ? undefined : parseFloat(orderForm.price),
        quantity: finalQuantity, // Use validated quantity
        stopPrice: ['stop_loss', 'take_profit'].includes(orderForm.orderType)
          ? parseFloat(orderForm.stopPrice)
          : undefined
      };

      console.log('📤 SENDING ORDER:', orderData);

      const result = await dispatch(createOrder(orderData)).unwrap();
      
      console.log('✅ ORDER SUCCESS:', result);
      
      // Success feedback
      toast.success(`${orderForm.side.toUpperCase()} order placed successfully!`, {
        position: 'top-right',
        autoClose: 2000
      });
      
      // Clear form
      setOrderForm({
        ...orderForm,
        price: '',
        quantity: '',
        stopPrice: ''
      });
      setUsdtAmount('');
      
      // Refresh wallet immediately
      dispatch(fetchWallet());
      
    } catch (err) {
      console.error('❌ ORDER FAILED:', err);
      console.error('❌ ERROR MESSAGE:', err?.message || err);
      console.error('❌ ERROR RESPONSE:', err?.response?.data);
      console.error('❌ FULL ERROR:', JSON.stringify(err, null, 2));
      
      // Get error message - unwrap returns the rejectWithValue payload
      const errorMessage = err?.message || 'Failed to place order';
      
      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 4000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedTotal = (() => {
    if (!orderForm.quantity || !selectedToken) return '0.00';
    
    const qty = Number(orderForm.quantity ?? 0);
    const price = orderForm.orderType === 'market'
      ? Number(selectedToken.currentPrice ?? 0)
      : Number(orderForm.price ?? 0);
    
    if (isNaN(qty) || isNaN(price) || price === 0) return '0.00';
    
    return (qty * price).toFixed(2);
  })();

  const currentPrice = orderForm.orderType === 'market'
    ? Number(selectedToken?.currentPrice ?? 0)
    : Number(orderForm.price ?? 0);

  // Calculate quick P/L metrics from orders
  const plMetrics = useMemo(() => {
    const filledOrders = orders.filter(o => o.status === 'filled');
    
    // Group by token to calculate net positions
    const positionMap = new Map();
    filledOrders.forEach(order => {
      const symbol = order.token?.symbol || 'UNKNOWN';
      if (!positionMap.has(symbol)) {
        positionMap.set(symbol, { buyQty: 0, sellQty: 0, buyValue: 0, sellValue: 0 });
      }
      const pos = positionMap.get(symbol);
      const qty = Number(order.filledQuantity || order.quantity || 0);
      const value = Number(order.totalValue || 0);
      
      // Skip if NaN
      if (isNaN(qty) || isNaN(value)) return;
      
      if (order.side === 'buy') {
        pos.buyQty += qty;
        pos.buyValue += value;
      } else {
        pos.sellQty += qty;
        pos.sellValue += value;
      }
    });
    
    // Calculate net P/L
    let totalPnL = 0;
    let activePositions = 0;
    
    positionMap.forEach((pos, symbol) => {
      const netQty = pos.buyQty - pos.sellQty;
      if (Math.abs(netQty) > 0.0001) {
        activePositions++;
        const token = tokens.find(t => t.symbol === symbol);
        const currentPrice = Number(token?.currentPrice || 0);
        
        let pnl = 0;
        if (netQty > 0 && pos.buyQty > 0) {
          // Long position
          const avgEntry = pos.buyValue / pos.buyQty;
          if (!isNaN(avgEntry) && !isNaN(currentPrice)) {
            pnl = (currentPrice - avgEntry) * netQty;
          }
        } else if (netQty < 0 && pos.sellQty > 0) {
          // Short position
          const avgEntry = pos.sellValue / pos.sellQty;
          if (!isNaN(avgEntry) && !isNaN(currentPrice)) {
            pnl = (avgEntry - currentPrice) * Math.abs(netQty);
          }
        }
        
        if (!isNaN(pnl)) {
          totalPnL += pnl;
        }
      }
    });
    
    // Ensure no NaN in final result
    if (isNaN(totalPnL)) totalPnL = 0;
    if (isNaN(activePositions)) activePositions = 0;
    
    return { totalPnL, activePositions };
  }, [orders, tokens]);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden', position: 'relative' }}>
      {/* Quick Metrics - Top Right */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 50, 
          right: 10, 
          zIndex: 1000,
          display: 'flex',
          gap: 1
        }}
      >
        {/* Active Positions */}
        <Paper 
          elevation={3}
          sx={{ 
            px: 2, 
            py: 1, 
            bgcolor: '#0a0e14', 
            border: '1px solid #1f2937',
            borderRadius: 0
          }}
        >
          <Typography sx={{ fontSize: '9px', color: '#6b7280', fontWeight: 700, mb: 0.5 }}>
            POSITIONS
          </Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#00aaff' }}>
            {plMetrics.activePositions}
          </Typography>
        </Paper>
        
        {/* Total P/L */}
        <Paper 
          elevation={3}
          sx={{ 
            px: 2, 
            py: 1, 
            bgcolor: '#0a0e14', 
            border: '2px solid',
            borderColor: plMetrics.totalPnL >= 0 ? '#00ff88' : '#ff3366',
            borderRadius: 0
          }}
        >
          <Typography sx={{ fontSize: '9px', color: '#6b7280', fontWeight: 700, mb: 0.5 }}>
            TOTAL P/L
          </Typography>
          <Typography 
            sx={{ 
              fontSize: '16px', 
              fontWeight: 700, 
              color: plMetrics.totalPnL >= 0 ? '#00ff88' : '#ff3366',
              fontFamily: 'monospace'
            }}
          >
            {plMetrics.totalPnL >= 0 ? '+' : ''}${Number(plMetrics.totalPnL || 0).toFixed(2)}
          </Typography>
        </Paper>
      </Box>

      {/* Mining Rewards Banner */}
      <Alert 
        severity="success" 
        sx={{ 
          borderRadius: 0, 
          bgcolor: 'rgba(0, 255, 136, 0.1)', 
          border: '1px solid #00ff88',
          '& .MuiAlert-message': { width: '100%' }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 700 }}>
            💎 <strong>Mining Active:</strong> Earn 5-20 TTX per $100 traded + 15% of all platform fees!
          </Typography>
          <InfoTooltip title="Every trade you make earns you TTX tokens automatically. Higher volume = higher rewards tier!" />
        </Box>
      </Alert>

      {/* Keyboard Shortcuts Help */}
      {showShortcuts && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 10, 
            right: 10, 
            zIndex: 1000, 
            bgcolor: '#0a0e14', 
            border: '2px solid #00ff88', 
            borderRadius: 0,
            p: 2,
            minWidth: '200px'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#00ff88' }}>SHORTCUTS</Typography>
            <Button size="small" onClick={() => setShowShortcuts(false)} sx={{ minWidth: 0, p: 0.5, color: '#9ca3af' }}>✕</Button>
          </Box>
          <Box sx={{ fontSize: '10px', color: '#e8e8e8', '& > div': { py: 0.5 } }}>
            <div><strong>B</strong> = Buy mode</div>
            <div><strong>S</strong> = Sell mode</div>
            <div><strong>M</strong> = Market order</div>
            <div><strong>L</strong> = Limit order</div>
            <div><strong>?</strong> = Show/hide this</div>
          </Box>
        </Box>
      )}

      {/* Top Section - Chart + Order Entry (75% height) */}
      <Box sx={{ height: '75vh', display: 'flex', gap: 0, borderBottom: '1px solid #1f2937' }}>
        {/* Left Sidebar - Market Watch */}
        <Box sx={{ width: '220px', flexShrink: 0, borderRight: '1px solid #1f2937', overflow: 'auto' }}>
          <MarketWatch 
            tokens={tokens} 
            selectedTokenId={orderForm.tokenId}
            onSelectToken={(tokenId) => setOrderForm({ ...orderForm, tokenId })}
          />
        </Box>

        {/* Main Chart Area */}
        <Box sx={{ flex: 1, minWidth: 0, borderRight: '1px solid #1f2937' }}>
          {selectedToken ? (
            <TradingViewChart token={selectedToken} />
          ) : (
            <Paper elevation={0} sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0a0e14', borderRadius: 0 }}>
              <Alert severity="info" sx={{ bgcolor: '#0f1419', border: '1px solid #00aaff' }}>Select a token from Market Watch</Alert>
            </Paper>
          )}
        </Box>

        {/* Right Sidebar - Order Book + Recent Trades + Order Entry */}
        <Box sx={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Order Book - 33% of right panel */}
          <Box sx={{ height: '33%', borderBottom: '1px solid #1f2937', overflow: 'auto' }}>
            <OrderBook token={selectedToken} />
          </Box>

          {/* Recent Trades - 33% of right panel */}
          <Box sx={{ height: '33%', borderBottom: '1px solid #1f2937', overflow: 'auto' }}>
            <RecentTrades />
          </Box>

          {/* Order Entry Panel - 33% of right panel */}
          <Box sx={{ height: '34%', overflow: 'hidden' }}>
            <Paper elevation={0} sx={{ p: 1.5, height: '100%', bgcolor: '#0a0e14', borderRadius: 0, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 1, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
                ORDER ENTRY
              </Typography>

              <Box component="form" onSubmit={handleSubmit} sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {/* Buy/Sell Toggle - Compact */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                  <Button
                    variant={orderForm.side === 'buy' ? 'contained' : 'outlined'}
                    onClick={() => setOrderForm({ ...orderForm, side: 'buy' })}
                    sx={{ 
                      py: 0.75, 
                      fontWeight: 700,
                      fontSize: '11px',
                      borderRadius: 0,
                      bgcolor: orderForm.side === 'buy' ? '#00ff88' : 'transparent',
                      color: orderForm.side === 'buy' ? '#000' : '#00ff88',
                      borderColor: '#00ff88',
                      borderWidth: '1px',
                      minHeight: 0,
                      '&:hover': { bgcolor: orderForm.side === 'buy' ? '#00cc6a' : 'rgba(0,255,136,0.08)' }
                    }}
                  >
                    BUY
                  </Button>
                  <Button
                    variant={orderForm.side === 'sell' ? 'contained' : 'outlined'}
                    onClick={() => setOrderForm({ ...orderForm, side: 'sell' })}
                    sx={{ 
                      py: 0.75, 
                      fontWeight: 700,
                      fontSize: '11px',
                      borderRadius: 0,
                      bgcolor: orderForm.side === 'sell' ? '#ff3366' : 'transparent',
                      color: orderForm.side === 'sell' ? '#fff' : '#ff3366',
                      borderColor: '#ff3366',
                      borderWidth: '1px',
                      minHeight: 0,
                      '&:hover': { bgcolor: orderForm.side === 'sell' ? '#cc0033' : 'rgba(255,51,102,0.08)' }
                    }}
                  >
                    SELL
                  </Button>
                </Box>

                {/* Order Type Selector */}
                <FormControl fullWidth size="small" required>
                  <Select
                    name="orderType"
                    value={orderForm.orderType}
                    onChange={handleChange}
                    sx={{ 
                      fontSize: '11px', 
                      borderRadius: 0,
                      height: '32px',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1f2937' },
                      '& .MuiSelect-select': { py: 0.5 }
                    }}
                  >
                    <MenuItem value="market" sx={{ fontSize: '11px' }}>🚀 MARKET</MenuItem>
                    <MenuItem value="limit" sx={{ fontSize: '11px' }}>📊 LIMIT</MenuItem>
                    <MenuItem value="stop_loss" sx={{ fontSize: '11px' }}>🛡️ STOP LOSS</MenuItem>
                    <MenuItem value="take_profit" sx={{ fontSize: '11px' }}>💰 TAKE PROFIT</MenuItem>
                  </Select>
                </FormControl>
                
                {/* Limit Price (for limit orders) */}
                {orderForm.orderType === 'limit' && (
                  <TextField
                    fullWidth
                    placeholder="Limit Price"
                    name="price"
                    type="number"
                    value={orderForm.price}
                    onChange={handleChange}
                    required
                    size="small"
                    inputProps={{ step: 'any', style: { fontSize: '11px', padding: '6px 8px' } }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { borderRadius: 0, height: '32px' }, 
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#00aaff' } 
                    }}
                    helperText="Order executes at this price"
                    FormHelperTextProps={{ sx: { fontSize: '8px', m: 0, mt: 0.25, color: '#6b7280' } }}
                  />
                )}

                {/* Current Market Price (for stop loss/take profit orders) */}
                {(orderForm.orderType === 'stop_loss' || orderForm.orderType === 'take_profit') && (
                  <TextField
                    fullWidth
                    placeholder="Current Market Price"
                    name="price"
                    type="number"
                    value={orderForm.price || selectedToken?.currentPrice || ''}
                    onChange={handleChange}
                    required
                    size="small"
                    inputProps={{ step: 'any', style: { fontSize: '11px', padding: '6px 8px' } }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { borderRadius: 0, height: '32px' }, 
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#00aaff' } 
                    }}
                    helperText="Reference price for order creation"
                    FormHelperTextProps={{ sx: { fontSize: '8px', m: 0, mt: 0.25, color: '#6b7280' } }}
                  />
                )}

                {/* Stop Price (for stop loss/take profit orders) */}
                {(orderForm.orderType === 'stop_loss' || orderForm.orderType === 'take_profit') && (
                  <TextField
                    fullWidth
                    placeholder={orderForm.orderType === 'stop_loss' ? 'Stop Loss Price' : 'Take Profit Price'}
                    name="stopPrice"
                    type="number"
                    value={orderForm.stopPrice}
                    onChange={handleChange}
                    required
                    size="small"
                    inputProps={{ step: 'any', style: { fontSize: '11px', padding: '6px 8px' } }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { borderRadius: 0, height: '32px' }, 
                      '& .MuiOutlinedInput-notchedOutline': { 
                        borderColor: orderForm.orderType === 'stop_loss' ? '#ff3366' : '#00ff88' 
                      } 
                    }}
                    helperText={
                      orderForm.orderType === 'stop_loss' 
                        ? `Triggers when price falls to $${orderForm.stopPrice || '0'}`
                        : `Triggers when price rises to $${orderForm.stopPrice || '0'}`
                    }
                    FormHelperTextProps={{ 
                      sx: { 
                        fontSize: '8px', 
                        m: 0, 
                        mt: 0.25, 
                        color: orderForm.orderType === 'stop_loss' ? '#ff3366' : '#00ff88',
                        fontWeight: 600
                      } 
                    }}
                  />
                )}

                {/* Amount Input with Toggle */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {/* Toggle Button */}
                  <Button
                    size="small"
                    onClick={() => setInputMode(prev => prev === 'token' ? 'usdt' : 'token')}
                    sx={{
                      fontSize: '8px',
                      fontWeight: 700,
                      color: '#00aaff',
                      textTransform: 'none',
                      justifyContent: 'flex-start',
                      minWidth: 0,
                      p: 0,
                      mb: 0.5,
                      '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
                    }}
                  >
                    {inputMode === 'token' 
                      ? `↔ Switch to enter USDT amount` 
                      : `↔ Switch to enter ${selectedToken?.symbol || 'Token'} amount`
                    }
                  </Button>

                  {inputMode === 'usdt' ? (
                    <TextField
                      fullWidth
                      placeholder="Enter USDT amount"
                      type="number"
                      value={usdtAmount}
                      onChange={(e) => handleUsdtAmountChange(e.target.value)}
                      required
                      size="small"
                      inputProps={{ 
                        step: 'any',
                        min: '0',
                        style: { fontSize: '11px', padding: '6px 8px' } 
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { borderRadius: 0, height: '32px', borderColor: '#00aaff' }, 
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#00aaff' } 
                      }}
                      helperText={
                        orderForm.quantity && selectedToken
                          ? `= ${Number(orderForm.quantity).toFixed(tokenDecimals)} ${selectedToken.symbol}`
                          : 'Enter amount in USDT'
                      }
                      FormHelperTextProps={{ sx: { fontSize: '8px', m: 0, mt: 0.25, color: '#00aaff', fontWeight: 700 } }}
                    />
                  ) : (
                    <TextField
                      fullWidth
                      placeholder={selectedToken ? `e.g., ${getSuggestedQuantity(selectedToken)} ${selectedToken.symbol}` : 'Amount'}
                      name="quantity"
                      type="number"
                      value={orderForm.quantity}
                      onChange={(e) => handleTokenQuantityChange(e.target.value)}
                      required
                      size="small"
                      inputProps={{ 
                        step: 'any',
                        min: selectedToken?.minTradeAmount || '0',
                        style: { fontSize: '11px', padding: '6px 8px' } 
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { borderRadius: 0, height: '32px' }, 
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1f2937' } 
                      }}
                      helperText={
                        usdtAmount && selectedToken
                          ? `= $${usdtAmount} USDT • Min: ${selectedToken.minTradeAmount} ${selectedToken.symbol}`
                          : selectedToken
                            ? `Min: ${selectedToken.minTradeAmount} • Suggested: ${getSuggestedQuantity(selectedToken)} ${selectedToken.symbol}` 
                            : ''
                      }
                      FormHelperTextProps={{ sx: { fontSize: '8px', m: 0, mt: 0.25, color: usdtAmount ? '#00aaff' : '#6b7280', fontWeight: usdtAmount ? 700 : 400 } }}
                    />
                  )}
                </Box>
                
                {/* Quick Size Buttons */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0.5, mt: 0.5 }}>
                  {[25, 50, 75, 100].map(pct => {
                    const usdtWallet = wallets.find(w => w.token?.symbol === 'USDT');
                    const availableUSDT = usdtWallet ? Number(usdtWallet.balance ?? 0) - Number(usdtWallet.lockedBalance ?? 0) : 0;
                    const availableTokens = wallet ? Number(wallet.balance ?? 0) - Number(wallet.lockedBalance ?? 0) : 0;
                    
                    const isDisabled = !selectedToken || (
                      orderForm.side === 'buy' 
                        ? availableUSDT <= 0
                        : (!wallet || availableTokens <= 0)
                    );
                    
                    return (
                      <Button
                        key={pct}
                        size="small"
                        variant="outlined"
                        onClick={() => handleQuickSize(pct)}
                        disabled={isDisabled}
                        sx={{
                          minWidth: 0,
                          py: 0.4,
                          fontSize: '9px',
                          fontWeight: 700,
                          borderColor: '#1f2937',
                          color: '#6b7280',
                          borderRadius: 0,
                          '&:hover': {
                            borderColor: orderForm.side === 'buy' ? '#00ff88' : '#ff3366',
                            color: orderForm.side === 'buy' ? '#00ff88' : '#ff3366',
                            bgcolor: orderForm.side === 'buy' ? 'rgba(0, 255, 136, 0.05)' : 'rgba(255, 51, 102, 0.05)'
                          },
                          '&:disabled': {
                            opacity: 0.3
                          }
                        }}
                      >
                        {pct}%
                      </Button>
                    );
                  })}
                </Box>

                {/* Balance + Total in compact boxes */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                  {wallet && (
                    <Box sx={{ p: 0.75, bgcolor: '#0f1419', border: '1px solid #1f2937', borderRadius: 0 }}>
                      <Typography sx={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', lineHeight: 1 }}>
                        BALANCE
                      </Typography>
                      <Typography sx={{ color: '#e8e8e8', fontSize: '10px', fontWeight: 700, mt: 0.25, lineHeight: 1 }}>
                        {Number(wallet?.balance ?? 0) - Number(wallet?.lockedBalance ?? 0) >= 0 
                          ? (Number(wallet?.balance ?? 0) - Number(wallet?.lockedBalance ?? 0)).toFixed(4)
                          : '0.0000'
                        }
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ 
                    p: 0.75, 
                    bgcolor: priceFlash === 'up' ? 'rgba(0, 255, 136, 0.1)' : priceFlash === 'down' ? 'rgba(255, 51, 102, 0.1)' : '#0f1419',
                    border: '1px solid', 
                    borderColor: orderForm.side === 'buy' ? '#00ff88' : '#ff3366', 
                    borderRadius: 0,
                    transition: 'background-color 0.3s ease'
                  }}>
                    <Typography sx={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', lineHeight: 1 }}>
                      TOTAL
                    </Typography>
                    <Typography sx={{ color: orderForm.side === 'buy' ? '#00ff88' : '#ff3366', fontSize: '10px', fontWeight: 700, mt: 0.25, lineHeight: 1 }}>
                      ${estimatedTotal}
                    </Typography>
                    {currentPrice > 0 && (
                      <Typography sx={{ fontSize: '7px', color: '#6b7280', mt: 0.25, lineHeight: 1 }}>
                        at ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Submit Button - Compact */}
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || !orderForm.tokenId || !orderForm.quantity || parseFloat(orderForm.quantity) <= 0}
                  sx={{ 
                    py: 1, 
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: 0,
                    bgcolor: orderForm.side === 'buy' ? '#00ff88' : '#ff3366',
                    color: orderForm.side === 'buy' ? '#000' : '#fff',
                    minHeight: 0,
                    '&:hover': {
                      bgcolor: orderForm.side === 'buy' ? '#00cc6a' : '#cc0033'
                    },
                    '&:disabled': {
                      bgcolor: '#1f2937',
                      color: '#6b7280'
                    }
                  }}
                >
                  {isSubmitting ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={14} sx={{ color: '#6b7280' }} />
                      PROCESSING
                    </Box>
                  ) : (
                    'PLACE ORDER'
                  )}
                </Button>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>

      {/* Bottom Section - Open Positions (25% height) */}
      <Box sx={{ height: '25vh', overflow: 'auto' }}>
        <OpenPositions />
      </Box>
    </Box>
  );
}
