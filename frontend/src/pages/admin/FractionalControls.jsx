import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Settings,
  TrendingUp,
  People,
  Edit,
  Refresh
} from '@mui/icons-material';
import api from '../../services/api';

export default function FractionalControls() {
  const [tokens, setTokens] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [settings, setSettings] = useState({
    tokensPerShare: 1000,
    minFractionalAmount: 0.001,
    maxFractionalAmount: 1000,
    fractionalTradingEnabled: true,
    instantSettlement: true
  });

  useEffect(() => {
    fetchFractionalTokens();
  }, []);

  const fetchFractionalTokens = async () => {
    try {
      const response = await api.get('/rwa/tokens/category/EQUITY');
      setTokens(response.data.data || []);
    } catch (error) {
      console.error('Error fetching fractional tokens:', error);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await api.put(`/admin/fractional/${selectedToken.id}/settings`, settings);
      setOpenDialog(false);
      fetchFractionalTokens();
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const enableFractionalTrading = async (tokenId) => {
    try {
      await api.post(`/admin/fractional/${tokenId}/enable`);
      fetchFractionalTokens();
    } catch (error) {
      console.error('Error enabling fractional trading:', error);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
            📊 Fractional Share Controls
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Manage fractional ownership settings and BlackRock-style tokenization
          </Typography>
        </Box>
        <IconButton onClick={fetchFractionalTokens} sx={{ bgcolor: 'primary.main' }}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Global Settings Card */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: 'rgba(102, 126, 234, 0.1)', borderLeft: '4px solid #667eea' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea', mb: 2 }}>
                BlackRock Model
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                Tokens per Share: <strong>1000</strong>
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                Min Purchase: <strong>0.001 shares</strong>
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Settlement: <strong>Instant</strong>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', borderLeft: '4px solid #4CAF50' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#4CAF50', mb: 2 }}>
                Active Assets
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                {tokens.filter(t => t.underlyingAsset?.fractionalTradingEnabled).length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Fractional trading enabled
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: 'rgba(255, 215, 0, 0.1)', borderLeft: '4px solid #FFD700' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#FFD700', mb: 2 }}>
                Total Holders
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#FFD700' }}>
                {tokens.reduce((sum, t) => sum + (t.holdersCount || 0), 0)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Fractional shareholders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tokens Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Fractional Trading Assets
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Price per Share</TableCell>
                <TableCell>Min Purchase</TableCell>
                <TableCell>Holders</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell sx={{ fontWeight: 700 }}>{token.symbol}</TableCell>
                  <TableCell>{token.name}</TableCell>
                  <TableCell>
                    ${(parseFloat(token.currentPrice) * 1000).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    ${(parseFloat(token.currentPrice) * 1000 * 0.001).toFixed(2)}
                  </TableCell>
                  <TableCell>{token.holdersCount || 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={token.underlyingAsset?.fractionalTradingEnabled ? 'Enabled' : 'Disabled'}
                      color={token.underlyingAsset?.fractionalTradingEnabled ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedToken(token);
                        setOpenDialog(true);
                      }}
                    >
                      <Settings />
                    </IconButton>
                    {!token.underlyingAsset?.fractionalTradingEnabled && (
                      <Button
                        size="small"
                        onClick={() => enableFractionalTrading(token.id)}
                        sx={{ ml: 1 }}
                      >
                        Enable
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Fractional Trading - {selectedToken?.symbol}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Tokens per Share"
                value={settings.tokensPerShare}
                onChange={(e) => setSettings({ ...settings, tokensPerShare: e.target.value })}
                helperText="BlackRock standard: 1000 tokens = 1 share"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Fractional Amount"
                value={settings.minFractionalAmount}
                onChange={(e) => setSettings({ ...settings, minFractionalAmount: e.target.value })}
                helperText="Minimum shares a user can purchase (e.g., 0.001)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Maximum Fractional Amount"
                value={settings.maxFractionalAmount}
                onChange={(e) => setSettings({ ...settings, maxFractionalAmount: e.target.value })}
                helperText="Maximum shares per transaction"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.fractionalTradingEnabled}
                    onChange={(e) => setSettings({ ...settings, fractionalTradingEnabled: e.target.checked })}
                  />
                }
                label="Enable Fractional Trading"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.instantSettlement}
                    onChange={(e) => setSettings({ ...settings, instantSettlement: e.target.checked })}
                  />
                }
                label="Instant Settlement (vs T+2)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateSettings} sx={{ bgcolor: '#FFD700', color: '#000' }}>
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
