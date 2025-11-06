import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment
} from '@mui/material';
import {
  TrendingUp,
  AccountBalance,
  Speed,
  AccessTime,
  CheckCircle,
  ShowChart
} from '@mui/icons-material';
// Toast notifications handled by Toaster component in App.jsx
import api from '../services/api';

/**
 * FRACTIONAL SHARES PAGE
 * 
 * BlackRock's Vision: "If we can ETF Bitcoin, imagine what we can do with ALL financial instruments"
 * 
 * FEATURES:
 * - Buy 0.01 shares (vs $1,000 minimum)
 * - Instant settlement (vs T+2)
 * - 24/7 trading (vs 6.5 hours weekdays)
 * - Full dividend rights (not wrappers)
 * - Real-time valuations (vs quarterly reports)
 */

export default function FractionalShares() {
  const [stocks, setStocks] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [fractionalAmount, setFractionalAmount] = useState('0.1');
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load available fractional stocks
      const stocksRes = await api.get('/rwa/tokens/category/EQUITY');
      setStocks(stocksRes.data.data || []);
      
      // Load user's fractional holdings
      try {
        const holdingsRes = await api.get('/fractional-shares/holdings');
        setHoldings(holdingsRes.data.holdings || []);
      } catch (err) {
        // User might not be logged in
        console.log('Not logged in');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load fractional shares');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyClick = async (stock) => {
    setSelectedStock(stock);
    setBuyDialogOpen(true);
    
    // Load comparison stats
    try {
      const pricePerShare = stock.underlyingAsset?.pricePerShare || stock.currentPrice * 1000;
      const compRes = await api.get(`/fractional-shares/compare/${pricePerShare}`);
      setComparison(compRes.data.comparison);
    } catch (err) {
      console.error('Error loading comparison:', err);
    }
  };

  const handleBuyFractional = async () => {
    try {
      const amount = parseFloat(fractionalAmount);
      if (amount <= 0) {
        alert('Amount must be greater than 0');
        return;
      }

      const res = await api.post('/fractional-shares/buy', {
        tokenId: selectedStock.id,
        fractionalAmount: amount,
        paymentMethod: 'USD'
      });

      alert(res.data.message);
      setBuyDialogOpen(false);
      setFractionalAmount('0.1');
      loadData();
    } catch (error) {
      console.error('Error buying fractional shares:', error);
      alert(error.response?.data?.message || 'Failed to buy fractional shares');
    }
  };

  const calculateCost = () => {
    if (!selectedStock || !fractionalAmount) return 0;
    const pricePerShare = selectedStock.underlyingAsset?.pricePerShare || selectedStock.currentPrice * 1000;
    return (parseFloat(fractionalAmount) * pricePerShare).toFixed(2);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#e8e8e8', fontWeight: 600 }}>
          Fractional Shares
        </Typography>
        <Typography variant="body1" sx={{ color: '#9ca3af', mb: 3 }}>
          Buy 0.01 shares instead of full $1,000. Instant settlement, 24/7 trading, full dividend rights.
        </Typography>
      </Box>

      {/* Key Benefits */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#0f1419', 
            border: '1px solid #1e2329',
            borderRadius: 0
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp sx={{ color: '#00ff88' }} />
                <Typography variant="h6" sx={{ color: '#e8e8e8' }}>
                  $1 Minimum
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                vs $1,000+ for full shares
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#0f1419', 
            border: '1px solid #1e2329',
            borderRadius: 0
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Speed sx={{ color: '#00aaff' }} />
                <Typography variant="h6" sx={{ color: '#e8e8e8' }}>
                  Instant Settlement
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                vs T+2 (2-3 days)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#0f1419', 
            border: '1px solid #1e2329',
            borderRadius: 0
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AccessTime sx={{ color: '#ffaa00' }} />
                <Typography variant="h6" sx={{ color: '#e8e8e8' }}>
                  24/7 Trading
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                vs 6.5 hours weekdays
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#0f1419', 
            border: '1px solid #1e2329',
            borderRadius: 0
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle sx={{ color: '#00ff88' }} />
                <Typography variant="h6" sx={{ color: '#e8e8e8' }}>
                  Full Rights
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                Dividends + voting (not wrappers)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Your Holdings */}
      {holdings.length > 0 && (
        <Card sx={{ 
          mb: 4, 
          bgcolor: '#0f1419', 
          border: '1px solid #1e2329',
          borderRadius: 0
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#e8e8e8', mb: 2 }}>
              Your Fractional Holdings
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }}>Ticker</TableCell>
                    <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }}>Company</TableCell>
                    <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }} align="right">Fractional Shares</TableCell>
                    <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }} align="right">Value</TableCell>
                    <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }} align="center">Dividends</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {holdings.map((holding, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ color: '#e8e8e8', borderBottom: '1px solid #1e2329' }}>
                        <Chip label={holding.ticker} size="small" sx={{ bgcolor: '#00aaff', color: '#fff' }} />
                      </TableCell>
                      <TableCell sx={{ color: '#e8e8e8', borderBottom: '1px solid #1e2329' }}>
                        {holding.companyName}
                      </TableCell>
                      <TableCell sx={{ color: '#e8e8e8', borderBottom: '1px solid #1e2329' }} align="right">
                        {holding.fractionalShares}
                      </TableCell>
                      <TableCell sx={{ color: '#00ff88', borderBottom: '1px solid #1e2329' }} align="right">
                        {holding.currentValue}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #1e2329' }} align="center">
                        {holding.dividendEligible ? (
                          <CheckCircle sx={{ color: '#00ff88', fontSize: 20 }} />
                        ) : (
                          <Typography sx={{ color: '#9ca3af' }}>-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Available Stocks */}
      <Card sx={{ 
        bgcolor: '#0f1419', 
        border: '1px solid #1e2329',
        borderRadius: 0
      }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#e8e8e8', mb: 2 }}>
            Available Fractional Stocks
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }}>Symbol</TableCell>
                  <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }}>Company</TableCell>
                  <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }} align="right">Price/Share</TableCell>
                  <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }} align="right">Min. Investment</TableCell>
                  <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }} align="center">Dividends</TableCell>
                  <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stocks.map((stock) => {
                  const pricePerShare = stock.underlyingAsset?.pricePerShare || stock.currentPrice * 1000;
                  const minInvestment = pricePerShare * 0.001;
                  
                  return (
                    <TableRow key={stock.id}>
                      <TableCell sx={{ color: '#e8e8e8', borderBottom: '1px solid #1e2329' }}>
                        <Chip 
                          label={stock.underlyingAsset?.ticker || stock.symbol} 
                          size="small" 
                          sx={{ bgcolor: '#00aaff', color: '#fff' }} 
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#e8e8e8', borderBottom: '1px solid #1e2329' }}>
                        {stock.name}
                      </TableCell>
                      <TableCell sx={{ color: '#e8e8e8', borderBottom: '1px solid #1e2329' }} align="right">
                        ${pricePerShare.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ color: '#00ff88', borderBottom: '1px solid #1e2329' }} align="right">
                        ${minInvestment.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #1e2329' }} align="center">
                        {stock.dividendsEnabled ? (
                          <CheckCircle sx={{ color: '#00ff88', fontSize: 20 }} />
                        ) : (
                          <Typography sx={{ color: '#9ca3af' }}>-</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #1e2329' }} align="right">
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleBuyClick(stock)}
                          sx={{
                            bgcolor: '#00ff88',
                            color: '#0a0e14',
                            borderRadius: 0,
                            '&:hover': { bgcolor: '#00dd77' }
                          }}
                        >
                          BUY FRACTIONAL
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {stocks.length === 0 && !loading && (
            <Alert severity="info" sx={{ mt: 2, bgcolor: '#1e2329', color: '#e8e8e8' }}>
              No fractional stocks available yet. Contact admin to create tokens.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Buy Dialog */}
      <Dialog 
        open={buyDialogOpen} 
        onClose={() => setBuyDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#0f1419',
            border: '1px solid #1e2329',
            borderRadius: 0,
            minWidth: 500
          }
        }}
      >
        <DialogTitle sx={{ color: '#e8e8e8', borderBottom: '1px solid #1e2329' }}>
          Buy Fractional Shares - {selectedStock?.underlyingAsset?.ticker || selectedStock?.symbol}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Fractional Amount"
            type="number"
            value={fractionalAmount}
            onChange={(e) => setFractionalAmount(e.target.value)}
            inputProps={{ min: 0.001, step: 0.01 }}
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: '#9ca3af' },
              '& .MuiInputBase-input': { color: '#e8e8e8' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e2329' }
            }}
            InputProps={{
              endAdornment: <InputAdornment position="end" sx={{ color: '#9ca3af' }}>shares</InputAdornment>
            }}
          />

          <Box sx={{ p: 2, bgcolor: '#0a0e14', border: '1px solid #1e2329', mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
              Total Cost
            </Typography>
            <Typography variant="h4" sx={{ color: '#00ff88' }}>
              ${calculateCost()}
            </Typography>
          </Box>

          {comparison && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#e8e8e8', mb: 1 }}>
                Traditional vs Tokenized:
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#ff3366' }}>
                    Traditional: ${comparison.traditional.minimumInvestment}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#00ff88' }}>
                    Tokenized: ${comparison.tokenized.minimumInvestment}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#ff3366' }}>
                    Settlement: {comparison.traditional.settlement}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: '#00ff88' }}>
                    Settlement: {comparison.tokenized.settlement}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #1e2329', p: 2 }}>
          <Button 
            onClick={() => setBuyDialogOpen(false)}
            sx={{ color: '#9ca3af' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBuyFractional}
            variant="contained"
            sx={{
              bgcolor: '#00ff88',
              color: '#0a0e14',
              borderRadius: 0,
              '&:hover': { bgcolor: '#00dd77' }
            }}
          >
            BUY NOW (Instant Settlement)
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
