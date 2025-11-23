import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import api from '../services/api';

export default function OrderBook({ token }) {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [], spread: 0 });
  const [view, setView] = useState(0); // 0 = Both, 1 = Bids, 2 = Asks
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchOrderBook = async () => {
      try {
        setLoading(true);
        // Use token ID instead of symbol to avoid URL encoding issues with forex pairs
        const response = await api.get(`/tokens/${token.id}/orderbook?limit=15`);
        setOrderBook(response.data.data);
      } catch (error) {
        // Silently handle error - backend endpoint not ready
        setOrderBook({ bids: [], asks: [], spread: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [token]);

  const formatPrice = (price) => {
    if (price == null || isNaN(price)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(Number(price));
  };

  const formatQuantity = (qty) => {
    if (qty == null || isNaN(qty)) return '0';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(Number(qty));
  };

  const renderAsks = () => {
    const asks = orderBook?.asks || [];
    if (asks.length === 0) return null;
    
    return (
      <>
        {asks.slice(0, view === 0 ? 10 : 15).reverse().map((ask, index) => (
          <TableRow
            key={`ask-${index}`}
            sx={{
              bgcolor: `rgba(239, 83, 80, ${0.05 + (index / Math.max(asks.length, 1)) * 0.1})`,
              '&:hover': { bgcolor: 'rgba(239, 83, 80, 0.2)' }
            }}
          >
            <TableCell sx={{ color: '#ff3366', fontWeight: 600, fontSize: '11px', py: 0.75, fontFamily: 'monospace' }}>
              {formatPrice(ask?.price)}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: '11px', py: 0.75, fontFamily: 'monospace' }}>
              {formatQuantity(ask?.quantity)}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: '11px', py: 0.75, fontFamily: 'monospace', color: '#6b7280' }}>
              {formatPrice(ask?.total)}
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  };

  const renderBids = () => {
    const bids = orderBook?.bids || [];
    if (bids.length === 0) return null;
    
    return (
      <>
        {bids.slice(0, view === 0 ? 10 : 15).map((bid, index) => (
          <TableRow
            key={`bid-${index}`}
            sx={{
              bgcolor: `rgba(0, 255, 136, ${0.05 + (index / Math.max(bids.length, 1)) * 0.1})`,
              '&:hover': { bgcolor: 'rgba(0, 255, 136, 0.15)' }
            }}
          >
            <TableCell sx={{ color: '#00ff88', fontWeight: 600, fontSize: '11px', py: 0.75, fontFamily: 'monospace' }}>
              {formatPrice(bid?.price)}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: '11px', py: 0.75, fontFamily: 'monospace' }}>
              {formatQuantity(bid?.quantity)}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: '11px', py: 0.75, fontFamily: 'monospace', color: '#6b7280' }}>
              {formatPrice(bid?.total)}
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  };

  if (!token) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Select a token to view order book</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0a0e14', borderRadius: 0 }}>
      {/* Header */}
      <Box sx={{ p: 1.5, borderBottom: '1px solid #1f2937' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700, 
              fontSize: '12px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em',
              color: '#00ff88'
            }}
          >
            ORDER BOOK
          </Typography>
          {orderBook?.spread > 0 && (
            <Chip
              label={`Δ ${formatPrice(orderBook.spread)}`}
              size="small"
              sx={{
                bgcolor: 'rgba(0, 170, 255, 0.1)',
                color: '#00aaff',
                fontWeight: 700,
                fontSize: '9px',
                height: '18px',
                borderRadius: 0
              }}
            />
          )}
        </Box>

        <Tabs 
          value={view} 
          onChange={(e, v) => setView(v)} 
          variant="fullWidth"
          sx={{
            minHeight: '32px',
            '& .MuiTab-root': {
              minHeight: '32px',
              py: 0.5,
              fontSize: '10px',
              fontWeight: 700,
              color: '#6b7280',
              '&.Mui-selected': {
                color: '#00ff88'
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#00ff88'
            }
          }}
        >
          <Tab label="Both" />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><TrendingUp sx={{ fontSize: 14 }} /> Bids</Box>} />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><TrendingDown sx={{ fontSize: 14 }} /> Asks</Box>} />
        </Tabs>
      </Box>

      {/* Order Book Table */}
      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ bgcolor: '#0f1419' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: '10px', py: 1, color: '#6b7280', bgcolor: '#0f1419' }}>PRICE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1, color: '#6b7280', bgcolor: '#0f1419' }}>AMOUNT ({token?.symbol || ''})</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1, color: '#6b7280', bgcolor: '#0f1419' }}>TOTAL</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Asks (Sell Orders) */}
            {(view === 0 || view === 2) && renderAsks()}

            {/* Spread Row */}
            {view === 0 && orderBook?.bids?.length > 0 && orderBook?.asks?.length > 0 && (
              <TableRow sx={{ bgcolor: '#1a1f26' }}>
                <TableCell colSpan={3} align="center" sx={{ py: 1, borderTop: '1px solid #00ff88', borderBottom: '1px solid #ff3366' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ fontSize: '10px', color: '#6b7280', fontWeight: 700 }}>
                      SPREAD:
                    </Typography>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#00aaff', fontFamily: 'monospace' }}>
                      {formatPrice(orderBook.spread)}
                    </Typography>
                    <Typography sx={{ fontSize: '9px', color: '#6b7280' }}>
                      ({((orderBook.spread / (orderBook.bids[0]?.price || 1)) * 100).toFixed(3)}%)
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {/* Bids (Buy Orders) */}
            {(view === 0 || view === 1) && renderBids()}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Loading State */}
      {loading && (
        <Box sx={{ p: 1, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Updating...
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!loading && (!orderBook?.bids?.length && !orderBook?.asks?.length) && (
        <Box sx={{ p: 3, textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ color: '#6b7280', fontSize: '11px' }}>
            No orders in the book. Place the first order!
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
