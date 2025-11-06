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
        const response = await api.get(`/orders/book/${token.symbol}?depth=15`);
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(price);
  };

  const formatQuantity = (qty) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(qty);
  };

  const renderAsks = () => (
    <>
      {orderBook.asks.slice(0, view === 0 ? 10 : 15).reverse().map((ask, index) => (
        <TableRow
          key={`ask-${index}`}
          sx={{
            bgcolor: `rgba(239, 83, 80, ${0.05 + (index / orderBook.asks.length) * 0.1})`,
            '&:hover': { bgcolor: 'rgba(239, 83, 80, 0.2)' }
          }}
        >
          <TableCell sx={{ color: 'error.main', fontWeight: 600 }}>
            {formatPrice(ask.price)}
          </TableCell>
          <TableCell align="right">{formatQuantity(ask.quantity)}</TableCell>
          <TableCell align="right">{formatPrice(ask.total)}</TableCell>
        </TableRow>
      ))}
    </>
  );

  const renderBids = () => (
    <>
      {orderBook.bids.slice(0, view === 0 ? 10 : 15).map((bid, index) => (
        <TableRow
          key={`bid-${index}`}
          sx={{
            bgcolor: `rgba(38, 166, 154, ${0.05 + (index / orderBook.bids.length) * 0.1})`,
            '&:hover': { bgcolor: 'rgba(38, 166, 154, 0.2)' }
          }}
        >
          <TableCell sx={{ color: 'success.main', fontWeight: 600 }}>
            {formatPrice(bid.price)}
          </TableCell>
          <TableCell align="right">{formatQuantity(bid.quantity)}</TableCell>
          <TableCell align="right">{formatPrice(bid.total)}</TableCell>
        </TableRow>
      ))}
    </>
  );

  if (!token) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Select a token to view order book</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Order Book
          </Typography>
          {orderBook.spread > 0 && (
            <Chip
              label={`Spread: ${formatPrice(orderBook.spread)}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        <Tabs value={view} onChange={(e, v) => setView(v)} variant="fullWidth">
          <Tab label="Both" />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><TrendingUp fontSize="small" /> Bids</Box>} />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><TrendingDown fontSize="small" /> Asks</Box>} />
        </Tabs>
      </Box>

      {/* Order Book Table */}
      <TableContainer sx={{ flex: 1, maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Amount ({token.symbol})</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Total (USD)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Asks (Sell Orders) */}
            {(view === 0 || view === 2) && renderAsks()}

            {/* Spread Row */}
            {view === 0 && orderBook.bids.length > 0 && orderBook.asks.length > 0 && (
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell colSpan={3} align="center" sx={{ py: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Spread:
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {formatPrice(orderBook.spread)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ({((orderBook.spread / orderBook.bids[0]?.price) * 100).toFixed(3)}%)
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
      {!loading && orderBook.bids.length === 0 && orderBook.asks.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No orders in the book yet. Be the first to place an order!
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
