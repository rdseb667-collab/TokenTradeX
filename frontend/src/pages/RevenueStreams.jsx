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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material';
import {
  SwapHoriz,
  AccountBalance,
  CardMembership,
  Code,
  TrendingUp,
  Savings,
  Groups,
  FileCopy,
  Business,
  Token,
  ExpandMore
} from '@mui/icons-material';
import api from '../services/api';

const streamIcons = [
  <SwapHoriz sx={{ fontSize: 40 }} />,      // 0: Trading Fees
  <AccountBalance sx={{ fontSize: 40 }} />, // 1: Withdrawal Fees
  <CardMembership sx={{ fontSize: 40 }} />, // 2: Subscriptions
  <Code sx={{ fontSize: 40 }} />,           // 3: API Licensing
  <TrendingUp sx={{ fontSize: 40 }} />,     // 4: Market Making
  <Savings sx={{ fontSize: 40 }} />,        // 5: Lending Interest
  <Token sx={{ fontSize: 40 }} />,          // 6: Staking Commission
  <Groups sx={{ fontSize: 40 }} />,         // 7: Copy Trading
  <Business sx={{ fontSize: 40 }} />,       // 8: White Label
  <FileCopy sx={{ fontSize: 40 }} />        // 9: NFT Positions
];

const streamColors = [
  '#00ff88', // Trading
  '#00aaff', // Withdrawal
  '#FFD700', // Subscriptions
  '#9C27B0', // API
  '#FF6B35', // Market Making
  '#4CAF50', // Lending
  '#00E5FF', // Staking
  '#FF4081', // Copy Trading
  '#FFA726', // White Label
  '#AB47BC'  // NFT
];

const streamDetails = [
  {
    name: 'Trading Fees',
    pricing: '0.08-0.12% per trade',
    split: '85% platform, 15% TTX holders',
    features: [
      'Lower than Coinbase (0.5%)',
      'Maker/taker fee differentiation',
      'Volume-based discounts (up to 90% off)',
      'Auto-distributed to TTX stakers',
      'Fee-on-transfer mechanism'
    ],
    projections: 'Year 1: $1.75M | Year 2: $8.75M | Year 3: $17.5M',
    implementation: 'Live - Auto-deducted from each trade'
  },
  {
    name: 'Withdrawal Fees',
    pricing: '0.5% for crypto, $2.50 + 0.5% for fiat',
    split: '85% platform, 15% TTX holders',
    features: [
      'Competitive vs Binance (0.5-1%)',
      'Flat + percentage for fiat',
      'Discounts for TTX holders',
      'Covers gas + platform margin',
      'No hidden fees'
    ],
    projections: 'Year 1: $180K | Year 2: $900K | Year 3: $1.8M',
    implementation: 'Live - Deducted on withdrawal'
  },
  {
    name: 'Premium Subscriptions',
    pricing: 'Pro $29.99/mo, Enterprise $199.99/mo',
    split: '100% platform revenue',
    features: [
      'Pro: Advanced charts, API access, analytics',
      'Enterprise: Custom integrations, OTC desk',
      'Priority support for all tiers',
      '3 tiers: Free, Pro, Enterprise',
      'Cancel anytime, no lock-in'
    ],
    projections: 'Year 1: $360K | Year 2: $1.8M | Year 3: $3.6M',
    implementation: 'Live - Stripe billing integration'
  },
  {
    name: 'API Licensing',
    pricing: '$49-$999/mo based on rate limits',
    split: '100% platform revenue',
    features: [
      'Free tier: 10 req/min',
      'Standard $49: 100 req/min',
      'Pro $199: 1,000 req/min',
      'Enterprise $999: Unlimited',
      'WebSocket real-time feeds'
    ],
    projections: 'Year 1: $120K | Year 2: $600K | Year 3: $1.2M',
    implementation: 'Live - Rate-limited endpoints'
  },
  {
    name: 'Market Making',
    pricing: 'Spread capture (bid-ask difference)',
    split: '85% platform, 15% TTX holders',
    features: [
      'Auto-fill engine captures spreads',
      'Provides liquidity to users',
      'Algorithmic trading strategies',
      'Risk-managed position sizing',
      '24/7 automated operations'
    ],
    projections: 'Year 1: $500K | Year 2: $2.5M | Year 3: $5M',
    implementation: 'Live - orderMatchingService.js'
  },
  {
    name: 'Lending Interest',
    pricing: '8-15% APR, platform takes 10%',
    split: '10% platform commission',
    features: [
      'Users lend idle assets',
      'Borrowers pay 8-15% interest',
      'Platform takes 10% commission',
      'Over-collateralized loans',
      'Automated liquidations'
    ],
    projections: 'Year 1: $200K | Year 2: $1M | Year 3: $2M',
    implementation: 'Pending - Q1 2025'
  },
  {
    name: 'Staking Commissions',
    pricing: '0% fee (funded by trading fees)',
    split: 'User benefit - no direct revenue',
    features: [
      'Auto-compound from 15% trading fees',
      'Ve-locking for boosted rewards',
      'No manual claiming required',
      'Locked tokens earn base + boost',
      'Flexible unstaking options'
    ],
    projections: 'User acquisition tool - Indirect revenue via volume',
    implementation: 'Live - TTXUnified.sol smart contract'
  },
  {
    name: 'Copy Trading',
    pricing: '20% of profits (paid by followers)',
    split: '100% to strategy leaders',
    features: [
      'Follow top traders automatically',
      'Leaders earn 20% of follower profits',
      'Real-time position mirroring',
      'Transparent performance stats',
      'Risk-managed allocations'
    ],
    projections: 'Year 1: $100K | Year 2: $500K | Year 3: $1M',
    implementation: 'Live - copyTradingService.js'
  },
  {
    name: 'White Label',
    pricing: '$500K setup + $50K/mo + 30% revenue',
    split: '100% platform revenue',
    features: [
      'Full platform licensing',
      'Custom branding & domain',
      'Dedicated infrastructure',
      'Revenue share: 30% of fees',
      'Enterprise support SLA'
    ],
    projections: 'Year 1: $0 | Year 2: $600K | Year 3: $1.8M',
    implementation: 'Ready - whiteLabelService.js'
  },
  {
    name: 'NFT Positions',
    pricing: '1-5% of position value',
    split: '85% platform, 15% TTX holders',
    features: [
      'Tokenize trading positions as NFTs',
      'Transfer positions between wallets',
      'Secondary market for strategies',
      'Royalties on resales',
      'Gamification & collectibles'
    ],
    projections: 'Year 1: $50K | Year 2: $250K | Year 3: $500K',
    implementation: 'Live - nftPositionService.js'
  }
];

export default function RevenueStreams() {
  const [streams, setStreams] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRevenueStreams();
    // Refresh every 10 seconds
    const interval = setInterval(loadRevenueStreams, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadRevenueStreams = async () => {
    try {
      const res = await api.get('/flywheel/revenue-streams');
      setStreams(res.data.streams || []);
      setSummary(res.data.summary || {});
      setLoading(false);
    } catch (error) {
      console.error('Error loading revenue streams:', error);
      setLoading(false);
    }
  };

  if (loading) return <LinearProgress />;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          💰 10 Revenue Streams
        </Typography>
        <Typography variant="body1" sx={{ color: '#9ca3af' }}>
          {summary?.message || 'Diversified income model powering the platform'}
        </Typography>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#0f1419', border: '2px solid #00ff88' }}>
              <CardContent>
                <Typography sx={{ fontSize: '14px', color: '#9ca3af', fontWeight: 700 }}>
                  TOTAL COLLECTED
                </Typography>
                <Typography sx={{ fontSize: '36px', fontWeight: 700, color: '#00ff88' }}>
                  ${summary.totalCollected?.toLocaleString() || '0.00'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#0f1419', border: '2px solid #00aaff' }}>
              <CardContent>
                <Typography sx={{ fontSize: '14px', color: '#9ca3af', fontWeight: 700 }}>
                  MONTHLY TARGET
                </Typography>
                <Typography sx={{ fontSize: '36px', fontWeight: 700, color: '#00aaff' }}>
                  ${summary.totalTarget?.toLocaleString() || '0.00'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#0f1419', border: '2px solid #FFD700' }}>
              <CardContent>
                <Typography sx={{ fontSize: '14px', color: '#9ca3af', fontWeight: 700 }}>
                  PROGRESS
                </Typography>
                <Typography sx={{ fontSize: '36px', fontWeight: 700, color: '#FFD700' }}>
                  {summary.overallProgress || '0.0'}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(parseFloat(summary.overallProgress || 0), 100)} 
                  sx={{ 
                    mt: 1, 
                    height: 8, 
                    borderRadius: 1,
                    bgcolor: '#1f2937',
                    '& .MuiLinearProgress-bar': { bgcolor: '#FFD700' }
                  }} 
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Revenue Stream Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {streams.map((stream, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={stream.name}>
            <Card 
              sx={{ 
                bgcolor: '#0f1419', 
                border: '2px solid',
                borderColor: streamColors[index],
                borderLeft: `8px solid ${streamColors[index]}`,
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 16px ${streamColors[index]}40`
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ color: streamColors[index] }}>
                    {streamIcons[index]}
                  </Box>
                  <Chip 
                    label={stream.collected > 0 ? 'ACTIVE' : 'PENDING'} 
                    size="small"
                    sx={{ 
                      bgcolor: stream.collected > 0 ? '#00ff8820' : '#1f2937',
                      color: stream.collected > 0 ? '#00ff88' : '#6b7280',
                      fontWeight: 700,
                      fontSize: '10px'
                    }}
                  />
                </Box>
                
                <Typography sx={{ fontSize: '16px', fontWeight: 700, mb: 0.5 }}>
                  {stream.name}
                </Typography>
                
                <Typography sx={{ fontSize: '11px', color: '#9ca3af', mb: 2, minHeight: '40px' }}>
                  {stream.description}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '10px', color: '#6b7280', fontWeight: 700 }}>
                      COLLECTED
                    </Typography>
                    <Typography sx={{ fontSize: '10px', color: streamColors[index], fontWeight: 700 }}>
                      {stream.progress}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(parseFloat(stream.progress || 0), 100)} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 1,
                      bgcolor: '#1f2937',
                      '& .MuiLinearProgress-bar': { bgcolor: streamColors[index] }
                    }} 
                  />
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ fontSize: '10px', color: '#6b7280' }}>
                      Collected
                    </Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: streamColors[index] }}>
                      ${stream.collected?.toLocaleString() || '0.00'}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '10px', color: '#6b7280' }}>
                      Target
                    </Typography>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700 }}>
                      ${stream.targetMonthly?.toLocaleString() || '0.00'}
                    </Typography>
                  </Box>
                </Box>
                
                {stream.distributedToHolders > 0 && (
                  <Box sx={{ mt: 2, p: 1, bgcolor: '#00ff8810', borderRadius: 1, border: '1px solid #00ff8820' }}>
                    <Typography sx={{ fontSize: '9px', color: '#9ca3af' }}>
                      Distributed to holders
                    </Typography>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#00ff88' }}>
                      ${stream.distributedToHolders?.toFixed(2) || '0.00'}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Detailed Table */}
      <Paper elevation={0} sx={{ bgcolor: '#0f1419', borderRadius: 0 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #1f2937' }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Revenue Stream Details
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#0a0e14' }}>
                <TableCell sx={{ fontWeight: 700, color: '#6b7280' }}>Stream</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#6b7280' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#6b7280' }}>Collected</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#6b7280' }}>Target</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#6b7280' }}>Progress</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#6b7280' }}>To Holders</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {streams.map((stream, index) => (
                <TableRow 
                  key={stream.name}
                  sx={{ 
                    '&:hover': { bgcolor: '#1a1f26' },
                    borderLeft: `4px solid ${streamColors[index]}`
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ color: streamColors[index] }}>
                        {streamIcons[index]}
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '14px' }}>
                          {stream.name}
                        </Typography>
                        <Typography sx={{ fontSize: '11px', color: '#9ca3af' }}>
                          {stream.description}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={stream.collected > 0 ? 'ACTIVE' : 'PENDING'} 
                      size="small"
                      sx={{ 
                        bgcolor: stream.collected > 0 ? '#00ff8820' : '#1f2937',
                        color: stream.collected > 0 ? '#00ff88' : '#6b7280',
                        fontWeight: 700
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: streamColors[index] }}>
                    ${stream.collected?.toLocaleString() || '0.00'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '14px' }}>
                    ${stream.targetMonthly?.toLocaleString() || '0.00'}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      <Typography sx={{ fontSize: '12px', fontWeight: 700, color: streamColors[index] }}>
                        {stream.progress}%
                      </Typography>
                      <Box sx={{ width: 60 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(parseFloat(stream.progress || 0), 100)} 
                          sx={{ 
                            height: 6, 
                            borderRadius: 1,
                            bgcolor: '#1f2937',
                            '& .MuiLinearProgress-bar': { bgcolor: streamColors[index] }
                          }} 
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#00ff88' }}>
                    ${stream.distributedToHolders?.toFixed(2) || '0.00'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Expandable Detail Accordions */}
      <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>
        📄 Detailed Revenue Models
      </Typography>
      {streamDetails.map((detail, index) => (
        <Accordion 
          key={detail.name}
          sx={{ 
            bgcolor: '#0f1419', 
            border: `2px solid ${streamColors[index]}`,
            mb: 2,
            '&:before': { display: 'none' }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore sx={{ color: streamColors[index] }} />}
            sx={{
              bgcolor: `${streamColors[index]}15`,
              borderBottom: `1px solid ${streamColors[index]}40`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Box sx={{ color: streamColors[index] }}>
                {streamIcons[index]}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '18px', color: '#e8e8e8' }}>
                  {detail.name}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>
                  {detail.pricing} • {detail.split}
                </Typography>
              </Box>
              <Chip 
                label={detail.implementation.startsWith('Live') ? 'LIVE' : 'PENDING'}
                size="small"
                sx={{
                  bgcolor: detail.implementation.startsWith('Live') ? '#00ff8820' : '#1f2937',
                  color: detail.implementation.startsWith('Live') ? '#00ff88' : '#6b7280',
                  fontWeight: 700
                }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: streamColors[index] }}>
                  ✅ Features
                </Typography>
                <List dense>
                  {detail.features.map((feature, fIdx) => (
                    <ListItem key={fIdx}>
                      <ListItemText 
                        primary={feature}
                        primaryTypographyProps={{ 
                          fontSize: '14px',
                          color: '#e8e8e8'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: streamColors[index] }}>
                  📊 Projections
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#e8e8e8', mb: 2 }}>
                  {detail.projections}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: streamColors[index] }}>
                  🛠️ Implementation
                </Typography>
                <Alert 
                  severity={detail.implementation.startsWith('Live') ? 'success' : 'info'}
                  sx={{ bgcolor: '#0a0e14', border: `1px solid ${streamColors[index]}` }}
                >
                  {detail.implementation}
                </Alert>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Container>
  );
}
