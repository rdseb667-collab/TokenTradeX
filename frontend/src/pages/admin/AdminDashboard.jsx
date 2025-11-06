import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  TrendingUp,
  Public,
  AutoMode,
  People,
  Analytics,
  Warning,
  MonetizationOn,
  AccountBalance,
  Assessment,
  Refresh,
  Receipt
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import TwoFactorPrompt from '../../components/TwoFactorPrompt';
import api from '../../services/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTokens: 0,
    totalVolume: 0,
    pendingKYC: 0,
    rwaAssets: 0,
    automationSchedules: 0,
    fractionalHolders: 0,
    totalDividendsPaid: 0
  });
  const [loading, setLoading] = useState(true);
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      // Fetch multiple endpoints in parallel
      const [usersRes, tokensRes, automationRes] = await Promise.all([
        api.get('/admin/stats/users'),
        api.get('/admin/stats/tokens'),
        api.get('/automation/stats')
      ]);

      setStats({
        totalUsers: usersRes.data.total || 0,
        activeTokens: tokensRes.data.active || 0,
        totalVolume: tokensRes.data.volume || 0,
        pendingKYC: usersRes.data.pendingKYC || 0,
        rwaAssets: tokensRes.data.rwaAssets || 0,
        automationSchedules: automationRes.data.stats?.activeSchedules || 0,
        fractionalHolders: tokensRes.data.fractionalHolders || 0,
        totalDividendsPaid: automationRes.data.stats?.totalPaid || 0
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = () => {
    setCreateAdminOpen(false);
    setTwoFactorOpen(true);
  };

  const handleTwoFactorSubmit = async (token) => {
    try {
      await api.post(
        '/auth/create-admin',
        {
          email: adminForm.email,
          username: adminForm.username,
          password: adminForm.password,
          firstName: adminForm.firstName,
          lastName: adminForm.lastName
        },
        { headers: { 'X-2FA-Token': token } }
      );
      
      toast.success('Admin created successfully!');
      setTwoFactorOpen(false);
      setAdminForm({ email: '', username: '', password: '', firstName: '', lastName: '' });
      fetchAdminStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create admin');
      setTwoFactorOpen(false);
    }
  };

  const adminCards = [
    {
      title: 'RWA Asset Manager',
      description: 'Create & manage tokenized real-world assets (stocks, bonds, real estate)',
      icon: <Public sx={{ fontSize: 40, color: '#FFD700' }} />,
      path: '/app/admin/rwa-assets',
      stats: `${stats.rwaAssets} Assets`,
      color: '#667eea',
      highlight: true
    },
    {
      title: 'Fractional Share Controls',
      description: 'Manage fractional ownership, pricing, and distribution',
      icon: <TrendingUp sx={{ fontSize: 40, color: '#FFD700' }} />,
      path: '/app/admin/fractional',
      stats: `${stats.fractionalHolders} Holders`,
      color: '#764ba2',
      highlight: true
    },
    {
      title: 'Automation Hub',
      description: 'Configure dividend payments, coupons, and smart contract automation',
      icon: <AutoMode sx={{ fontSize: 40, color: '#4CAF50' }} />,
      path: '/app/admin/automation',
      stats: `${stats.automationSchedules} Active Schedules`,
      color: '#43a047'
    },
    {
      title: 'Audit Logs',
      description: 'View privileged actions, role changes, and security events',
      icon: <Receipt sx={{ fontSize: 40, color: '#9C27B0' }} />,
      path: '/app/admin/audit-logs',
      stats: 'Security Monitoring',
      color: '#7b1fa2'
    }
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
            🔐 Admin Control Center
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Complete platform management for RWA tokenization & trading
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <IconButton onClick={fetchAdminStats} sx={{ bgcolor: 'primary.main' }}>
            <Refresh />
          </IconButton>
          {user?.role === 'super_admin' && (
            <Button 
              variant="contained" 
              color="warning" 
              onClick={() => setCreateAdminOpen(true)}
              sx={{ fontWeight: 700 }}
            >
              Create Admin
            </Button>
          )}
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(102, 126, 234, 0.1)', borderLeft: '4px solid #667eea' }}>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#667eea' }}>
                {stats.rwaAssets}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                RWA Assets Listed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', borderLeft: '4px solid #4CAF50' }}>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                ${stats.totalDividendsPaid.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Dividends Automated
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(255, 215, 0, 0.1)', borderLeft: '4px solid #FFD700' }}>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#FFD700' }}>
                {stats.fractionalHolders}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Fractional Holders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', borderLeft: '4px solid #2196F3' }}>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196F3' }}>
                {stats.totalUsers}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Platform Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Admin Management Cards */}
      <Grid container spacing={3}>
        {adminCards.map((card) => (
          <Grid item xs={12} md={6} lg={4} key={card.title}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                bgcolor: card.highlight ? 'rgba(255, 215, 0, 0.05)' : 'background.paper',
                border: card.highlight ? '2px solid #FFD700' : '1px solid rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: `0 8px 24px ${card.color}40`,
                  borderColor: card.color
                }
              }}
              onClick={() => navigate(card.path)}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: `${card.color}20`,
                      mr: 2
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', mb: 0.5 }}>
                      {card.title}
                    </Typography>
                    {card.highlight && (
                      <Chip
                        label="RWA CORE"
                        size="small"
                        sx={{
                          bgcolor: '#FFD700',
                          color: '#000',
                          fontWeight: 700,
                          fontSize: '10px'
                        }}
                      />
                    )}
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  {card.description}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: card.color, fontWeight: 600 }}>
                    {card.stats}
                  </Typography>
                  <Button
                    size="small"
                    sx={{
                      color: card.color,
                      borderColor: card.color,
                      '&:hover': { bgcolor: `${card.color}20` }
                    }}
                    variant="outlined"
                  >
                    Manage →
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* BlackRock Integration Note */}
      <Paper
        sx={{
          mt: 4,
          p: 3,
          bgcolor: 'rgba(102, 126, 234, 0.1)',
          border: '2px solid #667eea',
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AccountBalance sx={{ fontSize: 32, color: '#667eea', mr: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
            BlackRock RWA Model Implementation
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          This platform implements institutional-grade tokenization standards:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Chip label="✓ Fractional Ownership (0.001 shares)" variant="outlined" sx={{ color: '#4CAF50' }} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Chip label="✓ Smart Contract Automation" variant="outlined" sx={{ color: '#4CAF50' }} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Chip label="✓ MiCA Compliance Ready" variant="outlined" sx={{ color: '#4CAF50' }} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Chip label="✓ ERC-3643 Security Tokens" variant="outlined" sx={{ color: '#4CAF50' }} />
          </Grid>
        </Grid>
      </Paper>

      {/* Create Admin Dialog */}
      <Dialog open={createAdminOpen} onClose={() => setCreateAdminOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0f1419', color: 'white' }}>
          Create Admin Account (2FA Required)
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#0f1419', mt: 2 }}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={adminForm.email}
            onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Username"
            value={adminForm.username}
            onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={adminForm.password}
            onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="First Name"
            value={adminForm.firstName}
            onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Last Name"
            value={adminForm.lastName}
            onChange={(e) => setAdminForm({ ...adminForm, lastName: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#0f1419', p: 2 }}>
          <Button onClick={() => setCreateAdminOpen(false)} sx={{ color: '#9ca3af' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateAdmin} 
            variant="contained" 
            color="warning"
            disabled={!adminForm.email || !adminForm.username || !adminForm.password}
          >
            Create Admin
          </Button>
        </DialogActions>
      </Dialog>

      <TwoFactorPrompt
        open={twoFactorOpen}
        onClose={() => setTwoFactorOpen(false)}
        onSubmit={handleTwoFactorSubmit}
        title="Create Admin - 2FA Required"
        message="Creating an admin account requires two-factor authentication. Enter your 6-digit code."
      />
    </Box>
  );
}
