import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel
} from '@mui/material';
import {
  CheckCircle,
  Star,
  Rocket,
  TrendingUp
} from '@mui/icons-material';
import api from '../services/api';

export default function Subscriptions() {
  const [tiers, setTiers] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ttx');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tiersRes, subRes] = await Promise.all([
        api.get('/subscriptions/tiers'),
        api.get('/subscriptions/my-subscription')
      ]);
      
      setTiers(tiersRes.data.tiers);
      setCurrentSubscription(subRes.data.subscription);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      await api.post('/subscriptions/upgrade', {
        tier: selectedTier,
        paymentMethod
      });
      
      setUpgradeDialog(false);
      loadData();
      alert(`Successfully upgraded to ${selectedTier}!`);
    } catch (error) {
      alert(error.response?.data?.error || 'Upgrade failed');
    }
  };

  const openUpgradeDialog = (tier) => {
    setSelectedTier(tier);
    setUpgradeDialog(true);
  };

  if (loading || !tiers) {
    return <Container sx={{ py: 4 }}><Typography>Loading...</Typography></Container>;
  }

  const getTierIcon = (tier) => {
    switch(tier) {
      case 'free': return <TrendingUp sx={{ fontSize: 40 }} />;
      case 'pro': return <Star sx={{ fontSize: 40 }} />;
      case 'enterprise': return <Rocket sx={{ fontSize: 40 }} />;
      default: return null;
    }
  };

  const getTierColor = (tier) => {
    switch(tier) {
      case 'free': return '#90CAF9';
      case 'pro': return '#FFD700';
      case 'enterprise': return '#BA68C8';
      default: return '#90CAF9';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
        Choose Your Plan
      </Typography>
      <Typography variant="h6" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
        Unlock more features and better fees as you grow
      </Typography>

      {currentSubscription && (
        <Alert severity="info" sx={{ mb: 4 }}>
          Current Plan: <strong>{currentSubscription.tierInfo.name}</strong>
          {currentSubscription.tier !== 'free' && ` - $${currentSubscription.price}/month`}
        </Alert>
      )}

      <Grid container spacing={4}>
        {Object.entries(tiers).map(([tierKey, tierData]) => {
          const isCurrentTier = currentSubscription?.tier === tierKey;
          const canUpgrade = tierKey !== 'free' && currentSubscription?.tier !== tierKey;

          return (
            <Grid item xs={12} md={4} key={tierKey}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: isCurrentTier ? `3px solid ${getTierColor(tierKey)}` : '1px solid #e0e0e0',
                  position: 'relative',
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6
                  }
                }}
              >
                {isCurrentTier && (
                  <Chip
                    label="CURRENT PLAN"
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      fontWeight: 'bold'
                    }}
                  />
                )}

                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Box sx={{ color: getTierColor(tierKey), mb: 1 }}>
                      {getTierIcon(tierKey)}
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {tierData.name}
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: getTierColor(tierKey) }}>
                      ${tierData.price}
                      {tierData.price > 0 && (
                        <Typography component="span" variant="body1" sx={{ color: 'text.secondary' }}>
                          /month
                        </Typography>
                      )}
                    </Typography>
                    {tierData.feeDiscount > 0 && (
                      <Chip
                        label={`${tierData.feeDiscount}% Fee Discount`}
                        sx={{
                          mt: 1,
                          bgcolor: getTierColor(tierKey),
                          color: '#000',
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                  </Box>

                  <List dense>
                    {tierData.features.map((feature, idx) => (
                      <ListItem key={idx} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircle sx={{ color: getTierColor(tierKey) }} />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>

                  <Box sx={{ mt: 2, p: 2, bgcolor: '#0a0e14', border: '1px solid #1f2937', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1, color: '#00ff88' }}>
                      LIMITS:
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: '#9ca3af' }}>
                      API: {tierData.limits.apiCallsPerMinute.toLocaleString()} req/min
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: '#9ca3af' }}>
                      Withdrawals: {tierData.limits.withdrawalsPerDay}/day
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: '#9ca3af' }}>
                      Max Order: ${tierData.limits.maxOrderSize.toLocaleString()}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2 }}>
                  {isCurrentTier ? (
                    <Button fullWidth variant="outlined" disabled>
                      Current Plan
                    </Button>
                  ) : canUpgrade ? (
                    <Button
                      fullWidth
                      variant="contained"
                      sx={{
                        bgcolor: getTierColor(tierKey),
                        color: '#000',
                        fontWeight: 'bold',
                        '&:hover': {
                          bgcolor: getTierColor(tierKey),
                          opacity: 0.9
                        }
                      }}
                      onClick={() => openUpgradeDialog(tierKey)}
                    >
                      Upgrade to {tierData.name}
                    </Button>
                  ) : (
                    <Button fullWidth variant="outlined" disabled>
                      {tierKey === 'free' ? 'Downgrade Not Available' : 'Upgrade Required'}
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialog} onClose={() => setUpgradeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Upgrade to {tiers[selectedTier]?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            You're about to upgrade to the <strong>{tiers[selectedTier]?.name}</strong> plan
            for <strong>${tiers[selectedTier]?.price}/month</strong>
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Payment Method:
          </Typography>
          <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <FormControlLabel
              value="ttx"
              control={<Radio />}
              label={`Pay with TTX (10% discount = $${(tiers[selectedTier]?.price * 0.9).toFixed(2)})`}
            />
            <FormControlLabel
              value="crypto"
              control={<Radio />}
              label="Pay with BTC/ETH/USDT"
            />
            <FormControlLabel
              value="card"
              control={<Radio />}
              label="Credit/Debit Card"
              disabled
            />
          </RadioGroup>

          <Alert severity="info" sx={{ mt: 2 }}>
            Your subscription will renew automatically each month. Cancel anytime.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeDialog(false)}>Cancel</Button>
          <Button onClick={handleUpgrade} variant="contained" color="primary">
            Confirm Upgrade
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
