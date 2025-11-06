import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { Warning, TrendingUp, Group, AttachMoney } from '@mui/icons-material';
import api from '../services/api';

export default function WhaleWatch() {
  const [whales, setWhales] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [whalesRes, statsRes] = await Promise.all([
        api.get('/whale-protection/whales?limit=10'),
        api.get('/whale-protection/stats')
      ]);
      setWhales(whalesRes.data.data);
      setStats(statsRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading whale data:', error);
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#e8e8e8' }}>
          🐋 Whale Watch
        </Typography>
        <Typography variant="body1" sx={{ color: '#9ca3af' }}>
          Real-time monitoring of large holders and platform activity
        </Typography>
      </Box>

      {/* Platform Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={3}>
            <Card elevation={0} sx={{ bgcolor: '#0f1419', border: '2px solid #00aaff', borderRadius: 0 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Group sx={{ color: '#00aaff' }} />
                  <Typography sx={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' }}>
                    Total Users
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#00aaff' }}>
                  {stats.totalUsers.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Card elevation={0} sx={{ bgcolor: '#0f1419', border: '2px solid #00ff88', borderRadius: 0 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TrendingUp sx={{ color: '#00ff88' }} />
                  <Typography sx={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' }}>
                    24h Volume
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#00ff88' }}>
                  ${(stats.totalVolume24h / 1000000).toFixed(2)}M
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Card elevation={0} sx={{ bgcolor: '#0f1419', border: '2px solid #ffaa00', borderRadius: 0 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AttachMoney sx={{ color: '#ffaa00' }} />
                  <Typography sx={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' }}>
                    Market Cap
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffaa00' }}>
                  ${(stats.totalMarketCap / 1000000).toFixed(2)}M
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Card elevation={0} sx={{ bgcolor: '#0f1419', border: '2px solid #ff3366', borderRadius: 0 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Warning sx={{ color: '#ff3366' }} />
                  <Typography sx={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' }}>
                    Circuit Breakers
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff3366' }}>
                  {stats.activeCircuitBreakers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Protection Info */}
      <Alert 
        severity="info" 
        sx={{ mb: 3, bgcolor: '#0f1419', border: '1px solid #00aaff', borderRadius: 0, color: '#e8e8e8' }}
      >
        <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: '12px' }}>Platform Protection Active</Typography>
        <Typography sx={{ fontSize: '11px', color: '#9ca3af' }}>
          • Max 5% token supply per wallet &nbsp;•&nbsp; Daily withdrawal limits &nbsp;•&nbsp; 15% circuit breakers &nbsp;•&nbsp; All activity is on-chain and transparent
        </Typography>
      </Alert>

      {/* Whale Table */}
      <Paper elevation={0} sx={{ bgcolor: '#0a0e14', border: '1px solid #1f2937', borderRadius: 0 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #1f2937' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', color: '#e8e8e8' }}>
            Top Whale Holders ($100K+)
          </Typography>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#0f1419' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af', borderBottom: '1px solid #1f2937' }}>RANK</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af', borderBottom: '1px solid #1f2937' }}>WHALE ID</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af', borderBottom: '1px solid #1f2937' }}>TOKEN</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af', borderBottom: '1px solid #1f2937' }}>HOLDINGS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af', borderBottom: '1px solid #1f2937' }}>VALUE (USD)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', color: '#9ca3af', borderBottom: '1px solid #1f2937' }}>% OF SUPPLY</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {whales.map((whale) => (
                <TableRow 
                  key={whale.rank} 
                  sx={{ 
                    '&:hover': { bgcolor: '#0f1419' },
                    borderBottom: '1px solid #1f2937'
                  }}
                >
                  <TableCell sx={{ color: '#e8e8e8', fontSize: '12px', borderBottom: '1px solid #1f2937' }}>
                    #{whale.rank}
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #1f2937' }}>
                    <Chip 
                      label={whale.walletId} 
                      size="small" 
                      sx={{ 
                        bgcolor: '#1f2937', 
                        color: '#00ff88', 
                        fontWeight: 700,
                        fontSize: '11px',
                        borderRadius: 0
                      }} 
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#e8e8e8', fontWeight: 700, fontSize: '12px', borderBottom: '1px solid #1f2937' }}>
                    {whale.tokenSymbol}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#e8e8e8', fontSize: '12px', borderBottom: '1px solid #1f2937' }}>
                    {whale.holdings.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 700, fontSize: '12px', borderBottom: '1px solid #1f2937' }}>
                    ${whale.valueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: '1px solid #1f2937' }}>
                    <Chip 
                      label={`${whale.percentOfSupply}%`}
                      size="small"
                      sx={{
                        bgcolor: parseFloat(whale.percentOfSupply) > 3 ? '#ff3366' : '#1f2937',
                        color: parseFloat(whale.percentOfSupply) > 3 ? '#fff' : '#9ca3af',
                        fontWeight: 700,
                        fontSize: '10px',
                        borderRadius: 0
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {whales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#9ca3af', borderBottom: 'none' }}>
                    No whale activity detected
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Transparency Note */}
      <Alert 
        severity="success" 
        sx={{ mt: 3, bgcolor: '#0f1419', border: '1px solid #00ff88', borderRadius: 0, color: '#e8e8e8' }}
      >
        <Typography sx={{ fontSize: '11px' }}>
          <strong>🔒 Transparent & Fair:</strong> All wallet addresses are monitored on-chain. 
          Position limits prevent single wallets from controlling {">"} 5% of any token supply. 
          Circuit breakers pause trading if price moves {">"} 15% in 5 minutes.
        </Typography>
      </Alert>
    </Container>
  );
}
