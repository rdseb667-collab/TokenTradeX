import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
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
  Chip
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import api from '../services/api';

export default function Admin() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingToken, setEditingToken] = useState(null);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    description: '',
    totalSupply: '',
    circulatingSupply: '',
    currentPrice: '',
    isActive: true,
    isTradingEnabled: true,
    minTradeAmount: '0.001',
    maxTradeAmount: '1000000'
  });

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tokens');
      setTokens(response.data.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (token = null) => {
    if (token) {
      setEditingToken(token);
      setFormData({
        symbol: token.symbol,
        name: token.name,
        description: token.description || '',
        totalSupply: token.totalSupply,
        circulatingSupply: token.circulatingSupply,
        currentPrice: token.currentPrice,
        isActive: token.isActive,
        isTradingEnabled: token.isTradingEnabled,
        minTradeAmount: token.minTradeAmount,
        maxTradeAmount: token.maxTradeAmount
      });
    } else {
      setEditingToken(null);
      setFormData({
        symbol: '',
        name: '',
        description: '',
        totalSupply: '',
        circulatingSupply: '',
        currentPrice: '',
        isActive: true,
        isTradingEnabled: true,
        minTradeAmount: '0.001',
        maxTradeAmount: '1000000'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingToken(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (editingToken) {
        await api.put(`/tokens/${editingToken.id}`, formData);
        setSuccess('Token updated successfully');
      } else {
        await api.post('/tokens', formData);
        setSuccess('Token created successfully');
      }
      fetchTokens();
      handleCloseDialog();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save token');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tokenId) => {
    if (!window.confirm('Are you sure you want to delete this token?')) return;
    
    try {
      setLoading(true);
      await api.delete(`/tokens/${tokenId}`);
      setSuccess('Token deleted successfully');
      fetchTokens();
    } catch (err) {
      setError('Failed to delete token');
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
      fetchTokens();
    } catch (err) {
      setError('Failed to toggle trading');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Admin - Token Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Token
        </Button>
      </Box>

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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Supply</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Trading</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tokens.map((token) => (
              <TableRow key={token.id}>
                <TableCell>{token.symbol}</TableCell>
                <TableCell>{token.name}</TableCell>
                <TableCell align="right">${parseFloat(token.currentPrice).toFixed(2)}</TableCell>
                <TableCell align="right">
                  {parseFloat(token.circulatingSupply).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={token.isActive ? 'Active' : 'Inactive'}
                    color={token.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={token.isTradingEnabled}
                    onChange={() => handleToggleTrading(token)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(token)}
                    color="primary"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(token.id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingToken ? 'Edit Token' : 'Add New Token'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Symbol"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              disabled={!!editingToken}
              required
            />
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
            <TextField
              label="Total Supply"
              type="number"
              value={formData.totalSupply}
              onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
              required
            />
            <TextField
              label="Circulating Supply"
              type="number"
              value={formData.circulatingSupply}
              onChange={(e) => setFormData({ ...formData, circulatingSupply: e.target.value })}
              required
            />
            <TextField
              label="Current Price"
              type="number"
              value={formData.currentPrice}
              onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
              required
            />
            <TextField
              label="Min Trade Amount"
              type="number"
              value={formData.minTradeAmount}
              onChange={(e) => setFormData({ ...formData, minTradeAmount: e.target.value })}
            />
            <TextField
              label="Max Trade Amount"
              type="number"
              value={formData.maxTradeAmount}
              onChange={(e) => setFormData({ ...formData, maxTradeAmount: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isTradingEnabled}
                  onChange={(e) => setFormData({ ...formData, isTradingEnabled: e.target.checked })}
                />
              }
              label="Trading Enabled"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {editingToken ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
