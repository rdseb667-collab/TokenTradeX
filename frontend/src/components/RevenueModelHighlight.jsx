import { Box, Paper, Typography, Grid, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  SwapHoriz, 
  CardMembership,
  AccountBalance,
  MonetizationOn,
  PieChart,
  TrendingUp,
  AutoMode,
  EmojiEvents,
  AttachMoney,
  Stars
} from '@mui/icons-material';

export default function RevenueModelHighlight() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Map revenue stream titles to their corresponding routes
  const routeMap = {
    'Trading Fees': '/app/trading',
    'Fractional Spreads': '/fractional-shares',
    'Subscriptions': '/app/subscriptions',
    'Staking Fees': '/app/staking',
    'Synthetic Baskets': '/app/synthetic-positions',
    'Automation Fees': '/app/admin/automation',
    'Dividend Lottery': '/app/dividend-lottery',
    'API Access': '/app/settings',
    'Margin': '/app/margin',
    'Copy Trading': '/app/copy-trading'
  };

  const handleNavigation = (title, path) => {
    if (!path) return;
    
    // Guard admin-only routes
    if (title === 'Automation Fees' && user?.role !== 'admin' && user?.role !== 'super_admin') {
      toast.warning('⚠️ Admin-only feature. Please contact support to upgrade your account.');
      return;
    }
    
    navigate(path);
  };

  const revenueStreams = [
    {
      icon: <SwapHoriz sx={{ fontSize: 32 }} />,
      title: 'Trading Fees',
      description: '0.1% - 0.5% per trade',
      status: 'Active',
      color: '#00ff88'
    },
    {
      icon: <TrendingUp sx={{ fontSize: 32 }} />,
      title: 'Fractional Spreads',
      description: 'Buy/sell spread on fractions',
      status: 'Active',
      color: '#FFD700'
    },
    {
      icon: <CardMembership sx={{ fontSize: 32 }} />,
      title: 'Subscriptions',
      description: 'Premium tiers ($9.99-$99/mo)',
      status: 'Active',
      color: '#00aaff'
    },
    {
      icon: <AccountBalance sx={{ fontSize: 32 }} />,
      title: 'Staking Fees',
      description: '2% performance fee on rewards',
      status: 'Active',
      color: '#4CAF50'
    },
    {
      icon: <PieChart sx={{ fontSize: 32 }} />,
      title: 'Synthetic Baskets',
      description: 'Rebalancing & management fees',
      status: 'Active',
      color: '#9C27B0'
    },
    {
      icon: <AutoMode sx={{ fontSize: 32 }} />,
      title: 'Automation Fees',
      description: 'Smart contract execution costs',
      status: 'Active',
      color: '#FF9800'
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 32 }} />,
      title: 'Dividend Lottery',
      description: 'Entry fees & platform cut',
      status: 'Active',
      color: '#FFD700'
    },
    {
      icon: <MonetizationOn sx={{ fontSize: 32 }} />,
      title: 'API Access',
      description: 'Institutional API tiers',
      status: 'Active',
      color: '#00aaff'
    },
    {
      icon: <AttachMoney sx={{ fontSize: 32 }} />,
      title: 'Margin',
      description: 'Borrow up to 3x leverage',
      status: 'Active',
      color: '#00ff88'
    },
    {
      icon: <Stars sx={{ fontSize: 32 }} />,
      title: 'Copy Trading',
      description: 'Mirror top traders automatically',
      status: 'Active',
      color: '#FF6B9D'
    }
  ];

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 700, 
              textTransform: 'uppercase',
              fontSize: '16px',
              letterSpacing: '0.1em',
              mb: 0.5
            }}
          >
            🚀 10 Revenue Streams
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Diversified income model powered by fractional ownership & automation
          </Typography>
        </Box>
        <Chip 
          label="All Live" 
          sx={{ 
            bgcolor: '#00ff88', 
            color: '#000', 
            fontWeight: 700,
            fontSize: '11px'
          }} 
        />
      </Box>

      <Grid container spacing={2}>
        {revenueStreams.map((stream, index) => {
          const path = routeMap[stream.title];
          
          return (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper 
                onClick={() => handleNavigation(stream.title, path)}
                sx={{ 
                  p: 2,
                  height: '100%',
                  border: '1px solid #1f2937',
                  borderLeft: `4px solid ${stream.color}`,
                  cursor: path ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: stream.color,
                    transform: path ? 'translateY(-4px)' : 'none',
                    boxShadow: path ? `0 8px 16px rgba(0,0,0,0.3)` : 'none'
                  }
                }}
              >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                <Box sx={{ color: stream.color, flexShrink: 0 }}>
                  {stream.icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 700, 
                      fontSize: '13px',
                      mb: 0.5
                    }}
                  >
                    {stream.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#9ca3af',
                      fontSize: '11px',
                      lineHeight: 1.4,
                      mb: 1
                    }}
                  >
                    {stream.description}
                  </Typography>
                  <Chip 
                    label={stream.status} 
                    size="small"
                    sx={{ 
                      bgcolor: 'rgba(0,255,136,0.1)',
                      color: '#00ff88',
                      fontSize: '9px',
                      height: '18px',
                      fontWeight: 700
                    }}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
