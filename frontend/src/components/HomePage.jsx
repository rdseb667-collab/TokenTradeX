import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  Security,
  Speed,
  AttachMoney,
  People,
  EmojiEvents
} from '@mui/icons-material';
import api from '../services/api';

export default function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, activitiesRes, leaderboardRes] = await Promise.all([
        api.get('/activity/stats'),
        api.get('/activity/recent?limit=10'),
        api.get('/activity/leaderboard?timeframe=24h&limit=5')
      ]);

      setStats(statsRes.data.data);
      setActivities(activitiesRes.data.data);
      setLeaderboard(leaderboardRes.data.data);
    } catch (error) {
      console.error('Failed to fetch homepage data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#0a0e27', minHeight: '100vh', py: 8 }}>
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h2" fontWeight={800} gutterBottom sx={{
            background: 'linear-gradient(45deg, #00ff88, #00d4ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Trade Smarter with TTX
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
            Get up to 90% fee discounts + earn rewards
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 6 }}>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => navigate('/signup')}
              sx={{ 
                bgcolor: '#00ff88',
                color: '#000',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 700,
                '&:hover': { bgcolor: '#00d470' }
              }}
            >
              Get 100 TTX Free
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              onClick={() => navigate('/login')}
              sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
            >
              Sign In
            </Button>
          </Box>

          {/* Live Stats */}
          {stats && (
            <Grid container spacing={3} sx={{ mb: 6 }}>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}>
                  <CardContent>
                    <Typography variant="h4" color="primary.main" fontWeight={700}>
                      ${(stats.last24h?.totalVolume || 0).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      24h Volume
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)' }}>
                  <CardContent>
                    <Typography variant="h4" color="info.main" fontWeight={700}>
                      {(stats.last24h?.totalTrades || 0).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      24h Trades
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.3)' }}>
                  <CardContent>
                    <Typography variant="h4" color="warning.main" fontWeight={700}>
                      {stats.last24h?.activeTokens || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Tokens
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'rgba(156,39,176,0.1)', border: '1px solid rgba(156,39,176,0.3)' }}>
                  <CardContent>
                    <Typography variant="h4" color="secondary.main" fontWeight={700}>
                      ${(stats.last24h?.avgTradeSize || 0).toFixed(0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Trade Size
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>

        {/* TTX Rewards Section */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center" sx={{ mb: 4 }}>
            Earn TTX Rewards 🎁
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', bgcolor: 'rgba(255,255,255,0.05)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AttachMoney sx={{ fontSize: 40, color: '#00ff88', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        100 TTX Welcome Bonus
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Instant reward when you sign up
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', bgcolor: 'rgba(255,255,255,0.05)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <People sx={{ fontSize: 40, color: '#00d4ff', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        500 TTX per Referral
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Earn when friends join with your code
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', bgcolor: 'rgba(255,255,255,0.05)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUp sx={{ fontSize: 40, color: '#ff9800', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        250 TTX First Trade
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Bonus for your first successful trade
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', bgcolor: 'rgba(255,255,255,0.05)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EmojiEvents sx={{ fontSize: 40, color: '#9c27b0', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Up to 25K TTX Milestones
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Rewards at $1K, $10K, $100K volume
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        <Grid container spacing={4}>
          {/* Live Trading Activity */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)' }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                🔥 Live Trading Activity
              </Typography>
              {loading ? (
                <LinearProgress />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Token</TableCell>
                        <TableCell>Side</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell>Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activities.map((activity, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip label={activity.symbol} size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={activity.side?.toUpperCase() || 'BUY'} 
                              size="small"
                              color={activity.side === 'sell' ? 'error' : 'success'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {activity.quantity?.toFixed(4)}
                          </TableCell>
                          <TableCell align="right">
                            ${activity.price?.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>

          {/* Leaderboard */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)' }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                🏆 Top Traders (24h)
              </Typography>
              {loading ? (
                <LinearProgress />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Rank</TableCell>
                        <TableCell>Trader</TableCell>
                        <TableCell align="right">Volume</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leaderboard.map((trader, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography fontWeight={700}>
                              #{index + 1}
                            </Typography>
                          </TableCell>
                          <TableCell>{trader.username}</TableCell>
                          <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 700 }}>
                            ${trader.volume?.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Features */}
        <Box sx={{ mt: 8 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center" sx={{ mb: 4 }}>
            Why TokenTradeX?
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
                <Security sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Bank-Grade Security
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  2FA, encryption, and secure wallet storage
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
                <Speed sx={{ fontSize: 60, color: 'info.main', mb: 2 }} />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Lightning Fast
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Execute trades in milliseconds
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
                <TrendingUp sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Lowest Fees
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Up to 90% discount with TTX tokens
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}
