import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  AccountBalance,
  LocalGasStation,
  Home,
  Palette,
  AttachMoney,
  Nature
} from '@mui/icons-material';
import api from '../services/api';

const CATEGORIES = {
  ALL: { label: 'All Assets', icon: <AttachMoney /> },
  EQUITY: { label: 'Stocks', icon: <TrendingUp /> },
  COMMODITY: { label: 'Commodities', icon: <LocalGasStation /> },
  REAL_ESTATE: { label: 'Real Estate', icon: <Home /> },
  FIXED_INCOME: { label: 'Bonds', icon: <AccountBalance /> },
  ART_COLLECTIBLE: { label: 'Art & Collectibles', icon: <Palette /> },
  CARBON_CREDIT: { label: 'Carbon Credits', icon: <Nature /> }
};

export default function RWAMarketplace() {
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      const [tokensRes, statsRes] = await Promise.all([
        selectedCategory === 'ALL' 
          ? api.get('/rwa/tokens')
          : api.get(`/rwa/tokens/category/${selectedCategory}`),
        api.get('/rwa/stats')
      ]);
      
      setTokens(tokensRes.data.data);
      setStats(statsRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading RWA data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: '#e8e8e8' }}>
          🌍 Real-World Asset Marketplace
        </Typography>
        <Typography variant="h6" sx={{ color: '#9ca3af' }}>
          Trade tokenized stocks, real estate, commodities & more - 24/7 global access
        </Typography>
      </Box>

      {/* Market Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ bgcolor: '#0f1419', border: '2px solid #00ff88', borderRadius: 0 }}>
              <CardContent>
                <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', mb: 1 }}>
                  TOTAL MARKET CAP
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#00ff88' }}>
                  ${(stats.totalMarketCap / 1000000).toFixed(2)}M
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ bgcolor: '#0f1419', border: '2px solid #00aaff', borderRadius: 0 }}>
              <CardContent>
                <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', mb: 1 }}>
                  TOKENIZED ASSETS
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#00aaff' }}>
                  {stats.totalTokens}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ bgcolor: '#0f1419', border: '2px solid #ffaa00', borderRadius: 0 }}>
              <CardContent>
                <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', mb: 1 }}>
                  24H VOLUME
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffaa00' }}>
                  ${(stats.total24hVolume / 1000).toFixed(0)}K
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ bgcolor: '#0f1419', border: '2px solid #ff3366', borderRadius: 0 }}>
              <CardContent>
                <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', mb: 1 }}>
                  ASSET CATEGORIES
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff3366' }}>
                  {Object.keys(stats.byCategory).filter(c => stats.byCategory[c].count > 0).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Category Filter */}
      <Box sx={{ mb: 3, bgcolor: '#0f1419', border: '1px solid #1f2937', borderRadius: 0 }}>
        <Tabs
          value={selectedCategory}
          onChange={(e, val) => setSelectedCategory(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { color: '#9ca3af', minHeight: '56px', fontSize: '11px', fontWeight: 700 },
            '& .Mui-selected': { color: '#00ff88' }
          }}
        >
          {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
            <Tab
              key={key}
              value={key}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {icon}
                  {label}
                  {stats?.byCategory[key] && (
                    <Chip
                      label={stats.byCategory[key].count}
                      size="small"
                      sx={{ bgcolor: '#1f2937', color: '#00ff88', fontSize: '9px', height: '18px' }}
                    />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Tokens Table */}
      <Paper elevation={0} sx={{ bgcolor: '#0a0e14', border: '1px solid #1f2937', borderRadius: 0 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#0f1419' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af' }}>ASSET</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af' }}>CATEGORY</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af' }}>PRICE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af' }}>24H CHANGE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af' }}>MARKET CAP</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af' }}>VOLUME</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af' }}>FEATURES</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af' }}>ACTION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tokens.map((token) => {
                const priceChange = parseFloat(token.priceChange24h || 0);
                const isPositive = priceChange >= 0;

                return (
                  <TableRow
                    key={token.id}
                    sx={{
                      '&:hover': { bgcolor: '#0f1419' },
                      borderBottom: '1px solid #1f2937'
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '13px', color: '#e8e8e8' }}>
                          {token.symbol}
                        </Typography>
                        <Typography sx={{ fontSize: '11px', color: '#6b7280' }}>
                          {token.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={token.assetCategory || 'CRYPTO'}
                        size="small"
                        sx={{
                          bgcolor: '#1f2937',
                          color: '#00aaff',
                          fontSize: '9px',
                          fontWeight: 700,
                          borderRadius: 0
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '13px', color: '#e8e8e8' }}>
                      ${parseFloat(token.currentPrice).toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: isPositive ? '#00ff88' : '#ff3366'
                        }}
                      >
                        {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '12px', color: '#e8e8e8' }}>
                      ${(parseFloat(token.marketCap) / 1000000).toFixed(2)}M
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '12px', color: '#e8e8e8' }}>
                      ${(parseFloat(token.volume24h) / 1000).toFixed(1)}K
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {token.requiresKYC && (
                          <Chip
                            label="KYC"
                            size="small"
                            sx={{ bgcolor: '#ff3366', color: '#fff', fontSize: '8px', height: '16px' }}
                          />
                        )}
                        {token.dividendsEnabled && (
                          <Chip
                            label="DIV"
                            size="small"
                            sx={{ bgcolor: '#00ff88', color: '#000', fontSize: '8px', height: '16px' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="contained"
                        sx={{
                          bgcolor: '#00ff88',
                          color: '#000',
                          fontSize: '10px',
                          fontWeight: 700,
                          borderRadius: 0,
                          minWidth: '60px',
                          '&:hover': { bgcolor: '#00cc6a' }
                        }}
                        onClick={() => window.location.href = `/app/trading?token=${token.symbol}`}
                      >
                        TRADE
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {tokens.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#9ca3af' }}>
                    No assets found in this category
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Info Banner */}
      <Box sx={{ mt: 3, p: 2, bgcolor: '#0f1419', border: '1px solid #00aaff', borderRadius: 0 }}>
        <Typography sx={{ fontSize: '11px', color: '#e8e8e8' }}>
          <strong>💡 What are RWA Tokens?</strong> Real-World Asset tokens represent fractional ownership of physical or traditional assets. 
          Trade stocks, real estate, commodities and more - 24/7, with instant settlement and global access. All assets are backed by verifiable reserves.
        </Typography>
      </Box>
    </Container>
  );
}
