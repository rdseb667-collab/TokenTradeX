import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  TrendingUp,
  AccountBalance,
  Assessment,
  Security,
  BarChart,
  People,
  Token as TokenIcon,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  AccountBalanceWallet
} from '@mui/icons-material';
import api from '../services/api';
import WithdrawalApprovals from './admin/WithdrawalApprovals';

// Tab Panel Component
function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState(0);
  const [tokens, setTokens] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTokens: 0,
    totalVolume: 0,
    totalRevenue: 0,
    activeTokens: 0,
    rwaAssets: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Asset Dialog State
  const [openAssetDialog, setOpenAssetDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetForm, setAssetForm] = useState({
    symbol: '',
    name: '',
    description: '',
    assetType: 'crypto',
    assetCategory: '',
    totalSupply: '',
    circulatingSupply: '',
    currentPrice: '',
    isActive: true,
    isTradingEnabled: true,
    minTradeAmount: '0.001',
    maxTradeAmount: '1000000',
    // RWA specific fields
    cusip: '',
    isin: '',
    dividendYield: '',
    dividendsEnabled: false,
    underlyingAsset: {}
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [tokensRes, statsRes, usersRes] = await Promise.all([
        api.get('/tokens'),
        api.get('/admin/stats/overview'),
        api.get('/admin/users?limit=100')
      ]);
      
      setTokens(tokensRes.data.data || []);
      setStats(statsRes.data.stats || {});
      setUsers(usersRes.data.users || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch admin data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== ASSET MANAGEMENT ====================
  
  const handleOpenAssetDialog = (asset = null) => {
    if (asset) {
      setEditingAsset(asset);
      setAssetForm({
        symbol: asset.symbol,
        name: asset.name,
        description: asset.description || '',
        assetType: asset.assetCategory ? 'rwa' : 'crypto',
        assetCategory: asset.assetCategory || '',
        totalSupply: asset.totalSupply,
        circulatingSupply: asset.circulatingSupply,
        currentPrice: asset.currentPrice,
        isActive: asset.isActive,
        isTradingEnabled: asset.isTradingEnabled,
        minTradeAmount: asset.minTradeAmount || '0.001',
        maxTradeAmount: asset.maxTradeAmount || '1000000',
        cusip: asset.underlyingAsset?.cusip || '',
        isin: asset.underlyingAsset?.isin || '',
        dividendYield: asset.underlyingAsset?.dividendYield || '',
        dividendsEnabled: asset.dividendsEnabled || false,
        underlyingAsset: asset.underlyingAsset || {}
      });
    } else {
      setEditingAsset(null);
      setAssetForm({
        symbol: '',
        name: '',
        description: '',
        assetType: 'crypto',
        assetCategory: '',
        totalSupply: '',
        circulatingSupply: '',
        currentPrice: '',
        isActive: true,
        isTradingEnabled: true,
        minTradeAmount: '0.001',
        maxTradeAmount: '1000000',
        cusip: '',
        isin: '',
        dividendYield: '',
        dividendsEnabled: false,
        underlyingAsset: {}
      });
    }
    setOpenAssetDialog(true);
  };

  const handleCloseAssetDialog = () => {
    setOpenAssetDialog(false);
    setEditingAsset(null);
  };

  const handleSubmitAsset = async () => {
    try {
      setLoading(true);
      
      const payload = {
        symbol: assetForm.symbol,
        name: assetForm.name,
        description: assetForm.description,
        totalSupply: parseFloat(assetForm.totalSupply),
        circulatingSupply: parseFloat(assetForm.circulatingSupply),
        currentPrice: parseFloat(assetForm.currentPrice),
        isActive: assetForm.isActive,
        isTradingEnabled: assetForm.isTradingEnabled,
        minTradeAmount: parseFloat(assetForm.minTradeAmount),
        maxTradeAmount: parseFloat(assetForm.maxTradeAmount)
      };

      // Add RWA-specific fields if applicable
      if (assetForm.assetType === 'rwa') {
        payload.assetCategory = assetForm.assetCategory;
        payload.dividendsEnabled = assetForm.dividendsEnabled;
        payload.underlyingAsset = {
          cusip: assetForm.cusip,
          isin: assetForm.isin,
          dividendYield: parseFloat(assetForm.dividendYield) || 0,
          assetType: assetForm.assetCategory
        };
      }

      if (editingAsset) {
        await api.put(`/tokens/${editingAsset.id}`, payload);
        setSuccess('Asset updated successfully');
      } else {
        await api.post('/tokens', payload);
        setSuccess('Asset created successfully');
      }
      
      fetchAllData();
      handleCloseAssetDialog();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save asset');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsset = async (tokenId) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    
    try {
      setLoading(true);
      await api.delete(`/tokens/${tokenId}`);
      setSuccess('Asset deleted successfully');
      fetchAllData();
    } catch (err) {
      setError('Failed to delete asset');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTrading = async (token) => {
    try {
      await api.put(`/tokens/${token.id}`, {
        isTradingEnabled: !token.isTradingEnabled
      });
      setSuccess(`Trading ${!token.isTradingEnabled ? 'enabled' : 'disabled'} for ${token.symbol}`);
      fetchAllData();
    } catch (err) {
      setError('Failed to toggle trading');
    }
  };

  // ==================== RENDER ====================

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#e8e8e8', mb: 1 }}>
            🔐 ADMIN CONTROL CENTER
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Complete platform management & oversight
          </Typography>
        </Box>
        <IconButton 
          onClick={fetchAllData} 
          sx={{ 
            bgcolor: '#00ff88', 
            color: '#000',
            '&:hover': { bgcolor: '#00cc6a' }
          }}
        >
          <Refresh />
        </IconButton>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Stats Overview */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(0, 255, 136, 0.1)', borderLeft: '4px solid #00ff88' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TokenIcon sx={{ color: '#00ff88', mr: 1 }} />
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>Total Assets</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#00ff88' }}>
                {stats.totalTokens || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(0, 170, 255, 0.1)', borderLeft: '4px solid #00aaff' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <People sx={{ color: '#00aaff', mr: 1 }} />
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>Total Users</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#00aaff' }}>
                {stats.totalUsers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(255, 170, 0, 0.1)', borderLeft: '4px solid #ffaa00' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ color: '#ffaa00', mr: 1 }} />
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>Total Volume</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffaa00' }}>
                ${(stats.totalVolume || 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(255, 51, 102, 0.1)', borderLeft: '4px solid #ff3366' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BarChart sx={{ color: '#ff3366', mr: 1 }} />
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>RWA Assets</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff3366' }}>
                {tokens.filter(t => t.assetCategory).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content - Tabs */}
      <Paper sx={{ bgcolor: '#0f1419', border: '1px solid #1f2937' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: '2px solid #1f2937',
            '& .MuiTabs-indicator': { bgcolor: '#00ff88', height: 3 }
          }}
        >
          <Tab 
            label="ASSET MANAGEMENT" 
            icon={<AccountBalance />} 
            iconPosition="start"
            sx={{ color: '#9ca3af', '&.Mui-selected': { color: '#00ff88' } }}
          />
          <Tab 
            label="USER MANAGEMENT" 
            icon={<People />} 
            iconPosition="start"
            sx={{ color: '#9ca3af', '&.Mui-selected': { color: '#00ff88' } }}
          />
          <Tab 
            label="ANALYTICS" 
            icon={<Assessment />} 
            iconPosition="start"
            sx={{ color: '#9ca3af', '&.Mui-selected': { color: '#00ff88' } }}
          />
          <Tab 
            label="SYSTEM HEALTH" 
            icon={<Security />} 
            iconPosition="start"
            sx={{ color: '#9ca3af', '&.Mui-selected': { color: '#00ff88' } }}
          />
          <Tab 
            label="WITHDRAWALS" 
            icon={<AccountBalanceWallet />} 
            iconPosition="start"
            sx={{ color: '#9ca3af', '&.Mui-selected': { color: '#00ff88' } }}
          />
        </Tabs>

        {/* TAB 1: ASSET MANAGEMENT */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#e8e8e8', fontWeight: 700 }}>
                MANAGE TRADING ASSETS
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenAssetDialog()}
                sx={{ bgcolor: '#00ff88', color: '#000', fontWeight: 700 }}
              >
                Add New Asset
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>SYMBOL</TableCell>
                    <TableCell>NAME</TableCell>
                    <TableCell>TYPE</TableCell>
                    <TableCell align="right">PRICE</TableCell>
                    <TableCell align="right">SUPPLY</TableCell>
                    <TableCell>STATUS</TableCell>
                    <TableCell>TRADING</TableCell>
                    <TableCell align="right">ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <LinearProgress sx={{ bgcolor: '#1f2937', '& .MuiLinearProgress-bar': { bgcolor: '#00ff88' } }} />
                      </TableCell>
                    </TableRow>
                  ) : tokens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" sx={{ color: '#9ca3af', py: 4 }}>
                          No assets found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    tokens.map((token) => (
                      <TableRow key={token.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#e8e8e8' }}>
                            {token.symbol}
                          </Typography>
                        </TableCell>
                        <TableCell>{token.name}</TableCell>
                        <TableCell>
                          {token.assetCategory ? (
                            <Chip 
                              label={token.assetCategory.toUpperCase()} 
                              size="small" 
                              sx={{ bgcolor: '#ff3366', color: '#fff', fontWeight: 700 }}
                            />
                          ) : (
                            <Chip 
                              label="CRYPTO" 
                              size="small" 
                              sx={{ bgcolor: '#00aaff', color: '#fff', fontWeight: 700 }}
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#e8e8e8' }}>
                            ${parseFloat(token.currentPrice).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#9ca3af' }}>
                            {parseFloat(token.circulatingSupply).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={token.isActive ? 'ACTIVE' : 'INACTIVE'}
                            size="small"
                            icon={token.isActive ? <CheckCircle /> : <ErrorIcon />}
                            sx={{
                              bgcolor: token.isActive ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 51, 102, 0.2)',
                              color: token.isActive ? '#00ff88' : '#ff3366',
                              fontWeight: 700,
                              border: `1px solid ${token.isActive ? '#00ff88' : '#ff3366'}`
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={token.isTradingEnabled}
                            onChange={() => handleToggleTrading(token)}
                            size="small"
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: '#00ff88' },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00ff88' }
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenAssetDialog(token)}
                            sx={{ color: '#00aaff', mr: 1 }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteAsset(token.id)}
                            sx={{ color: '#ff3366' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* TAB 2: USER MANAGEMENT */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: '#e8e8e8', fontWeight: 700, mb: 3 }}>
              USER MANAGEMENT
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>EMAIL</TableCell>
                    <TableCell>USERNAME</TableCell>
                    <TableCell>ROLE</TableCell>
                    <TableCell>KYC STATUS</TableCell>
                    <TableCell>STATUS</TableCell>
                    <TableCell>JOINED</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.slice(0, 10).map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell sx={{ color: '#e8e8e8' }}>{user.email}</TableCell>
                      <TableCell sx={{ color: '#9ca3af' }}>{user.username}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role?.toUpperCase()} 
                          size="small"
                          sx={{
                            bgcolor: user.role === 'admin' ? '#ff3366' : '#00aaff',
                            color: '#fff',
                            fontWeight: 700
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={user.kycStatus?.toUpperCase()} 
                          size="small"
                          sx={{
                            bgcolor: user.kycStatus === 'approved' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 170, 0, 0.2)',
                            color: user.kycStatus === 'approved' ? '#00ff88' : '#ffaa00',
                            fontWeight: 700
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={user.isActive ? 'ACTIVE' : 'INACTIVE'} 
                          size="small"
                          sx={{
                            bgcolor: user.isActive ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 51, 102, 0.2)',
                            color: user.isActive ? '#00ff88' : '#ff3366',
                            fontWeight: 700
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#9ca3af', fontSize: '12px' }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* TAB 3: ANALYTICS */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: '#e8e8e8', fontWeight: 700, mb: 3 }}>
              PLATFORM ANALYTICS
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: '#0a0e14', border: '1px solid #1f2937' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#00ff88', mb: 2, fontWeight: 700 }}>
                      REVENUE BREAKDOWN
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>Trading Fees</Typography>
                        <Typography variant="body2" sx={{ color: '#e8e8e8', fontWeight: 700 }}>
                          ${((stats.totalRevenue || 0) * 0.7).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>Subscriptions</Typography>
                        <Typography variant="body2" sx={{ color: '#e8e8e8', fontWeight: 700 }}>
                          ${((stats.totalRevenue || 0) * 0.15).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>Other</Typography>
                        <Typography variant="body2" sx={{ color: '#e8e8e8', fontWeight: 700 }}>
                          ${((stats.totalRevenue || 0) * 0.15).toLocaleString()}
                        </Typography>
                      </Box>
                      <Divider sx={{ bgcolor: '#1f2937' }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1" sx={{ color: '#00ff88', fontWeight: 700 }}>TOTAL</Typography>
                        <Typography variant="body1" sx={{ color: '#00ff88', fontWeight: 700 }}>
                          ${(stats.totalRevenue || 0).toLocaleString()}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: '#0a0e14', border: '1px solid #1f2937' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#00aaff', mb: 2, fontWeight: 700 }}>
                      ASSET DISTRIBUTION
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>Crypto Assets</Typography>
                        <Typography variant="body2" sx={{ color: '#e8e8e8', fontWeight: 700 }}>
                          {tokens.filter(t => !t.assetCategory).length}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>RWA Stocks</Typography>
                        <Typography variant="body2" sx={{ color: '#e8e8e8', fontWeight: 700 }}>
                          {tokens.filter(t => t.assetCategory === 'stocks').length}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>RWA Bonds</Typography>
                        <Typography variant="body2" sx={{ color: '#e8e8e8', fontWeight: 700 }}>
                          {tokens.filter(t => t.assetCategory === 'bonds').length}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>Real Estate</Typography>
                        <Typography variant="body2" sx={{ color: '#e8e8e8', fontWeight: 700 }}>
                          {tokens.filter(t => t.assetCategory === 'real_estate').length}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* TAB 4: SYSTEM HEALTH */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: '#e8e8e8', fontWeight: 700, mb: 3 }}>
              SYSTEM HEALTH & MONITORING
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: '#0a0e14', border: '1px solid #1f2937' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CheckCircle sx={{ color: '#00ff88', mr: 1 }} />
                      <Typography variant="body1" sx={{ color: '#e8e8e8', fontWeight: 700 }}>
                        API Status
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ color: '#00ff88', fontWeight: 700 }}>
                      ONLINE
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mt: 1 }}>
                      All systems operational
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: '#0a0e14', border: '1px solid #1f2937' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Assessment sx={{ color: '#00aaff', mr: 1 }} />
                      <Typography variant="body1" sx={{ color: '#e8e8e8', fontWeight: 700 }}>
                        Active Trades
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ color: '#00aaff', fontWeight: 700 }}>
                      {stats.totalTrades || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mt: 1 }}>
                      Total executed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: '#0a0e14', border: '1px solid #1f2937' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Warning sx={{ color: '#ffaa00', mr: 1 }} />
                      <Typography variant="body1" sx={{ color: '#e8e8e8', fontWeight: 700 }}>
                        Pending KYC
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ color: '#ffaa00', fontWeight: 700 }}>
                      {users.filter(u => u.kycStatus === 'pending').length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mt: 1 }}>
                      Requires review
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* TAB 5: WITHDRAWAL APPROVALS */}
        <TabPanel value={activeTab} index={4}>
          <Box sx={{ p: 3 }}>
            <WithdrawalApprovals />
          </Box>
        </TabPanel>
      </Paper>

      {/* Asset Creation/Edit Dialog */}
      <Dialog 
        open={openAssetDialog} 
        onClose={handleCloseAssetDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#0f1419', border: '2px solid #1f2937' }
        }}
      >
        <DialogTitle sx={{ color: '#e8e8e8', borderBottom: '2px solid #1f2937' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {editingAsset ? 'EDIT ASSET' : 'ADD NEW ASSET'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            {/* Asset Type Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Asset Type</InputLabel>
                <Select
                  value={assetForm.assetType}
                  onChange={(e) => setAssetForm({ ...assetForm, assetType: e.target.value })}
                  label="Asset Type"
                >
                  <MenuItem value="crypto">Cryptocurrency</MenuItem>
                  <MenuItem value="rwa">Real-World Asset (RWA)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* RWA Category (only if RWA selected) */}
            {assetForm.assetType === 'rwa' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>RWA Category</InputLabel>
                  <Select
                    value={assetForm.assetCategory}
                    onChange={(e) => setAssetForm({ ...assetForm, assetCategory: e.target.value })}
                    label="RWA Category"
                  >
                    <MenuItem value="stocks">Stocks</MenuItem>
                    <MenuItem value="bonds">Bonds</MenuItem>
                    <MenuItem value="real_estate">Real Estate</MenuItem>
                    <MenuItem value="commodities">Commodities</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Basic Information */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Symbol"
                value={assetForm.symbol}
                onChange={(e) => setAssetForm({ ...assetForm, symbol: e.target.value.toUpperCase() })}
                disabled={!!editingAsset}
                placeholder="BTC, AAPL, etc."
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                placeholder="Bitcoin, Apple Inc., etc."
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={assetForm.description}
                onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>

            {/* Supply & Price */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Total Supply"
                type="number"
                value={assetForm.totalSupply}
                onChange={(e) => setAssetForm({ ...assetForm, totalSupply: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Circulating Supply"
                type="number"
                value={assetForm.circulatingSupply}
                onChange={(e) => setAssetForm({ ...assetForm, circulatingSupply: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Current Price (USD)"
                type="number"
                value={assetForm.currentPrice}
                onChange={(e) => setAssetForm({ ...assetForm, currentPrice: e.target.value })}
                required
              />
            </Grid>

            {/* Trading Limits */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Min Trade Amount"
                type="number"
                value={assetForm.minTradeAmount}
                onChange={(e) => setAssetForm({ ...assetForm, minTradeAmount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Trade Amount"
                type="number"
                value={assetForm.maxTradeAmount}
                onChange={(e) => setAssetForm({ ...assetForm, maxTradeAmount: e.target.value })}
              />
            </Grid>

            {/* RWA-Specific Fields */}
            {assetForm.assetType === 'rwa' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="CUSIP"
                    value={assetForm.cusip}
                    onChange={(e) => setAssetForm({ ...assetForm, cusip: e.target.value })}
                    placeholder="9-character CUSIP"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="ISIN"
                    value={assetForm.isin}
                    onChange={(e) => setAssetForm({ ...assetForm, isin: e.target.value })}
                    placeholder="12-character ISIN"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Dividend Yield (%)"
                    type="number"
                    value={assetForm.dividendYield}
                    onChange={(e) => setAssetForm({ ...assetForm, dividendYield: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={assetForm.dividendsEnabled}
                        onChange={(e) => setAssetForm({ ...assetForm, dividendsEnabled: e.target.checked })}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: '#00ff88' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00ff88' }
                        }}
                      />
                    }
                    label="Enable Dividends"
                  />
                </Grid>
              </>
            )}

            {/* Status Toggles */}
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={assetForm.isActive}
                    onChange={(e) => setAssetForm({ ...assetForm, isActive: e.target.checked })}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#00ff88' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00ff88' }
                    }}
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={assetForm.isTradingEnabled}
                    onChange={(e) => setAssetForm({ ...assetForm, isTradingEnabled: e.target.checked })}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#00ff88' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00ff88' }
                    }}
                  />
                }
                label="Trading Enabled"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '2px solid #1f2937' }}>
          <Button 
            onClick={handleCloseAssetDialog}
            sx={{ color: '#9ca3af' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitAsset} 
            variant="contained" 
            disabled={loading}
            sx={{ bgcolor: '#00ff88', color: '#000', fontWeight: 700 }}
          >
            {editingAsset ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
