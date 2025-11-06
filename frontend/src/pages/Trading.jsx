import { useState, useEffect } from 'react';
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
  CircularProgress
} from '@mui/material';
import { toast } from 'react-toastify';

import { fetchTokens } from '../store/slices/tokensSlice';
import { createOrder } from '../store/slices/ordersSlice';
import { fetchWallet } from '../store/slices/walletSlice';
import PriceChart from '../components/PriceChart';
import OrderBook from '../components/OrderBook';
import MarketWatch from '../components/MarketWatch';
import OpenPositions from '../components/OpenPositions';
import websocket from '../services/websocket';

export default function Trading() {
  const dispatch = useDispatch();
  const { list: tokens } = useSelector((state) => state.tokens);
  const { creating } = useSelector((state) => state.orders);
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

  useEffect(() => {
    dispatch(fetchTokens());
    dispatch(fetchWallet());
    
    // Connect WebSocket for real-time updates
    websocket.connect();
    
    return () => {
      websocket.disconnect();
    };
  }, [dispatch]);

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

  const handleChange = (e) => {
    setOrderForm({ ...orderForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const orderData = {
        ...orderForm,
        price: orderForm.orderType === 'market' ? undefined : parseFloat(orderForm.price),
        quantity: parseFloat(orderForm.quantity),
        stopPrice: ['stop_loss', 'take_profit'].includes(orderForm.orderType)
          ? parseFloat(orderForm.stopPrice)
          : undefined
      };

      await dispatch(createOrder(orderData)).unwrap();
      
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
      
      // Refresh wallet immediately
      dispatch(fetchWallet());
      
    } catch (err) {
      toast.error(err?.message || 'Failed to place order', {
        position: 'top-right',
        autoClose: 3000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedTotal = orderForm.quantity && selectedToken
    ? (parseFloat(orderForm.quantity) * (orderForm.orderType === 'market'
        ? parseFloat(selectedToken.currentPrice)
        : parseFloat(orderForm.price || 0)
      )).toFixed(2)
    : '0.00';

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden', position: 'relative' }}>
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
            <PriceChart token={selectedToken} />
          ) : (
            <Paper elevation={0} sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0a0e14', borderRadius: 0 }}>
              <Alert severity="info" sx={{ bgcolor: '#0f1419', border: '1px solid #00aaff' }}>Select a token from Market Watch</Alert>
            </Paper>
          )}
        </Box>

        {/* Right Sidebar - Order Book + Order Entry */}
        <Box sx={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Order Book - 50% of right panel */}
          <Box sx={{ height: '50%', borderBottom: '1px solid #1f2937', overflow: 'auto' }}>
            <OrderBook token={selectedToken} />
          </Box>

          {/* Order Entry Panel - 50% of right panel */}
          <Box sx={{ height: '50%', overflow: 'hidden' }}>
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

                {/* Type + Price in one row */}
                <Box sx={{ display: 'grid', gridTemplateColumns: orderForm.orderType === 'market' ? '1fr' : '1fr 1fr', gap: 0.5 }}>
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
                      <MenuItem value="market" sx={{ fontSize: '11px' }}>MARKET</MenuItem>
                      <MenuItem value="limit" sx={{ fontSize: '11px' }}>LIMIT</MenuItem>
                      <MenuItem value="stop_loss" sx={{ fontSize: '11px' }}>STOP</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {orderForm.orderType !== 'market' && (
                    <TextField
                      fullWidth
                      placeholder="Price"
                      name="price"
                      type="number"
                      value={orderForm.price}
                      onChange={handleChange}
                      required
                      size="small"
                      inputProps={{ step: '0.01', style: { fontSize: '11px', padding: '6px 8px' } }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { borderRadius: 0, height: '32px' }, 
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1f2937' } 
                      }}
                    />
                  )}
                </Box>

                {/* Amount */}
                <TextField
                  fullWidth
                  placeholder={`Amount (${selectedToken?.symbol || 'TOKEN'})`}
                  name="quantity"
                  type="number"
                  value={orderForm.quantity}
                  onChange={handleChange}
                  required
                  size="small"
                  inputProps={{ step: '0.00000001', style: { fontSize: '11px', padding: '6px 8px' } }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { borderRadius: 0, height: '32px' }, 
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1f2937' } 
                  }}
                />

                {/* Balance + Total in compact boxes */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                  {wallet && (
                    <Box sx={{ p: 0.75, bgcolor: '#0f1419', border: '1px solid #1f2937', borderRadius: 0 }}>
                      <Typography sx={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', lineHeight: 1 }}>
                        BALANCE
                      </Typography>
                      <Typography sx={{ color: '#e8e8e8', fontSize: '10px', fontWeight: 700, mt: 0.25, lineHeight: 1 }}>
                        {(parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance || 0)).toFixed(4)}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ p: 0.75, bgcolor: '#0f1419', border: '1px solid', borderColor: orderForm.side === 'buy' ? '#00ff88' : '#ff3366', borderRadius: 0 }}>
                    <Typography sx={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', lineHeight: 1 }}>
                      TOTAL
                    </Typography>
                    <Typography sx={{ color: orderForm.side === 'buy' ? '#00ff88' : '#ff3366', fontSize: '10px', fontWeight: 700, mt: 0.25, lineHeight: 1 }}>
                      ${estimatedTotal}
                    </Typography>
                  </Box>
                </Box>

                {/* Submit Button - Compact */}
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || !orderForm.tokenId || !orderForm.quantity}
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
