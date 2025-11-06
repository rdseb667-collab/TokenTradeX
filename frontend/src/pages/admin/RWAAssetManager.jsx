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
  IconButton,
  MenuItem,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  TrendingUp,
  Home,
  AccountBalance,
  Palette,
  Public
} from '@mui/icons-material';
import api from '../../services/api';

export default function RWAAssetManager() {
  const [activeTab, setActiveTab] = useState(0);
  const [assets, setAssets] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [formData, setFormData] = useState({
    category: 'stocks',
    symbol: '',
    name: '',
    description: '',
    totalSupply: '',
    pricePerToken: '',
    underlyingAsset: {
      assetType: '',
      issuer: '',
      cusip: '',
      isin: '',
      pricePerShare: '',
      totalShares: '',
      dividendYield: '',
      propertyAddress: '',
      propertyValue: '',
      rentalYield: ''
    }
  });

  const categories = [
    { value: 'stocks', label: 'Stocks', icon: <TrendingUp /> },
    { value: 'real_estate', label: 'Real Estate', icon: <Home /> },
    { value: 'bonds', label: 'Bonds', icon: <AccountBalance /> },
    { value: 'commodities', label: 'Commodities', icon: <Public /> },
    { value: 'art', label: 'Art & Collectibles', icon: <Palette /> }
  ];

  const RWA_CATEGORY_MAP = {
    stocks: 'EQUITY',
    real_estate: 'REAL_ESTATE',
    bonds: 'FIXED_INCOME',
    commodities: 'COMMODITY',
    art: 'ART_COLLECTIBLE'
  };

  useEffect(() => {
    fetchAssets();
  }, [activeTab]);

  const fetchAssets = async () => {
    try {
      const uiCategory = categories[activeTab].value;
      const rwaCategory = RWA_CATEGORY_MAP[uiCategory];
      const response = await api.get(`/rwa/tokens/category/${rwaCategory}`);
      setAssets(response.data.data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const handleCreateAsset = async () => {
    try {
      const uiCategory = categories[activeTab].value;
      const rwaCategory = RWA_CATEGORY_MAP[uiCategory];

      await api.post('/rwa/tokens', {
        assetName: formData.name || formData.symbol,
        symbol: formData.symbol,
        category: rwaCategory,
        totalValue: parseFloat(formData.pricePerToken || 0) * parseFloat(formData.totalSupply || 0),
        totalSupply: parseFloat(formData.totalSupply || 0),
        description: formData.description,
        requiresKYC: true,
        dividendsEnabled: uiCategory === 'stocks' || uiCategory === 'real_estate',
        underlyingAssetDetails: formData.underlyingAsset
      });

      setOpenDialog(false);
      fetchAssets();
      resetForm();
    } catch (error) {
      console.error('Error creating asset:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      category: 'stocks',
      symbol: '',
      name: '',
      description: '',
      totalSupply: '',
      pricePerToken: '',
      underlyingAsset: {}
    });
    setSelectedAsset(null);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
            🏦 RWA Asset Manager
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Create and manage tokenized real-world assets
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{
            bgcolor: '#FFD700',
            color: '#000',
            fontWeight: 700,
            '&:hover': { bgcolor: '#FFC700' }
          }}
        >
          Create New Asset
        </Button>
      </Box>

      {/* Category Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': { fontWeight: 600 },
            '& .Mui-selected': { color: '#FFD700' }
          }}
        >
          {categories.map((cat, index) => (
            <Tab
              key={cat.value}
              label={cat.label}
              icon={cat.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Supply</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Market Cap</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell sx={{ fontWeight: 700 }}>{asset.symbol}</TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{parseFloat(asset.totalSupply).toLocaleString()}</TableCell>
                  <TableCell>${parseFloat(asset.currentPrice).toFixed(2)}</TableCell>
                  <TableCell>${parseFloat(asset.marketCap || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={asset.isActive ? 'Active' : 'Inactive'}
                      color={asset.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><Visibility /></IconButton>
                    <IconButton size="small"><Edit /></IconButton>
                    <IconButton size="small" color="error"><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {assets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No assets found. Create your first {categories[activeTab].label} token!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Asset Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New {categories[activeTab].label} Token</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                placeholder="AAPL, NYC-APT-001"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Apple Inc., NYC Apartment 401"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Total Supply (tokens)"
                value={formData.totalSupply}
                onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Price per Token (USD)"
                value={formData.pricePerToken}
                onChange={(e) => setFormData({ ...formData, pricePerToken: e.target.value })}
              />
            </Grid>

            {/* Category-specific fields */}
            {categories[activeTab].value === 'stocks' && (
              <>
                <Grid item xs={12}><Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700 }}>Stock Details</Typography></Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Issuer"
                    value={formData.underlyingAsset.issuer || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      underlyingAsset: { ...formData.underlyingAsset, issuer: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="CUSIP/ISIN"
                    value={formData.underlyingAsset.cusip || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      underlyingAsset: { ...formData.underlyingAsset, cusip: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Price per Share (USD)"
                    value={formData.underlyingAsset.pricePerShare || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      underlyingAsset: { ...formData.underlyingAsset, pricePerShare: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Dividend Yield (%)"
                    value={formData.underlyingAsset.dividendYield || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      underlyingAsset: { ...formData.underlyingAsset, dividendYield: e.target.value }
                    })}
                  />
                </Grid>
              </>
            )}

            {categories[activeTab].value === 'real_estate' && (
              <>
                <Grid item xs={12}><Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700 }}>Property Details</Typography></Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Property Address"
                    value={formData.underlyingAsset.propertyAddress || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      underlyingAsset: { ...formData.underlyingAsset, propertyAddress: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Property Value (USD)"
                    value={formData.underlyingAsset.propertyValue || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      underlyingAsset: { ...formData.underlyingAsset, propertyValue: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Rental Yield (%)"
                    value={formData.underlyingAsset.rentalYield || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      underlyingAsset: { ...formData.underlyingAsset, rentalYield: e.target.value }
                    })}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenDialog(false); resetForm(); }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateAsset} sx={{ bgcolor: '#FFD700', color: '#000' }}>
            Create Asset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
