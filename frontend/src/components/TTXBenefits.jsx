import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
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
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Star,
  TrendingUp,
  AccountBalance,
  LocalOffer
} from '@mui/icons-material';
import ttxService from '../services/ttxService';

export default function TTXBenefits() {
  const user = useSelector((state) => state.auth.user);
  const [ttxBalance, setTtxBalance] = useState(0);
  const [currentTier, setCurrentTier] = useState(null);
  const [nextTier, setNextTier] = useState(null);
  const [feeInfo, setFeeInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const feeTiers = [
    { minTTX: 0, discount: '0%', tierName: 'Standard', color: '#6c757d', icon: '🔵', feeMultiplier: 1.0 },
    { minTTX: 100, discount: '10%', tierName: 'Bronze', color: '#cd7f32', icon: '🥉', feeMultiplier: 0.9 },
    { minTTX: 1000, discount: '25%', tierName: 'Silver', color: '#c0c0c0', icon: '🥈', feeMultiplier: 0.75 },
    { minTTX: 10000, discount: '50%', tierName: 'Gold', color: '#ffd700', icon: '🥇', feeMultiplier: 0.5 },
    { minTTX: 100000, discount: '75%', tierName: 'Platinum', color: '#e5e4e2', icon: '💎', feeMultiplier: 0.25 },
    { minTTX: 1000000, discount: '90%', tierName: 'Diamond', color: '#b9f2ff', icon: '💠', feeMultiplier: 0.1 }
  ];

  useEffect(() => {
    const fetchFeeInfo = async () => {
      try {
        setLoading(true);
        const info = await ttxService.getFeeInfo();
        setFeeInfo(info);
        setTtxBalance(info.ttxBalance);
        setCurrentTier(info.currentTier);
        setNextTier(info.nextTier);
      } catch (error) {
        console.error('Failed to fetch fee info:', error);
        setTtxBalance(5000);
        
        let tier = feeTiers[0];
        for (const t of feeTiers) {
          if (5000 >= t.minTTX) {
            tier = t;
          }
        }
        setCurrentTier(tier);
        
        const currentIndex = feeTiers.findIndex(t => t.tierName === tier.tierName);
        if (currentIndex < feeTiers.length - 1) {
          setNextTier(feeTiers[currentIndex + 1]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchFeeInfo();
    }
  }, [user]);

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Loading TTX benefits...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Paper>
    );
  }

  const progress = nextTier 
    ? ((ttxBalance - currentTier.minTTX) / (nextTier.minTTX - currentTier.minTTX)) * 100
    : 100;

  return (
    <Box>
      <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${currentTier?.color || '#6c757d'}15 0%, ${currentTier?.color || '#6c757d'}05 100%)` }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Box sx={{ fontSize: '48px' }}>
                {currentTier?.icon || '🔵'}
              </Box>
            </Grid>
            <Grid item xs>
              <Typography variant="h5" fontWeight={700}>
                {currentTier?.tierName || 'Standard'} Tier
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {ttxBalance.toLocaleString()} TTX Tokens
              </Typography>
              <Chip 
                label={`${feeInfo?.discountPercent || 0}% Fee Discount`}
                color="primary"
                size="small"
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">
                  Trading Fee
                </Typography>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {((1 - (currentTier?.feeMultiplier || 1)) * 100).toFixed(0)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Discount
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {nextTier && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Progress to {nextTier.tierName}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {(nextTier.minTTX - ttxBalance).toLocaleString()} TTX needed
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(progress, 100)} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #1f2937' }}>
          <Typography variant="h6" fontWeight={700}>
            <LocalOffer sx={{ mr: 1, verticalAlign: 'middle' }} />
            TTX Fee Discount Tiers
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tier</TableCell>
                <TableCell align="right">TTX Required</TableCell>
                <TableCell align="right">Fee Multiplier</TableCell>
                <TableCell align="right">Discount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {feeTiers.map((tier) => {
                const isCurrentTier = tier.tierName === currentTier?.tierName;
                return (
                  <TableRow 
                    key={tier.tierName}
                    sx={{ 
                      bgcolor: isCurrentTier ? 'rgba(0,255,136,0.05)' : 'transparent',
                      borderLeft: isCurrentTier ? '3px solid #00ff88' : '3px solid transparent'
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '24px' }}>{tier.icon}</span>
                        <Box>
                          <Typography fontWeight={600}>{tier.tierName}</Typography>
                          {isCurrentTier && (
                            <Chip label="Current" size="small" color="primary" sx={{ mt: 0.5 }} />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600}>
                        {tier.minTTX.toLocaleString()} TTX
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography color={tier.feeMultiplier < 1 ? 'success.main' : 'text.primary'}>
                        {(tier.feeMultiplier * 100).toFixed(0)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography color="primary.main" fontWeight={700}>
                        {tier.discount}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <TrendingUp sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" fontWeight={700}>
                Lower Trading Fees
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Save up to 90% on every trade with TTX token holdings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <AccountBalance sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" fontWeight={700}>
                Staking Rewards
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Earn passive income by staking your TTX tokens
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Star sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" fontWeight={700}>
                Exclusive Access
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Get early access to new features and premium tools
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
