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
import InfoTooltip from '../components/InfoTooltip';
import api from '../services/api';

export default function UserEarnings() {
  const { user } = useSelector(state => state.auth);
  const [earnings, setEarnings] = useState(null);
  const [myImpact, setMyImpact] = useState(null);
  const [miningStats, setMiningStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEarnings();
    loadMyImpact();
    loadMiningStats();
    // Refresh every 30 seconds to show live earnings
    const interval = setInterval(() => {
      loadEarnings();
      loadMyImpact();
      loadMiningStats();
    }, 30000);
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

  const loadMyImpact = async () => {
    try {
      const res = await api.get('/flywheel/my-impact');
      setMyImpact(res.data.yourImpact);
    } catch (error) {
      console.error('Error loading my impact:', error);
    }
  };

  const loadMiningStats = async () => {
    try {
      const res = await api.get('/earnings/mining');
      setMiningStats(res.data.mining);
    } catch (error) {
      console.error('Error loading mining stats:', error);
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
      {/* Security & Tokenomics Badge */}
      <Alert severity="success" sx={{ mb: 3, bgcolor: '#0a0e14', border: '3px solid #00ff88' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#00ff88' }}>
            🔒 Audit-Ready Tokenomics
          </Typography>
          <Chip label="85/15 Split" size="small" sx={{ bgcolor: '#FFD700', color: '#000', fontWeight: 700 }} />
          <Chip label="No Donation Attacks" size="small" sx={{ bgcolor: '#00ff88', color: '#000', fontWeight: 700 }} />
          <Chip label="Real Buybacks" size="small" sx={{ bgcolor: '#00aaff', color: '#fff', fontWeight: 700 }} />
          <Chip label="10% Withdrawal Limits" size="small" sx={{ bgcolor: '#BA68C8', color: '#fff', fontWeight: 700 }} />
        </Box>
        <Typography variant="body2" sx={{ mt: 1, color: '#9ca3af' }}>
          Smart contract follows Synthetix/Curve/Lido patterns. Separate TTX/ETH accounting, no double-counting, transferFrom security.
        </Typography>
      </Alert>

      {/* Trading Mining Panel */}
      {miningStats && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#0f1419', border: '3px solid #ffaa00' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ffaa00' }}>
              💎 Trading Mining Rewards
            </Typography>
            <InfoTooltip title="Earn TTX automatically by trading. Volume-based tiers reward active traders!" />
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Box>
                <Typography variant="body2" sx={{ color: '#9ca3af' }} gutterBottom>
                  Earned Today
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#e8e8e8' }}>
                  {miningStats.dailyMining.toFixed(2)} TTX
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  Daily Cap: {miningStats.dailyCap} TTX
                </Typography>
                {/* Progress bar for daily cap */}
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontSize: '10px', color: '#9ca3af' }}>
                      Progress
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '10px', color: '#ffaa00', fontWeight: 700 }}>
                      {((miningStats.dailyMining / miningStats.dailyCap) * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: 8, bgcolor: '#1f2937', borderRadius: 1, overflow: 'hidden' }}>
                    <Box 
                      sx={{ 
                        width: `${Math.min((miningStats.dailyMining / miningStats.dailyCap) * 100, 100)}%`, 
                        height: '100%', 
                        bgcolor: '#ffaa00',
                        transition: 'width 0.5s ease',
                        boxShadow: '0 0 10px rgba(255, 170, 0, 0.5)'
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box>
                <Typography variant="body2" sx={{ color: '#9ca3af' }} gutterBottom>
                  This Month
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ffaa00' }}>
                  {miningStats.monthlyMining.toFixed(2)} TTX
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  From trading
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box>
                <Typography variant="body2" sx={{ color: '#9ca3af' }} gutterBottom>
                  Current Rate
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#00ff88' }}>
                  {miningStats.currentTier.reward} TTX
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  Per $100 traded
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box>
                <Typography variant="body2" sx={{ color: '#9ca3af' }} gutterBottom>
                  Volume Today
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#00aaff' }}>
                  ${miningStats.dailyVolume.toFixed(0)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  Trading volume
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2, bgcolor: '#1a2a1a', border: '1px solid #ffaa00' }}>
            <Typography variant="body2" sx={{ color: '#e8e8e8', mb: 1 }}>
              🚀 <strong>Earn MORE:</strong> Trade $10K+ for 10 TTX/$100 | Trade $100K+ for 20 TTX/$100
            </Typography>
            {/* Next tier progress */}
            {miningStats.dailyVolume < 10000 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#9ca3af' }}>
                  ${miningStats.dailyVolume.toFixed(0)} / $10,000 to unlock Tier 2 (10 TTX/$100)
                </Typography>
                <Box sx={{ width: '100%', height: 6, bgcolor: '#0f1419', borderRadius: 1, overflow: 'hidden', mt: 0.5 }}>
                  <Box 
                    sx={{ 
                      width: `${Math.min((miningStats.dailyVolume / 10000) * 100, 100)}%`, 
                      height: '100%', 
                      bgcolor: '#00ff88',
                      transition: 'width 0.5s ease'
                    }}
                  />
                </Box>
              </Box>
            )}
            {miningStats.dailyVolume >= 10000 && miningStats.dailyVolume < 100000 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#9ca3af' }}>
                  ${miningStats.dailyVolume.toFixed(0)} / $100,000 to unlock Tier 3 (20 TTX/$100)
                </Typography>
                <Box sx={{ width: '100%', height: 6, bgcolor: '#0f1419', borderRadius: 1, overflow: 'hidden', mt: 0.5 }}>
                  <Box 
                    sx={{ 
                      width: `${Math.min((miningStats.dailyVolume / 100000) * 100, 100)}%`, 
                      height: '100%', 
                      bgcolor: '#00ff88',
                      transition: 'width 0.5s ease'
                    }}
                  />
                </Box>
              </Box>
            )}
            {miningStats.dailyVolume >= 100000 && (
              <Typography variant="caption" sx={{ fontSize: '10px', color: '#00ff88', fontWeight: 700 }}>
                🏆 MAX TIER UNLOCKED! Earning 20 TTX per $100 traded
              </Typography>
            )}
          </Alert>
        </Paper>
      )}

      {/* My Impact Panel - NEW */}
      {myImpact && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#0f1419', border: '3px solid #00aaff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#00aaff' }}>
              🎯 Your Platform Impact (85/15 Economics)
            </Typography>
            <InfoTooltip title="See how your holdings contribute to the dual-benefit model: You earn 15%, platform grows with 85%" />
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" sx={{ color: '#9ca3af' }} gutterBottom>
                  Your TTX Holdings
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#e8e8e8' }}>
                  {myImpact.ttxHoldings.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  TTX tokens
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" sx={{ color: '#9ca3af' }} gutterBottom>
                  Monthly Trading Volume
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ffaa00' }}>
                  ${myImpact.monthlyVolume.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  Last 30 days
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" sx={{ color: '#9ca3af' }} gutterBottom>
                  Estimated Monthly Earnings
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#00ff88' }}>
                  ${myImpact.monthlyEarnings.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  Passive income
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Alert severity="success" sx={{ mt: 2, bgcolor: '#1a2a1a', border: '1px solid #00aaff' }}>
            <Typography variant="body2" sx={{ color: '#e8e8e8' }}>
              💡 <strong style={{ color: '#00ff88' }}>15% to you</strong> (fair, sustainable rewards) + <strong style={{ color: '#FFD700' }}>85% to platform</strong> (drives growth) = Win-win economics!<br/>
              Every trade strengthens reserve backing. Platform uses ETH reserve for real buybacks via Uniswap.
            </Typography>
          </Alert>
        </Paper>
      )}

      {/* Hero Stats */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 900 }}>
            💰 Your Earnings Dashboard
          </Typography>
          <InfoTooltip title="Track all your passive income from trading fees and mining rewards" />
        </Box>
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
      <Alert severity="info" sx={{ mb: 3, bgcolor: '#0a0e14', border: '2px solid #00ff88' }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, color: '#00ff88' }}>
          🎯 How You're Earning Right Now (85/15 Split):
        </Typography>
        <Typography variant="body2" sx={{ color: '#e8e8e8' }}>
          • You hold {ttxHoldings.toLocaleString()} TTX tokens ({((ttxHoldings / 500000000) * 100).toFixed(4)}% of supply)<br/>
          • Every trade on the platform generates fees (0.08-0.12%)<br/>
          • <strong style={{ color: '#00ff88' }}>15% of ALL fees → Automatically split among TTX holders</strong><br/>
          • <strong style={{ color: '#FFD700' }}>85% → Platform profit</strong> (owner keeps most)<br/>
          • Your share is auto-compounded to your staked balance<br/>
          • <strong>✅ Audit-ready smart contract</strong> - No donation attacks, no double-counting<br/>
          • <strong>No manual claiming required. Just hold/stake TTX and earn!</strong>
        </Typography>
      </Alert>

      {/* Projections */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#0f1419', border: '3px solid #FFD700' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: '#FFD700' }}>
          📈 Your Earning Projections (Verified Metrics)
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

        <Alert severity="success" sx={{ mt: 2, bgcolor: '#1a2a1a', border: '2px solid #00ff88' }}>
          <Typography variant="body2" sx={{ color: '#e8e8e8' }}>
            💡 <strong style={{ color: '#00ff88' }}>Earning Tip:</strong> As platform volume grows, your earnings grow automatically! <br/>
            If volume 10x, your earnings 10x. <br/>
            <strong style={{ color: '#FFD700' }}>Example: 10,000 TTX at 500K user scale = $300/month passive income!</strong><br/>
            <strong style={{ color: '#00aaff' }}>Security: </strong>Smart contract uses transferFrom (donation-attack proof), separate TTX/ETH accounting, 10% withdrawal limits.
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
