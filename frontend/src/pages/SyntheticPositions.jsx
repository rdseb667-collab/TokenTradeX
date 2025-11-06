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
  FormControl,
  InputLabel,
  Select,
  Slider,
  Alert
} from '@mui/material';
import {
  Add,
  TrendingUp,
  AccountBalance,
  Delete,
  Refresh,
  Lock,
  ShowChart
} from '@mui/icons-material';
import api from '../services/api';

export default function SyntheticPositions() {
  const [positions, setPositions] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [basketName, setBasketName] = useState('');
  const [basketDescription, setBasketDescription] = useState('');
  const [composition, setComposition] = useState([{ tokenId: '', percentage: 25 }]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [positionsRes, tokensRes] = await Promise.all([
        api.get('/dividend-mining/synthetic'),
        api.get('/rwa/tokens/category/EQUITY')
      ]);

      setPositions(positionsRes.data.positions || []);
      setTokens(tokensRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTokenToBasket = () => {
    setComposition([...composition, { tokenId: '', percentage: 0 }]);
  };

  const removeFromBasket = (index) => {
    const newComp = composition.filter((_, i) => i !== index);
    setComposition(newComp);
  };

  const updateComposition = (index, field, value) => {
    const newComp = [...composition];
    newComp[index][field] = value;
    setComposition(newComp);
  };

  const getTotalPercentage = () => {
    return composition.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0);
  };

  const handleCreateBasket = async () => {
    try {
      const totalPct = getTotalPercentage();
      if (Math.abs(totalPct - 100) > 0.01) {
        alert('Total allocation must equal 100%');
        return;
      }

      await api.post('/dividend-mining/synthetic', {
        name: basketName,
        description: basketDescription,
        composition: composition.map(c => ({
          tokenId: c.tokenId,
          percentage: parseFloat(c.percentage)
        }))
      });

      setOpenDialog(false);
      fetchData();
      
      // Reset form
      setBasketName('');
      setBasketDescription('');
      setComposition([{ tokenId: '', percentage: 25 }]);
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating basket');
    }
  };

  const handleRebalance = async (positionId) => {
    try {
      await api.post(`/dividend-mining/synthetic/${positionId}/rebalance`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error rebalancing');
    }
  };

  const handleStakeBasket = async (positionId) => {
    const lockPeriod = prompt('Enter lock period (30, 90, 180, or 365 days):');
    if (!['30', '90', '180', '365'].includes(lockPeriod)) {
      alert('Invalid lock period');
      return;
    }

    try {
      await api.post(`/dividend-mining/synthetic/${positionId}/stake`, { lockPeriod });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error staking basket');
    }
  };

  const getTokenName = (tokenId) => {
    const token = tokens.find(t => t.id === tokenId);
    return token ? token.symbol : tokenId;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
            📊 Synthetic Positions - Custom ETF Baskets
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Create your own tokenized index funds. Earn dividends from ALL holdings + stake for extra APY!
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: '#FFD700', color: '#000', '&:hover': { bgcolor: '#FFC000' } }}
        >
          Create Basket
        </Button>
      </Box>

      {/* Feature Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4CAF50' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#4CAF50', mb: 1 }}>
                🎯 Custom Allocations
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Mix any stocks: 40% AAPL + 30% MSFT + 20% GOOGL + 10% NVDA
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', border: '1px solid #2196F3' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#2196F3', mb: 1 }}>
                🔄 Auto-Rebalancing
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                One-click rebalance to maintain target percentages
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', border: '1px solid #FF9800' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#FF9800', mb: 1 }}>
                💰 Multi-Dividend Stream
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Earn dividends from ALL basket components simultaneously
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Positions Table */}
      <Card sx={{ bgcolor: '#0a0e14', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Your Baskets ({positions.length})
          </Typography>

          {positions.length === 0 ? (
            <Alert severity="info">
              No baskets created yet. Click "Create Basket" to get started!
            </Alert>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'text.secondary' }}>Name</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>Composition</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>Total Value</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>Status</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                        {position.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {position.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {position.composition.map((item, idx) => (
                          <Chip
                            key={idx}
                            label={`${getTokenName(item.tokenId)} ${item.percentage}%`}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 600 }}>
                        ${parseFloat(position.totalValue || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {position.stakingEnabled ? (
                        <Chip label="Staked" color="success" size="small" />
                      ) : (
                        <Chip label="Active" color="info" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleRebalance(position.id)}
                          sx={{ color: '#2196F3' }}
                        >
                          <Refresh />
                        </IconButton>
                        {!position.stakingEnabled && (
                          <IconButton
                            size="small"
                            onClick={() => handleStakeBasket(position.id)}
                            sx={{ color: '#4CAF50' }}
                          >
                            <Lock />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0f1419', color: 'white' }}>
          Create Custom Basket
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#0f1419', mt: 2 }}>
          <TextField
            fullWidth
            label="Basket Name"
            value={basketName}
            onChange={(e) => setBasketName(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="e.g., Tech Giants, Dividend Kings"
          />
          <TextField
            fullWidth
            label="Description"
            value={basketDescription}
            onChange={(e) => setBasketDescription(e.target.value)}
            sx={{ mb: 3 }}
            multiline
            rows={2}
          />

          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Token Allocation
          </Typography>

          {composition.map((item, index) => (
            <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Select Token</InputLabel>
                  <Select
                    value={item.tokenId}
                    label="Select Token"
                    onChange={(e) => updateComposition(index, 'tokenId', e.target.value)}
                  >
                    {tokens.map(token => (
                      <MenuItem key={token.id} value={token.id}>
                        {token.symbol} - {token.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={5}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                    Allocation: {item.percentage}%
                  </Typography>
                  <Slider
                    value={item.percentage}
                    onChange={(e, val) => updateComposition(index, 'percentage', val)}
                    min={0}
                    max={100}
                    step={5}
                  />
                </Box>
              </Grid>
              <Grid item xs={1}>
                {composition.length > 1 && (
                  <IconButton onClick={() => removeFromBasket(index)} sx={{ color: '#f44336' }}>
                    <Delete />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          ))}

          <Button
            startIcon={<Add />}
            onClick={addTokenToBasket}
            sx={{ mb: 2 }}
          >
            Add Token
          </Button>

          <Alert severity={getTotalPercentage() === 100 ? 'success' : 'warning'}>
            Total Allocation: {getTotalPercentage().toFixed(1)}% 
            {getTotalPercentage() !== 100 && ' (Must equal 100%)'}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#0f1419', p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateBasket}
            disabled={getTotalPercentage() !== 100 || !basketName}
            sx={{ bgcolor: '#FFD700', color: '#000' }}
          >
            Create Basket
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
