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
  TableRow,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  LocalAtm,
  EmojiEvents,
  CalendarMonth,
  ShowChart
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import InfoTooltip from '../components/InfoTooltip';
import api from '../services/api';

export default function VolumeRebates() {
  const { user } = useSelector(state => state.auth);
  const [progress, setProgress] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Refresh every minute
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [progressRes, statsRes] = await Promise.all([
        api.get('/volume-rebates/progress'),
        api.get('/volume-rebates/stats')
      ]);
      setProgress(progressRes.data.data);
      setStats(statsRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading rebate data:', error);
      setLoading(false);
    }
  };

  if (loading) return <LinearProgress />;

  const {
    currentMonth = '',
    monthlyVolume = 0,
    feesPaid = 0,
    rebatePercent = 0,
    rebateAmount = 0,
    tier = {},
    tradeCount = 0,
    tiers = [],
    nextTier = null
  } = progress || {};

  const currentTierIndex = tiers.findIndex(t => t.rebatePercent === rebatePercent);
  const progressToNextTier = nextTier ? ((monthlyVolume - tier.min) / (nextTier.min - tier.min)) * 100 : 100;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1, color: '#e8e8e8' }}>
          💰 Volume Rebates
        </Typography>
        <Typography variant="body1" sx={{ color: '#9ca3af' }}>
          Earn monthly fee rebates in TTX based on your trading volume. The more you trade, the higher your rebate!
        </Typography>
      </Box>

      {/* How It Works */}
      <Alert severity="info" sx={{ mb: 3, bgcolor: '#0a0e14', border: '2px solid #00aaff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#00aaff' }}>
            📊 How Volume Rebates Work
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 1, color: '#e8e8e8' }}>
          • Trade more to unlock higher rebate tiers (5% → 20%)<br />
          • Rebates calculated monthly based on your total trading volume<br />
          • Receive rebate automatically on 1st of each month in TTX tokens<br />
          • Higher volume = Higher percentage of your fees returned!
        </Typography>
      </Alert>

      {/* Current Month Stats */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#0f1419', border: '3px solid #00ff88' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <CalendarMonth sx={{ fontSize: 40, color: '#00ff88', mr: 2 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#00ff88' }}>
              {currentMonth} Progress
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Your current month trading statistics
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Box>
              <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px' }} gutterBottom>
                MONTHLY VOLUME
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#e8e8e8' }}>
                ${monthlyVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                From {tradeCount} trades
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={3}>
            <Box>
              <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px' }} gutterBottom>
                FEES PAID
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#e8e8e8' }}>
                ${feesPaid.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                Trading fees
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={3}>
            <Box>
              <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px' }} gutterBottom>
                CURRENT TIER
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ffaa00' }}>
                {rebatePercent}%
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                Rebate rate
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={3}>
            <Box>
              <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px' }} gutterBottom>
                EST. REBATE
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#00ff88' }}>
                ${rebateAmount.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                Paid in TTX
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Progress to Next Tier */}
        {nextTier && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', fontWeight: 600 }}>
                PROGRESS TO TIER {currentTierIndex + 2} ({nextTier.rebatePercent}% REBATE)
              </Typography>
              <Typography variant="body2" sx={{ color: '#00ff88', fontSize: '12px', fontWeight: 700 }}>
                ${nextTier.volumeNeeded.toLocaleString('en-US', { maximumFractionDigits: 0 })} MORE NEEDED
              </Typography>
            </Box>
            <Box sx={{ width: '100%', height: 12, bgcolor: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
              <Box 
                sx={{ 
                  width: `${Math.min(progressToNextTier, 100)}%`, 
                  height: '100%', 
                  bgcolor: '#00ff88',
                  transition: 'width 0.5s ease',
                  boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)'
                }}
              />
            </Box>
          </Box>
        )}
      </Paper>

      {/* Tier Structure */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#0f1419' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <EmojiEvents sx={{ fontSize: 40, color: '#FFD700', mr: 2 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#e8e8e8' }}>
              Rebate Tiers
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Higher volume unlocks better rebates
            </Typography>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#9ca3af', fontWeight: 700, borderBottom: '2px solid #1f2937' }}>TIER</TableCell>
                <TableCell sx={{ color: '#9ca3af', fontWeight: 700, borderBottom: '2px solid #1f2937' }}>MONTHLY VOLUME</TableCell>
                <TableCell sx={{ color: '#9ca3af', fontWeight: 700, borderBottom: '2px solid #1f2937' }}>REBATE</TableCell>
                <TableCell sx={{ color: '#9ca3af', fontWeight: 700, borderBottom: '2px solid #1f2937' }}>EXAMPLE</TableCell>
                <TableCell sx={{ color: '#9ca3af', fontWeight: 700, borderBottom: '2px solid #1f2937' }}>STATUS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tiers.map((t, index) => {
                const isCurrentTier = t.rebatePercent === rebatePercent;
                const isUnlocked = monthlyVolume >= t.min;
                
                return (
                  <TableRow 
                    key={index}
                    sx={{ 
                      bgcolor: isCurrentTier ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
                      border: isCurrentTier ? '2px solid #00ff88' : 'none'
                    }}
                  >
                    <TableCell sx={{ color: '#e8e8e8', fontWeight: 700, borderBottom: '1px solid #1f2937' }}>
                      <Chip 
                        label={`Tier ${index + 1}`} 
                        size="small" 
                        sx={{ 
                          bgcolor: isCurrentTier ? '#00ff88' : '#374151', 
                          color: isCurrentTier ? '#000' : '#9ca3af',
                          fontWeight: 700
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#e8e8e8', borderBottom: '1px solid #1f2937' }}>
                      ${t.min.toLocaleString()} - ${t.max === 999999999 ? '∞' : t.max.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #1f2937' }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ffaa00' }}>
                        {t.rebatePercent}%
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', fontSize: '14px', borderBottom: '1px solid #1f2937' }}>
                      ${100} fees → ${(100 * t.rebatePercent / 100).toFixed(2)} back
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #1f2937' }}>
                      {isCurrentTier ? (
                        <Chip label="CURRENT" size="small" sx={{ bgcolor: '#00ff88', color: '#000', fontWeight: 700 }} />
                      ) : isUnlocked ? (
                        <Chip label="UNLOCKED" size="small" sx={{ bgcolor: '#374151', color: '#9ca3af' }} />
                      ) : (
                        <Chip label="LOCKED" size="small" sx={{ bgcolor: '#1f2937', color: '#6b7280' }} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Platform Stats */}
      {stats && (
        <Paper sx={{ p: 3, bgcolor: '#0f1419', border: '2px solid #374151' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#e8e8e8', mb: 3 }}>
            📈 Platform Statistics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px' }} gutterBottom>
                  TOTAL REBATES PAID
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#00ff88' }}>
                  {stats.totalRebatesPaid.toFixed(2)} TTX
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  All-time rebates
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px' }} gutterBottom>
                  THIS MONTH
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ffaa00' }}>
                  {stats.monthlyRebatesPaid.toFixed(2)} TTX
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  Rebates this month
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Info Footer */}
      <Alert severity="success" sx={{ mt: 3, bgcolor: '#0a1a0a', border: '2px solid #00ff88' }}>
        <Typography variant="body2" sx={{ color: '#e8e8e8' }}>
          💡 <strong>Pro Tip:</strong> Rebates are paid automatically on the 1st of each month. The more you trade, the higher your tier and rebate percentage. All rebates are paid in TTX tokens directly to your wallet!
        </Typography>
      </Alert>
    </Container>
  );
}
