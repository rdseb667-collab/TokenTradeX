import { Box, Paper, Typography, Grid } from '@mui/material';
import { 
  Speed, 
  Security, 
  AccountBalance, 
  TrendingUp, 
  MonetizationOn,
  Verified
} from '@mui/icons-material';

export default function FeatureHighlights() {
  const features = [
    {
      icon: <Speed sx={{ fontSize: 40 }} />,
      title: 'High-Speed Trading',
      description: 'Order execution in milliseconds with our advanced matching engine',
      color: '#00ff88'
    },
    {
      icon: <Security sx={{ fontSize: 40 }} />,
      title: 'Bank-Grade Security',
      description: 'Multi-layer encryption, 2FA, and cold wallet storage',
      color: '#00aaff'
    },
    {
      icon: <AccountBalance sx={{ fontSize: 40 }} />,
      title: 'TTX Token Economy',
      description: 'Fee discounts up to 90% with staking rewards',
      color: '#ffaa00'
    },
    {
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      title: 'Advanced Analytics',
      description: 'Real-time charts, order books, and market depth',
      color: '#00ff88'
    },
    {
      icon: <MonetizationOn sx={{ fontSize: 40 }} />,
      title: '10 Revenue Streams',
      description: 'Trading fees, subscriptions, margin, staking, and more',
      color: '#ff3366'
    },
    {
      icon: <Verified sx={{ fontSize: 40 }} />,
      title: 'Smart Contracts',
      description: 'Ethereum-based tokenomics with automatic fee distribution',
      color: '#00aaff'
    }
  ];

  return (
    <Box sx={{ mb: 4 }}>
      <Typography 
        variant="h5" 
        gutterBottom 
        sx={{ 
          fontWeight: 700, 
          mb: 3,
          textTransform: 'uppercase',
          fontSize: '16px',
          letterSpacing: '0.1em'
        }}
      >
        Platform Features
      </Typography>

      <Grid container spacing={2}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Paper 
              sx={{ 
                p: 2.5,
                height: '100%',
                border: '1px solid #1f2937',
                borderTop: `3px solid ${feature.color}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: feature.color,
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px rgba(${feature.color === '#00ff88' ? '0,255,136' : feature.color === '#ff3366' ? '255,51,102' : '0,170,255'},0.2)`
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box 
                  sx={{ 
                    color: feature.color,
                    flexShrink: 0
                  }}
                >
                  {feature.icon}
                </Box>
                <Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700, 
                      fontSize: '14px',
                      mb: 0.5,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#9ca3af',
                      fontSize: '12px',
                      lineHeight: 1.6
                    }}
                  >
                    {feature.description}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
