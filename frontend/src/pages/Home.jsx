import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Paper,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  AccountBalanceWallet,
  CompareArrows,
  Rocket,
  CheckCircle,
  Cancel
} from '@mui/icons-material';

export default function Home() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: '#0a0e14', minHeight: '100vh' }}>
      {/* HERO: The 10-Second Pitch */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
          color: '#000',
          py: 8,
          textAlign: 'center',
          borderBottom: '3px solid #00ff88'
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h2" sx={{ fontWeight: 900, mb: 3, color: '#000' }}>
            🚀 The Exchange Where YOU Profit From Every Trade
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, color: '#000', fontWeight: 600 }}>
            Not just Binance making money. YOU earn from every transaction on the platform.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 4 }}>
            <Chip
              label="15% OF ALL FEES → YOUR WALLET"
              sx={{ bgcolor: '#000', color: '#FFD700', fontWeight: 'bold', fontSize: 18, px: 3, py: 4, border: '2px solid #FFD700' }}
            />
            <Chip
              label="EARN WHILE YOU TRADE"
              sx={{ bgcolor: '#000', color: '#00ff88', fontWeight: 'bold', fontSize: 18, px: 3, py: 4, border: '2px solid #00ff88' }}
            />
            <Chip
              label="FREE TTX REWARDS"
              sx={{ bgcolor: '#000', color: '#ff3366', fontWeight: 'bold', fontSize: 18, px: 3, py: 4, border: '2px solid #ff3366' }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{
                bgcolor: '#000',
                color: '#00ff88',
                fontWeight: 'bold',
                px: 6,
                py: 2,
                fontSize: 18,
                border: '3px solid #000',
                '&:hover': { bgcolor: '#1a1a1a', transform: 'scale(1.05)' }
              }}
            >
              Start Earning Now
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                borderColor: '#000',
                borderWidth: '3px',
                color: '#000',
                fontWeight: 'bold',
                px: 6,
                py: 2,
                fontSize: 18,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
              }}
            >
              Login
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/dashboard')}
              sx={{
                borderColor: '#00ff88',
                borderWidth: '2px',
                color: '#000',
                fontWeight: 'bold',
                px: 4,
                py: 1.5,
                fontSize: 14,
                '&:hover': { bgcolor: 'rgba(0,255,136,0.1)' }
              }}
            >
              Go to App
            </Button>
          </Box>
        </Container>
      </Box>

      {/* THE PROBLEM: Binance vs TokenTradeX */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 4, textAlign: 'center', color: '#e8e8e8' }}>
          The Problem with Every Exchange Today
        </Typography>

        <Grid container spacing={4} sx={{ mb: 6 }}>
          {/* Binance Model */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', border: '3px solid #ff3366', bgcolor: '#0f1419' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Cancel sx={{ color: '#ff3366', fontSize: 40, mr: 1 }} />
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#e8e8e8' }}>
                    Binance / Coinbase
                  </Typography>
                </Box>
                
                <Paper sx={{ p: 3, bgcolor: '#1a1f26', mb: 2, border: '1px solid #ff3366' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#e8e8e8' }}>
                    You Trade $1,000 → $1 Fee
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1, color: '#e8e8e8' }}>
                    ❌ Binance keeps $1
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1, color: '#e8e8e8' }}>
                    ❌ You get $0
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ff3366', fontWeight: 'bold' }}>
                    YOU LOSE MONEY, THEY PROFIT
                  </Typography>
                </Paper>

                <Alert severity="error" sx={{ bgcolor: '#2a1a1a', color: '#ff3366', border: '1px solid #ff3366' }}>
                  <Typography variant="body2" sx={{ color: '#e8e8e8' }}>
                    <strong>Binance made $28 BILLION in fees.</strong><br/>
                    Users got NOTHING.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          {/* TokenTradeX Model */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', border: '3px solid #00ff88', bgcolor: '#0f1419' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle sx={{ color: '#00ff88', fontSize: 40, mr: 1 }} />
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#e8e8e8' }}>
                    TokenTradeX (YOU WIN)
                  </Typography>
                </Box>
                
                <Paper sx={{ p: 3, bgcolor: '#1a1f26', mb: 2, border: '1px solid #00ff88' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#e8e8e8' }}>
                    You Trade $1,000 → $1 Fee
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1, color: '#e8e8e8' }}>
                    ✅ $0.15 → Your TTX wallet (auto!)
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1, color: '#e8e8e8' }}>
                    ✅ $0.85 → Buybacks (price up!)
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1, color: '#e8e8e8' }}>
                    ✅ PLUS: 5-20 FREE TTX rewards
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#00ff88', fontWeight: 'bold' }}>
                    YOU PROFIT 3 WAYS!
                  </Typography>
                </Paper>

                <Alert severity="success" sx={{ bgcolor: '#1a2a1a', color: '#00ff88', border: '1px solid #00ff88' }}>
                  <Typography variant="body2" sx={{ color: '#e8e8e8' }}>
                    <strong>Every user earns from platform growth.</strong><br/>
                    Hold TTX = Earn from EVERY trade anyone makes!
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* How You Earn (Simple) */}
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 4, textAlign: 'center', color: '#e8e8e8' }}>
          How You Earn (3 Simple Ways)
        </Typography>

        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ textAlign: 'center', p: 3, height: '100%', bgcolor: '#0f1419', border: '2px solid #00aaff' }}>
              <AccountBalanceWallet sx={{ fontSize: 60, color: '#00aaff', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: '#e8e8e8' }}>
                1. Auto-Earnings
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, color: '#9ca3af' }}>
                Hold TTX tokens. <strong>15% of ALL platform fees</strong> automatically go to your wallet.
              </Typography>
              <Typography variant="h6" sx={{ color: '#00aaff', fontWeight: 'bold' }}>
                Passive income from every trade!
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ textAlign: 'center', p: 3, height: '100%', bgcolor: '#0f1419', border: '2px solid #00ff88' }}>
              <TrendingUp sx={{ fontSize: 60, color: '#00ff88', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: '#e8e8e8' }}>
                2. Price Growth
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, color: '#9ca3af' }}>
                <strong>85% of fees</strong> go to reserve. Platform uses it to buy back TTX from market.
              </Typography>
              <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 'bold' }}>
                Your tokens worth more!
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ textAlign: 'center', p: 3, height: '100%', bgcolor: '#0f1419', border: '2px solid #ffaa00' }}>
              <Rocket sx={{ fontSize: 60, color: '#ffaa00', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: '#e8e8e8' }}>
                3. Free Rewards
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, color: '#9ca3af' }}>
                Trade and earn <strong>5-20 TTX per $100</strong> traded. Plus daily login bonuses!
              </Typography>
              <Typography variant="h6" sx={{ color: '#ffaa00', fontWeight: 'bold' }}>
                Start with $0 investment!
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Real Numbers */}
        <Paper sx={{ p: 4, bgcolor: '#0f1419', mb: 6, border: '3px solid #FFD700' }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center', color: '#FFD700' }}>
            💰 Real Numbers (Not Small Change)
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#e8e8e8' }}>
                Small Holder (10,000 TTX = $1,000 investment):
              </Typography>
              <Typography variant="body1" sx={{ mb: 1, color: '#9ca3af' }}>
                • Platform does $100M in trades/month (like a medium DEX)
              </Typography>
              <Typography variant="body1" sx={{ mb: 1, color: '#9ca3af' }}>
                • Generates $1,000,000 in fees
              </Typography>
              <Typography variant="body1" sx={{ mb: 1, color: '#9ca3af' }}>
                • 15% ($150,000) split among ALL TTX holders
              </Typography>
              <Typography variant="h5" sx={{ color: '#00ff88', fontWeight: 'bold', mt: 2 }}>
                You earn: ~$3/month passive (36% APY!)
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: '#9ca3af' }}>
                Plus active trading rewards = $50-500/month more
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#e8e8e8' }}>
                Big Holder (1,000,000 TTX = $100K investment):
              </Typography>
              <Typography variant="body1" sx={{ mb: 1, color: '#9ca3af' }}>
                • Same $100M monthly volume
              </Typography>
              <Typography variant="body1" sx={{ mb: 1, color: '#9ca3af' }}>
                • You hold 0.2% of circulating supply
              </Typography>
              <Typography variant="body1" sx={{ mb: 1, color: '#9ca3af' }}>
                • 0.2% of $150,000 holder share
              </Typography>
              <Typography variant="h5" sx={{ color: '#00ff88', fontWeight: 'bold', mt: 2 }}>
                You earn: ~$300/month passive (36% APY)
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: '#9ca3af' }}>
                Plus trading rewards = Total $500-2,000/month
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="success" sx={{ mt: 2, bgcolor: '#1a2a1a', border: '2px solid #00ff88' }}>
                <Typography variant="body1" sx={{ color: '#e8e8e8' }}>
                  <strong style={{ color: '#00ff88' }}>At Binance-scale volume ($1 Trillion/month):</strong><br/>
                  10,000 TTX holder earns $300/month passive | 1M TTX holder earns $30,000/month passive<br/>
                  <strong style={{ color: '#00ff88' }}>This is why early holders become RICH!</strong>
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </Paper>

        {/* CTA */}
        <Box sx={{ textAlign: 'center', p: 6, bgcolor: '#0f1419', border: '3px solid #00ff88' }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3, color: '#e8e8e8' }}>
            Ready to Start Earning?
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/register')}
            sx={{
              bgcolor: '#00ff88',
              color: '#000',
              fontWeight: 'bold',
              px: 8,
              py: 3,
              fontSize: 20,
              border: '2px solid #00ff88',
              '&:hover': { bgcolor: '#00cc6a', transform: 'scale(1.05)' }
            }}
          >
            Create Free Account
          </Button>
          <Typography variant="body2" sx={{ mt: 2, color: '#9ca3af' }}>
            No credit card needed. Start earning in 2 minutes.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
