import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, Tabs, Tab } from '@mui/material';
import { Close as CloseIcon, Edit as EditIcon, AddCircle as AddIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { fetchOrders, createOrder, updateOrder, cancelOrder } from '../store/slices/ordersSlice';
import { fetchWallet } from '../store/slices/walletSlice';

export default function OpenPositions({ onClosePosition }) {
  const dispatch = useDispatch();
  const { list: orders } = useSelector((state) => state.orders);
  const { list: tokens } = useSelector((state) => state.tokens);
  const [closingPosition, setClosingPosition] = useState(null);
  const [expandedPosition, setExpandedPosition] = useState(null); // Track expanded row for inline TP/SL
  const [inlineTPSL, setInlineTPSL] = useState({ takeProfit: '', stopLoss: '' });

  useEffect(() => {
    dispatch(fetchOrders());
    // Refresh orders every 5 seconds
    const interval = setInterval(() => {
      dispatch(fetchOrders());
    }, 5000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Close position with market order
  const handleClosePosition = async (position) => {
    try {
      setClosingPosition(position.id);
      
      // Create opposite market order to close position
      const closeOrder = {
        tokenId: position.tokenId,
        orderType: 'market',
        side: position.side === 'long' ? 'sell' : 'buy', // LONG positions close with SELL, SHORT with BUY
        quantity: position.quantity
      };
      
      console.log('🔒 Closing position:', {
        symbol: position.symbol,
        positionSide: position.side,
        closingSide: closeOrder.side,
        quantity: closeOrder.quantity
      });
      
      await dispatch(createOrder(closeOrder)).unwrap();
      
      toast.success(`Position closed at market price!`, {
        position: 'top-right',
        autoClose: 2000
      });
      
      // Refresh data
      dispatch(fetchOrders());
      dispatch(fetchWallet());
      
      // Notify parent if callback provided
      if (onClosePosition) {
        onClosePosition(position);
      }
      
    } catch (err) {
      console.error('Failed to close position:', err);
      toast.error(err?.message || 'Failed to close position', {
        position: 'top-right',
        autoClose: 3000
      });
    } finally {
      setClosingPosition(null);
    }
  };

  // Toggle TP/SL inline editor
  const handleToggleTPSL = (position) => {
    if (expandedPosition === position.id) {
      setExpandedPosition(null);
      setInlineTPSL({ takeProfit: '', stopLoss: '' });
    } else {
      setExpandedPosition(position.id);
      // Pre-fill existing TP/SL if any
      const existingTP = pendingOrders.find(o => o.tokenId === position.tokenId && o.orderType === 'take_profit');
      const existingSL = pendingOrders.find(o => o.tokenId === position.tokenId && o.orderType === 'stop_loss');
      setInlineTPSL({
        takeProfit: existingTP?.stopPrice || '',
        stopLoss: existingSL?.stopPrice || ''
      });
    }
  };

  const handleSaveInlineTPSL = async (position) => {
    try {
      const orders = [];
      const currentPrice = position.currentPrice;
      
      console.log('💡 Creating TP/SL for position:', {
        symbol: position.symbol,
        positionSide: position.side,
        quantity: position.quantity
      });
      
      // Create/Update Take Profit
      if (inlineTPSL.takeProfit) {
        const tpOrder = {
          tokenId: position.tokenId,
          orderType: 'take_profit',
          side: position.side === 'long' ? 'sell' : 'buy', // Close the position
          quantity: position.quantity,
          price: currentPrice,
          stopPrice: parseFloat(inlineTPSL.takeProfit)
        };
        console.log('📊 TP Order:', tpOrder);
        orders.push(dispatch(createOrder(tpOrder)).unwrap());
      }
      
      // Create/Update Stop Loss
      if (inlineTPSL.stopLoss) {
        const slOrder = {
          tokenId: position.tokenId,
          orderType: 'stop_loss',
          side: position.side === 'long' ? 'sell' : 'buy', // Close the position
          quantity: position.quantity,
          price: currentPrice,
          stopPrice: parseFloat(inlineTPSL.stopLoss)
        };
        console.log('📊 SL Order:', slOrder);
        orders.push(dispatch(createOrder(slOrder)).unwrap());
      }
      
      await Promise.all(orders);
      toast.success('TP/SL updated!', { autoClose: 2000 });
      setExpandedPosition(null);
      setInlineTPSL({ takeProfit: '', stopLoss: '' });
      dispatch(fetchOrders());
    } catch (err) {
      toast.error(err?.message || 'Failed to save TP/SL', { autoClose: 3000 });
    }
  };



  // Cancel pending order
  const handleCancelOrder = async (orderId) => {
    try {
      await dispatch(cancelOrder(orderId)).unwrap();
      toast.success('Order cancelled!', { autoClose: 2000 });
      dispatch(fetchOrders());
      dispatch(fetchWallet());
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel order', { autoClose: 3000 });
    }
  };

  // Calculate net positions (aggregate buy - sell per token)
  const positions = React.useMemo(() => {
    const positionMap = new Map();
    
    // Group all filled orders by token
    orders
      .filter(order => order.status === 'filled')
      .forEach(order => {
        const token = tokens.find(t => t.id === order.tokenId);
        const symbol = token?.symbol || 'UNKNOWN';
        const quantity = Number(order.filledQuantity || order.quantity || 0);
        const isBuy = order.side === 'buy';
        
        if (!positionMap.has(symbol)) {
          positionMap.set(symbol, {
            tokenId: order.tokenId,
            symbol,
            token,
            buyQuantity: 0,
            sellQuantity: 0,
            buyValue: 0,
            sellValue: 0,
            buyOrders: [],
            sellOrders: []
          });
        }
        
        const pos = positionMap.get(symbol);
        const value = Number(order.totalValue ?? 0);
        
        if (isBuy) {
          pos.buyQuantity += quantity;
          pos.buyValue += value;
          pos.buyOrders.push(order);
        } else {
          pos.sellQuantity += quantity;
          pos.sellValue += value;
          pos.sellOrders.push(order);
        }
      });
    
    // Calculate net positions
    return Array.from(positionMap.values())
      .map(pos => {
        const netQuantity = pos.buyQuantity - pos.sellQuantity;
        
        // Skip if position is fully closed
        if (Math.abs(netQuantity) < 0.0001) {
          return null;
        }
        
        const isLong = netQuantity > 0;
        let avgEntryPrice = isLong 
          ? (pos.buyQuantity > 0 ? pos.buyValue / pos.buyQuantity : 0)
          : (pos.sellQuantity > 0 ? pos.sellValue / pos.sellQuantity : 0);
        
        let currentPrice = Number(pos.token?.currentPrice ?? 0);
        
        // Calculate P/L
        let pnl = 0;
        if (isLong) {
          // Long: profit when price goes up
          pnl = (currentPrice - avgEntryPrice) * netQuantity;
        } else {
          // Short: profit when price goes down  
          pnl = (avgEntryPrice - currentPrice) * Math.abs(netQuantity);
        }
        
        // Ensure no NaN values
        if (isNaN(pnl)) pnl = 0;
        if (isNaN(avgEntryPrice)) avgEntryPrice = 0;
        if (isNaN(currentPrice)) currentPrice = 0;
        
        const pnlPercent = avgEntryPrice > 0 ? (pnl / (avgEntryPrice * Math.abs(netQuantity))) * 100 : 0;
        
        return {
          tokenId: pos.tokenId,
          symbol: pos.symbol,
          token: pos.token,
          side: isLong ? 'long' : 'short', // Use 'long'/'short' to avoid confusion with order sides
          quantity: Math.abs(netQuantity),
          entryPrice: avgEntryPrice,
          currentPrice,
          pnl,
          pnlPercent,
          // Keep first order for close functionality
          id: isLong ? pos.buyOrders[0]?.id : pos.sellOrders[0]?.id
        };
      })
      .filter(Boolean) // Remove null entries
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)); // Sort by P/L magnitude
  }, [orders, tokens]);

  // Calculate total P/L
  const totalPnL = positions.reduce((sum, pos) => sum + (Number(pos.pnl) || 0), 0);

  // Get pending orders
  const pendingOrders = orders.filter(order => ['pending', 'partial'].includes(order.status));

  return (
    <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0a0e14', borderRadius: 0 }}>      <Box sx={{ p: 1.5, borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '11px', color: '#00ff88' }}>
          OPEN POSITIONS ({positions.length})
        </Typography>
        <Typography sx={{ fontSize: '10px', color: totalPnL >= 0 ? '#00ff88' : '#ff3366', fontWeight: 700 }}>
          Total P/L: ${totalPnL.toFixed(2)}
        </Typography>
      </Box>

      <TableContainer sx={{ flex: 1 }}>
        <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #1f2937' } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#0f1419' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: '10px', py: 1, color: '#6b7280' }}>SYMBOL</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '10px', py: 1, color: '#6b7280' }}>SIDE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1, color: '#6b7280' }}>SIZE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1, color: '#6b7280' }}>ENTRY</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1, color: '#6b7280' }}>CURRENT</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1, color: '#6b7280' }}>TP/SL</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1, color: '#6b7280' }}>P/L</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '10px', py: 1, color: '#6b7280' }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#9ca3af', fontSize: '11px' }}>
                    No open positions
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((position) => (
                  <React.Fragment key={position.id}>
                    <TableRow sx={{ '&:hover': { bgcolor: '#0f1419' } }}>
                    <TableCell sx={{ fontWeight: 700, py: 1.5, fontSize: '11px' }}>{position.symbol}</TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip 
                        label={position.side.toUpperCase()} 
                        size="small"
                        sx={{ 
                          bgcolor: position.side === 'long' ? '#00ff88' : '#ff3366',
                          color: position.side === 'long' ? '#000' : '#fff',
                          fontWeight: 700,
                          fontSize: '9px',
                          height: '18px',
                          borderRadius: 0
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, fontSize: '11px', fontFamily: 'monospace' }}>
                      {Number(position.quantity ?? 0).toFixed(4)}
                      <Typography sx={{ fontSize: '9px', color: '#6b7280' }}>
                        ≈ ${(Number(position.quantity ?? 0) * Number(position.currentPrice ?? 0)).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, fontSize: '11px', fontFamily: 'monospace' }}>
                      ${Number(position.entryPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Typography sx={{ fontSize: '11px', fontFamily: 'monospace', color: '#9ca3af' }}>
                        ${Number(position.currentPrice ?? 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      {(() => {
                        const tpOrder = pendingOrders.find(o => o.tokenId === position.tokenId && o.orderType === 'take_profit');
                        const slOrder = pendingOrders.find(o => o.tokenId === position.tokenId && o.orderType === 'stop_loss');
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
                            {tpOrder && (
                              <Typography sx={{ fontSize: '9px', color: '#00ff88', fontFamily: 'monospace' }}>
                                TP: ${Number(tpOrder.stopPrice).toFixed(2)}
                              </Typography>
                            )}
                            {slOrder && (
                              <Typography sx={{ fontSize: '9px', color: '#ff3366', fontFamily: 'monospace' }}>
                                SL: ${Number(slOrder.stopPrice).toFixed(2)}
                              </Typography>
                            )}
                            {!tpOrder && !slOrder && (
                              <Typography sx={{ fontSize: '9px', color: '#6b7280' }}>None</Typography>
                            )}
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Typography 
                          sx={{ 
                            fontWeight: 700, 
                            color: Number(position.pnl ?? 0) >= 0 ? '#00ff88' : '#ff3366',
                            fontSize: '12px',
                            fontFamily: 'monospace'
                          }}
                        >
                          ${Number(position.pnl ?? 0).toFixed(2)}
                        </Typography>
                        <Typography 
                          sx={{ 
                            fontSize: '9px', 
                            color: Number(position.pnl ?? 0) >= 0 ? '#00ff88' : '#ff3366',
                            fontFamily: 'monospace'
                          }}
                        >
                          ({Number(position.pnlPercent ?? 0) >= 0 ? '+' : ''}{Number(position.pnlPercent ?? 0).toFixed(2)}%)
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title={expandedPosition === position.id ? "Hide TP/SL" : "Set TP/SL"}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleTPSL(position)}
                            sx={{
                              width: 24,
                              height: 24,
                              color: expandedPosition === position.id ? '#00ff88' : '#00aaff',
                              bgcolor: expandedPosition === position.id ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
                              '&:hover': {
                                bgcolor: 'rgba(0, 170, 255, 0.1)',
                                transform: 'scale(1.1)'
                              },
                              transition: 'all 0.2s'
                            }}
                          >
                            <AddIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={`Close ${position.side === 'buy' ? 'Long' : 'Short'}`}>
                          <IconButton
                            size="small"
                            onClick={() => handleClosePosition(position)}
                            disabled={closingPosition === position.id}
                            sx={{
                              width: 24,
                              height: 24,
                              color: '#ff3366',
                              '&:hover': {
                                bgcolor: 'rgba(255, 51, 102, 0.1)',
                                transform: 'scale(1.1)'
                              },
                              '&:disabled': { opacity: 0.5 },
                              transition: 'all 0.2s'
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                  {expandedPosition === position.id && (() => {
                    // Calculate potential P/L for TP and SL
                    const tpPrice = parseFloat(inlineTPSL.takeProfit) || 0;
                    const slPrice = parseFloat(inlineTPSL.stopLoss) || 0;
                    
                    let tpProfit = 0;
                    let slLoss = 0;
                    
                    if (position.side === 'long') {
                      // LONG: profit when price goes up, loss when it goes down
                      if (tpPrice > 0) tpProfit = (tpPrice - position.entryPrice) * position.quantity;
                      if (slPrice > 0) slLoss = (slPrice - position.entryPrice) * position.quantity;
                    } else {
                      // SHORT: profit when price goes down, loss when it goes up
                      if (tpPrice > 0) tpProfit = (position.entryPrice - tpPrice) * position.quantity;
                      if (slPrice > 0) slLoss = (position.entryPrice - slPrice) * position.quantity;
                    }
                    
                    return (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 2, bgcolor: '#0f1419', borderBottom: '2px solid #00ff88' }}>
                        <Grid container spacing={2} sx={{ px: 2 }}>
                          <Grid item xs={5}>
                            <TextField
                              fullWidth
                              label="Take Profit"
                              type="number"
                              value={inlineTPSL.takeProfit}
                              onChange={(e) => setInlineTPSL({ ...inlineTPSL, takeProfit: e.target.value })}
                              size="small"
                              InputProps={{ sx: { borderRadius: 0 } }}
                              InputLabelProps={{ sx: { fontSize: '11px' } }}
                              sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: '#00ff88' } }}
                              helperText={tpPrice > 0 ? `Potential profit: $${tpProfit.toFixed(2)} (${((tpProfit / (position.entryPrice * position.quantity)) * 100).toFixed(2)}%)` : 'Sell when price reaches this'}
                              FormHelperTextProps={{ sx: { fontSize: '9px', color: tpProfit > 0 ? '#00ff88' : '#6b7280', fontWeight: tpProfit > 0 ? 700 : 400 } }}
                            />
                          </Grid>
                          <Grid item xs={5}>
                            <TextField
                              fullWidth
                              label="Stop Loss"
                              type="number"
                              value={inlineTPSL.stopLoss}
                              onChange={(e) => setInlineTPSL({ ...inlineTPSL, stopLoss: e.target.value })}
                              size="small"
                              InputProps={{ sx: { borderRadius: 0 } }}
                              InputLabelProps={{ sx: { fontSize: '11px' } }}
                              sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ff3366' } }}
                              helperText={slPrice > 0 ? `Potential ${slLoss >= 0 ? 'profit' : 'loss'}: $${slLoss.toFixed(2)} (${((slLoss / (position.entryPrice * position.quantity)) * 100).toFixed(2)}%)` : 'Sell when price drops to this'}
                              FormHelperTextProps={{ sx: { fontSize: '9px', color: slLoss >= 0 ? '#00ff88' : '#ff3366', fontWeight: slPrice > 0 ? 700 : 400 } }}
                            />
                          </Grid>
                          <Grid item xs={2}>
                            <Button
                              fullWidth
                              variant="contained"
                              onClick={() => handleSaveInlineTPSL(position)}
                              disabled={!inlineTPSL.takeProfit && !inlineTPSL.stopLoss}
                              sx={{
                                height: '40px',
                                bgcolor: '#00ff88',
                                color: '#000',
                                fontWeight: 700,
                                fontSize: '11px',
                                borderRadius: 0,
                                '&:hover': { bgcolor: '#00cc6a' },
                                '&:disabled': { bgcolor: '#1f2937', color: '#6b7280' }
                              }}
                            >
                              SAVE
                            </Button>
                          </Grid>
                        </Grid>
                      </TableCell>
                    </TableRow>
                    );
                  })()}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
