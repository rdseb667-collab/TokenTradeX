import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  MenuItem,
  FormControlLabel,
  Switch,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Lock,
  TrendingUp,
  AccountBalance,
  Warning,
  CheckCircle,
  Timer,
  Refresh
} from '@mui/icons-material';
import api from '../services/api';

export default function Staking() {
  const [positions, setPositions] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState({});
  const [apyRates, setApyRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [openStakeDialog, setOpenStakeDialog] = useState(false);
  const [selectedToken, setSelectedToken] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [lockPeriod, setLockPeriod] = useState('90');
  const [autoCompound, setAutoCompound] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [positionsRes, tokensRes, statsRes, ratesRes] = await Promise.all([
        api.get('/staking/positions'),
        api.get('/rwa/tokens'),
        api.get('/staking/stats'),
        api.get('/staking/apy-rates')
      ]);

      setPositions(positionsRes.data.positions || []);
      setTokens(tokensRes.data.data || []);
      setStats(statsRes.data.stats || {});
      setApyRates(ratesRes.data.rates || {});
    } catch (error) {
      console.error('Error fetching staking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async () => {
    try {
      await api.post('/staking/stake', {
        tokenId: selectedToken,
        amount: parseFloat(stakeAmount),
        lockPeriod,
        autoCompound
      });

      setOpenStakeDialog(false);
      setSelectedToken('');
      setStakeAmount('');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Staking failed');
    }
  };

  const handleUnstake = async (positionId) => {
    if (!confirm('Are you sure you want to unstake? This will return your tokens plus rewards.')) return;
    
    try {
      await api.post(`/staking/unstake/${positionId}`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Unstaking failed');
    }
  };

  const handleEmergencyWithdraw = async (positionId) => {
    if (!confirm('⚠️ WARNING: Early withdrawal incurs 20% penalty! Are you sure?')) return;
    
    try {
      await api.post(`/staking/emergency-withdraw/${positionId}`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Emergency withdrawal failed');
    }
  };

  const getLockPeriodBenefit = (days) => {
    const benefits = {
      '30': { apy: 8, color: '#2196F3', label: 'Flexible' },
      '90': { apy: 12, color: '#4CAF50', label: 'Popular' },
      '180': { apy: 15, color: '#FF9800', label: 'Great' },
      '365': { apy: 20, color: '#F44336', label: 'Maximum' }
    };
    return benefits[days] || benefits['90'];
  };

  const calculateProgress = (position) => {
    const start = new Date(position.stakedAt);
    const end = new Date(position.unlockAt);
    const now = new Date();
    const total = end - start;
    const elapsed = now - start;
    return Math.min((elapsed / total) * 100, 100);
  };

  const formatTimeRemaining = (unlockAt) => {
    const now = new Date();
    const unlock = new Date(unlockAt);
    const diff = unlock - now;
    
    if (diff <= 0) return 'Unlocked';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
          🏦 Staking - Earn Passive Income
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Lock your tokens and earn guaranteed APY. The longer you lock, the higher your rewards!
        </Typography>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', borderLeft: '4px solid #2196F3' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalance sx={{ color: '#2196F3', mr: 1 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Total Staked
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#2196F3' }}>
                ${parseFloat(stats.totalStaked || 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', borderLeft: '4px solid #4CAF50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ color: '#4CAF50', mr: 1 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Total Rewards
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                ${parseFloat(stats.totalRewards || 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', borderLeft: '4px solid #FF9800' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Lock sx={{ color: '#FF9800', mr: 1 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Active Positions
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF9800' }}>
                {stats.activePositions || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(156, 39, 176, 0.1)', borderLeft: '4px solid #9C27B0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ color: '#9C27B0', mr: 1 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Max APY
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#9C27B0' }}>
                20%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* APY Rates Cards */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Choose Your Lock Period
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {Object.entries(apyRates).map(([days, apy]) => {
          const benefit = getLockPeriodBenefit(days);
          return (
            <Grid item xs={12} sm={6} md={3} key={days}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  border: lockPeriod === days ? `2px solid ${benefit.color}` : '1px solid rgba(255,255,255,0.1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 24px ${benefit.color}40`
                  }
                }}
                onClick={() => setLockPeriod(days)}
              >
                <CardContent>
                  <Chip
                    label={benefit.label}
                    size="small"
                    sx={{ bgcolor: benefit.color, color: 'white', mb: 1 }}
                  />
                  <Typography variant="h4" sx={{ fontWeight: 700, color: benefit.color }}>
                    {apy}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    APY
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>
                    {days} Days
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Stake Button */}
      <Box sx={{ mb: 4 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Lock />}
          onClick={() => setOpenStakeDialog(true)}
          sx={{
            bgcolor: '#4CAF50',
            fontWeight: 700,
            px: 4,
            '&:hover': { bgcolor: '#45A049' }
          }}
        >
          Stake Tokens
        </Button>
      </Box>

      {/* Active Positions */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Your Staking Positions
      </Typography>
      <Card>
        <CardContent>
          {loading ? (
            <LinearProgress />
          ) : positions.length === 0 ? (
            <Alert severity="info">
              No staking positions yet. Start earning passive income by staking your tokens!
            </Alert>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Token</TableCell>
                  <TableCell>Amount Staked</TableCell>
                  <TableCell>Lock Period</TableCell>
                  <TableCell>APY</TableCell>
                  <TableCell>Current Rewards</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {positions.map((pos) => {
                  const progress = calculateProgress(pos);
                  const isUnlocked = new Date() >= new Date(pos.unlockAt);
                  
                  return (
                    <TableRow key={pos.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {pos.Token?.symbol}
                        </Typography>
                      </TableCell>
                      <TableCell>{parseFloat(pos.amount).toLocaleString()}</TableCell>
                      <TableCell>{pos.lockPeriod} days</TableCell>
                      <TableCell>
                        <Chip label={`${pos.apy}%`} size="small" color="success" />
                      </TableCell>
                      <TableCell sx={{ color: '#4CAF50', fontWeight: 600 }}>
                        +{parseFloat(pos.currentRewards || 0).toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={pos.status}
                          size="small"
                          color={pos.status === 'active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{ mb: 0.5, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {formatTimeRemaining(pos.unlockAt)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {pos.status === 'active' && (
                          <>
                            {isUnlocked ? (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => handleUnstake(pos.id)}
                              >
                                Unstake
                              </Button>
                            ) : (
                              <Tooltip title="20% penalty for early withdrawal">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<Warning />}
                                  onClick={() => handleEmergencyWithdraw(pos.id)}
                                >
                                  Emergency
                                </Button>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stake Dialog */}
      <Dialog open={openStakeDialog} onClose={() => setOpenStakeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Stake Tokens</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Select Token"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
              >
                {tokens.map((token) => (
                  <MenuItem key={token.id} value={token.id}>
                    {token.symbol} - {token.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Amount to Stake"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Lock Period"
                value={lockPeriod}
                onChange={(e) => setLockPeriod(e.target.value)}
              >
                {Object.entries(apyRates).map(([days, apy]) => (
                  <MenuItem key={days} value={days}>
                    {days} Days - {apy}% APY
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoCompound}
                    onChange={(e) => setAutoCompound(e.target.checked)}
                    color="success"
                  />
                }
                label="Auto-compound rewards (recommended)"
              />
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1 }}>
                Auto-compounding adds your daily rewards back into your staking amount, maximizing your returns!
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <strong>Projected Returns:</strong> If you stake {stakeAmount || '0'} tokens for {lockPeriod} days at {apyRates[lockPeriod] || 0}% APY, you'll earn approximately {((parseFloat(stakeAmount) || 0) * ((apyRates[lockPeriod] || 0) / 100) * (parseInt(lockPeriod) / 365)).toFixed(2)} in rewards!
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStakeDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStake}
            disabled={!selectedToken || !stakeAmount || parseFloat(stakeAmount) <= 0}
            sx={{ bgcolor: '#4CAF50' }}
          >
            Stake Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
