import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Paper,
  LinearProgress,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  TrendingUp,
  AccountBalanceWallet,
  ShowChart,
  LocalAtm,
  EmojiEvents
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import api from '../services/api';

export default function UserEarnings() {
  const { user } = useSelector(state => state.auth);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEarnings();
    // Refresh every 30 seconds to show live earnings
    const interval = setInterval(loadEarnings, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadEarnings = async () => {
    try {
      const res = await api.get('/earnings/summary');
      setEarnings(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading earnings:', error);
      setLoading(false);
    }
  };

  if (loading) return <LinearProgress />;

  const {
    ttxHoldings = 0,
    totalEarnedThisMonth = 0,
    totalEarnedAllTime = 0,
    platformVolumeToday = 0,
    yourShareToday = 0,
    estimatedMonthly = 0,
    estimatedYearly = 0,
    apy = 0,
    recentEarnings = []
  } = earnings || {};

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Stats */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
          💰 Your Earnings Dashboard
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 3 }}>
          You earn from EVERY trade on the platform - even trades you don't make!
        </Typography>

        <Grid container spacing={3}>
          {/* Total Earned This Month */}
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#0f1419', border: '2px solid #00ff88', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocalAtm sx={{ color: '#00ff88', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    This Month
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#00ff88' }}>
                  ${totalEarnedThisMonth.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  From platform fees
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Earned Today */}
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#0f1419', border: '2px solid #ffaa00', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ color: '#ffaa00', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    Today
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ffaa00' }}>
                  ${yourShareToday.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  Platform did ${platformVolumeToday.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* All Time */}
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#0f1419', border: '2px solid #00aaff', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EmojiEvents sx={{ color: '#00aaff', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    All Time
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#00aaff' }}>
                  ${totalEarnedAllTime.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  Total earnings
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* APY */}
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#0f1419', border: '2px solid #BA68C8', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ShowChart sx={{ color: '#BA68C8', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    Current APY
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#BA68C8' }}>
                  {apy.toFixed(1)}%
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  Annual return rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* How It Works */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
          🎯 How You're Earning Right Now:
        </Typography>
        <Typography variant="body2">
          • You hold {ttxHoldings.toLocaleString()} TTX tokens ({((ttxHoldings / 500000000) * 100).toFixed(4)}% of supply)<br/>
          • Every trade on the platform generates fees<br/>
          • 15% of ALL fees → Automatically split among TTX holders<br/>
          • Your share is deposited to your wallet automatically<br/>
          • <strong>No staking required. No claiming. Just hold TTX and earn!</strong>
        </Typography>
      </Alert>

      {/* Projections */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#0f1419', border: '2px solid #FFD700' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: '#FFD700' }}>
          📈 Your Earning Projections
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#9ca3af' }} gutterBottom>
                Estimated Monthly Earnings
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ffaa00' }}>
                ${estimatedMonthly.toFixed(2)}/month
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                Based on current platform volume
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#9ca3af' }} gutterBottom>
                Estimated Yearly Earnings
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#00ff88' }}>
                ${estimatedYearly.toFixed(2)}/year
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                Passive income from holding
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Alert severity="success" sx={{ mt: 2, bgcolor: '#1a2a1a', border: '1px solid #00ff88' }}>
          <Typography variant="body2" sx={{ color: '#e8e8e8' }}>
            💡 <strong style={{ color: '#00ff88' }}>Earning Tip:</strong> As platform volume grows, your earnings grow automatically! 
            If volume 10x, your earnings 10x. <strong style={{ color: '#FFD700' }}>Example: 10,000 TTX at Binance-scale = $300/month passive income!</strong>
          </Typography>
        </Alert>
      </Paper>

      {/* Recent Earnings History */}
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
        💸 Recent Earnings (Live)
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#0a0e14' }}>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Source</strong></TableCell>
              <TableCell><strong>Platform Volume</strong></TableCell>
              <TableCell><strong>Total Fees</strong></TableCell>
              <TableCell align="right"><strong>Your Share</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentEarnings.map((earning, idx) => (
              <TableRow key={idx} sx={{ '&:hover': { bgcolor: '#1a1f26' } }}>
                <TableCell>
                  {new Date(earning.date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={earning.source} 
                    size="small" 
                    color={earning.source === 'Trading Fees' ? 'primary' : 'secondary'}
                  />
                </TableCell>
                <TableCell>${earning.platformVolume.toLocaleString()}</TableCell>
                <TableCell>${earning.totalFees.toFixed(2)}</TableCell>
                <TableCell align="right">
                  <Typography sx={{ fontWeight: 'bold', color: '#00ff88' }}>
                    +${earning.yourShare.toFixed(4)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {recentEarnings.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography>
            Start earning by holding TTX! Your earnings will appear here automatically as trades happen on the platform.
          </Typography>
        </Alert>
      )}

      {/* Boost Your Earnings */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: '#0f1419', border: '2px solid #00aaff' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: '#e8e8e8' }}>
          🚀 Want to Earn More?
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#0a0e14', border: '1px solid #00ff88' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: '#e8e8e8' }}>
                  Hold More TTX
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  Double your TTX = Double your earnings. Every TTX token gives you a share of platform fees.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#0a0e14', border: '1px solid #ffaa00' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: '#e8e8e8' }}>
                  Trade & Earn
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  Earn 5-20 FREE TTX per $100 traded. More trading = More TTX = More passive income.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#0a0e14', border: '1px solid #00aaff' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: '#e8e8e8' }}>
                  Refer Friends
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  More users = More volume = Higher earnings for everyone. Share and grow together!
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
