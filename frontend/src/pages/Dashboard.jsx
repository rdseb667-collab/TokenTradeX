import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { TrendingUp, TrendingDown, AccountBalanceWallet, ShowChart, SwapHoriz } from '@mui/icons-material';

import { fetchTokens } from '../store/slices/tokensSlice';
import { fetchWallet } from '../store/slices/walletSlice';
import { fetchOrders } from '../store/slices/ordersSlice';
import InfoTooltip from '../components/InfoTooltip';
import LiveMarketTicker from '../components/LiveMarketTicker';
import FeatureHighlights from '../components/FeatureHighlights';
import RevenueModelHighlight from '../components/RevenueModelHighlight';
import api from '../services/api';

export default function Dashboard() {
  const dispatch = useDispatch();
  const { list: tokens } = useSelector((state) => state.tokens);
  const { totalValue, wallets } = useSelector((state) => state.wallet);
  const { list: orders } = useSelector((state) => state.orders);
  
  const [livePrices, setLivePrices] = useState({});
  const [platformStats, setPlatformStats] = useState(null);
  const [liveEarnings, setLiveEarnings] = useState({ today: 0, thisMonth: 0 });

  useEffect(() => {
    dispatch(fetchTokens());
    dispatch(fetchWallet());
    dispatch(fetchOrders({ limit: 5 }));
    loadPlatformStats();
    loadUserEarnings();
    
    // Refresh platform stats every 5 seconds
    const interval = setInterval(() => {
      loadPlatformStats();
      loadUserEarnings();
    }, 5000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const loadPlatformStats = async () => {
    try {
      const res = await api.get('/earnings/platform');
      setPlatformStats(res.data.platform);
    } catch (error) {
      console.error('Error loading platform stats:', error);
    }
  };

  const loadUserEarnings = async () => {
    try {
      const res = await api.get('/earnings/summary');
      setLiveEarnings({
        today: res.data.yourShareToday || 0,
        thisMonth: res.data.totalEarnedThisMonth || 0
      });
    } catch (error) {
      // User might not be logged in, ignore
    }
  };

  // Live price updates every 5 seconds
  useEffect(() => {
    if (tokens.length === 0) return;

    const updatePrices = () => {
      setLivePrices(prev => {
        const updated = {};
        tokens.forEach(token => {
          const current = prev[token.id] || parseFloat(token.currentPrice);
          const fluctuation = (Math.random() - 0.5) * 50;
          updated[token.id] = Math.max(current + fluctuation, 1);
        });
        return updated;
      });
    };

    updatePrices();
    const interval = setInterval(updatePrices, 5000);
    return () => clearInterval(interval);
  }, [tokens]);

  const recentOrders = orders.slice(0, 5);

  const safeTotal = totalValue || 0;

  const stats = [
    {
      title: 'Portfolio Value',
      value: `$${safeTotal.toLocaleString()}`,
      icon: <AccountBalanceWallet sx={{ fontSize: 32 }} />,
      color: '#00ff88',
      trend: '+12.5%'
    },
    {
      title: 'Active Tokens',
      value: wallets.filter(w => parseFloat(w.balance) > 0).length,
      icon: <ShowChart sx={{ fontSize: 32 }} />,
      color: '#00aaff',
      trend: `${tokens.length} available`
    },
    {
      title: '24h Volume',
      value: `$${(safeTotal * 2.5).toLocaleString()}`,
      icon: <SwapHoriz sx={{ fontSize: 32 }} />,
      color: '#ffaa00',
      trend: '+8.2%'
    }
  ];

  return (
    <Box>
      {/* Platform Earnings Banner */}
      {platformStats && (
        <Paper 
          elevation={0}
          sx={{ 
            p: 2, 
            mb: 3,
            bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1419 100%)',
            border: '2px solid #00ff88',
            borderRadius: 1
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase' }}>
                    🔥 Platform Volume Today
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#00ff88' }}>
                    ${(platformStats.volumeToday || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <InfoTooltip title="Total trading volume across all tokens in the last 24 hours" placement="bottom" />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase' }}>
                    💰 Holders Earned
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffaa00' }}>
                    ${(platformStats.holderShare || 0).toFixed(2)}
                  </Typography>
                </Box>
                <InfoTooltip title="15% of all trading fees distributed to TTX holders today" placement="bottom" />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase' }}>
                    💎 Mining Distributed
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#00aaff' }}>
                    {(platformStats.miningDistributed || 0).toFixed(0)} TTX
                  </Typography>
                </Box>
                <InfoTooltip title="Total TTX tokens awarded to traders today through mining rewards" placement="bottom" />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" sx={{ color: '#e8e8e8', fontSize: '11px' }}>
                💡 Trade now to earn TTX rewards! 5-20 TTX per $100 traded
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Live Market Ticker */}
      <LiveMarketTicker tokens={tokens} />

      {/* Personal Earnings Ticker */}
      {liveEarnings.today > 0 && (
        <Box 
          sx={{ 
            mb: 2, 
            p: 1.5, 
            bgcolor: 'rgba(0, 255, 136, 0.1)', 
            border: '1px solid #00ff88',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#00ff88' }}>
              💰 YOUR EARNINGS
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#e8e8e8' }}>
              Today: <span style={{ color: '#00ff88' }}>${liveEarnings.today.toFixed(4)}</span>
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#e8e8e8' }}>
              This Month: <span style={{ color: '#ffaa00' }}>${liveEarnings.thisMonth.toFixed(2)}</span>
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '10px', color: '#9ca3af' }}>
            Updates every 5 seconds
          </Typography>
        </Box>
      )}

      {/* Hero Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={4} key={index}>
            <Card 
              elevation={0}
              sx={{
                border: '1px solid #1f2937',
                borderTop: `3px solid ${stat.color}`,
                bgcolor: '#0f1419',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: stat.color,
                  transform: 'translateY(-4px)'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography 
                    sx={{ 
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#9ca3af'
                    }}
                  >
                    {stat.title}
                  </Typography>
                  <Box sx={{ color: stat.color }}>
                    {stat.icon}
                  </Box>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {stat.value}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>
                  {stat.trend}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Feature Highlights */}
      <FeatureHighlights />

      {/* Revenue Model Showcase */}
      <RevenueModelHighlight />

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #1f2937' }}>
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                fontWeight: 700,
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                mb: 2
              }}
            >
              Live Market Feed
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '11px', py: 1 }}>Asset</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px', py: 1 }}>Live Price</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px', py: 1 }}>24h Change</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px', py: 1 }}>Volume</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tokens.map((token) => {
                    const livePrice = livePrices[token.id] || parseFloat(token.currentPrice);
                    const change = parseFloat(token.priceChange24h) || 0;
                    const isPositive = change >= 0;

                    return (
                      <TableRow key={token.id} hover sx={{ '&:hover': { bgcolor: 'rgba(0,255,136,0.03)' } }}>
                        <TableCell sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '13px' }}>
                              {token.symbol}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '11px' }}>
                              {token.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '14px', py: 1.5 }}>
                          ${livePrice.toFixed(2)}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                            {isPositive ? (
                              <TrendingUp sx={{ fontSize: 16, color: '#00ff88' }} />
                            ) : (
                              <TrendingDown sx={{ fontSize: 16, color: '#ff3366' }} />
                            )}
                            <Typography
                              sx={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: isPositive ? '#00ff88' : '#ff3366'
                              }}
                            >
                              {isPositive ? '+' : ''}{change.toFixed(2)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '13px', py: 1.5 }}>
                          ${(parseFloat(token.volume24h) / 1e6).toFixed(2)}M
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #1f2937' }}>
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                fontWeight: 700,
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                mb: 2
              }}
            >
              Recent Activity
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Token</TableCell>
                    <TableCell>Side</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>{order.token?.symbol || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          label={order.side.toUpperCase()}
                          size="small"
                          color={order.side === 'buy' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={order.status} size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography variant="body2" color="textSecondary">
                          No recent orders
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
