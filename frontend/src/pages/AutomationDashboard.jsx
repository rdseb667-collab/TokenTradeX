import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment
} from '@mui/material';
import {
  AutoMode,
  AccessTime,
  TrendingUp,
  Savings,
  PlayArrow,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import api from '../services/api';

/**
 * AUTOMATION DASHBOARD
 * 
 * Manage automated payments (dividends, coupons, rental income, etc.)
 * Eliminates traditional "paying agent" fees
 * 
 * SAVINGS:
 * Traditional: Banks charge 0.5-2% per distribution
 * Automated: $0 fees
 */

export default function AutomationDashboard() {
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState('');
  const [formData, setFormData] = useState({
    paymentType: 'dividend',
    frequency: 'quarterly',
    amountPerToken: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load tokens
      const tokensRes = await api.get('/rwa/tokens/category/EQUITY');
      setTokens(tokensRes.data.data || []);
      
      // Load automation stats
      const statsRes = await api.get('/automation/stats');
      setStats(statsRes.data.stats);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load automation data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      if (!selectedToken || !formData.amountPerToken) {
        alert('Please fill all fields');
        return;
      }

      await api.post('/automation/schedule', {
        tokenId: selectedToken,
        ...formData,
        amountPerToken: parseFloat(formData.amountPerToken)
      });

      alert('Automated payment schedule created!');
      setDialogOpen(false);
      setFormData({
        paymentType: 'dividend',
        frequency: 'quarterly',
        amountPerToken: '',
      });
      setSelectedToken('');
      loadData();
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert(error.response?.data?.message || 'Failed to create schedule');
    }
  };

  const handleExecutePayment = async (tokenId) => {
    if (!confirm('Execute payment now? This will distribute funds to all holders.')) {
      return;
    }

    try {
      const res = await api.post(`/automation/execute/${tokenId}`);
      alert(res.data.message);
      loadData();
    } catch (error) {
      console.error('Error executing payment:', error);
      alert(error.response?.data?.message || 'Failed to execute payment');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#e8e8e8', fontWeight: 600 }}>
          Automated Payment System
        </Typography>
        <Typography variant="body1" sx={{ color: '#9ca3af', mb: 2 }}>
          Eliminate paying agent fees. Set once, runs forever like a smart contract.
        </Typography>
        <Button
          variant="contained"
          startIcon={<ScheduleIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{
            bgcolor: '#00ff88',
            color: '#0a0e14',
            borderRadius: 0,
            '&:hover': { bgcolor: '#00dd77' }
          }}
        >
          CREATE SCHEDULE
        </Button>
      </Box>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#0f1419', border: '1px solid #1e2329', borderRadius: 0 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AutoMode sx={{ color: '#00aaff' }} />
                  <Typography variant="h6" sx={{ color: '#e8e8e8' }}>
                    {stats.totalScheduledPayments}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  Scheduled Payments
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#0f1419', border: '1px solid #1e2329', borderRadius: 0 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PlayArrow sx={{ color: '#00ff88' }} />
                  <Typography variant="h6" sx={{ color: '#e8e8e8' }}>
                    {stats.totalExecutedPayments}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  Executed Payments
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#0f1419', border: '1px solid #1e2329', borderRadius: 0 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Savings sx={{ color: '#ffaa00' }} />
                  <Typography variant="h6" sx={{ color: '#00ff88' }}>
                    {stats.totalPayingAgentFeesSaved}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  Fees Saved
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#0f1419', border: '1px solid #1e2329', borderRadius: 0 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TrendingUp sx={{ color: '#00ff88' }} />
                  <Typography variant="h6" sx={{ color: '#e8e8e8' }}>
                    {stats.averageSavingsPerPayment}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  Avg. Savings/Payment
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Benefits */}
      <Card sx={{ mb: 4, bgcolor: '#0f1419', border: '1px solid #1e2329', borderRadius: 0 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#e8e8e8', mb: 2 }}>
            Advantages Over Traditional Paying Agents
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Savings sx={{ color: '#00ff88', fontSize: 20 }} />
                <Typography sx={{ color: '#e8e8e8' }}>
                  No fees (save 0.5-2% per distribution)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AccessTime sx={{ color: '#00aaff', fontSize: 20 }} />
                <Typography sx={{ color: '#e8e8e8' }}>
                  Instant settlement (vs 2-3 days)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AutoMode sx={{ color: '#ffaa00', fontSize: 20 }} />
                <Typography sx={{ color: '#e8e8e8' }}>
                  Automated execution (set once, runs forever)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp sx={{ color: '#00ff88', fontSize: 20 }} />
                <Typography sx={{ color: '#e8e8e8' }}>
                  Exact proportional distribution (no errors)
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tokens with Schedules */}
      <Card sx={{ bgcolor: '#0f1419', border: '1px solid #1e2329', borderRadius: 0 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#e8e8e8', mb: 2 }}>
            Scheduled Payments
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }}>Token</TableCell>
                  <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }}>Type</TableCell>
                  <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }}>Frequency</TableCell>
                  <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }} align="right">Amount/Token</TableCell>
                  <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }}>Next Payment</TableCell>
                  <TableCell sx={{ color: '#9ca3af', borderBottom: '1px solid #1e2329' }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tokens
                  .filter(t => t.underlyingAsset?.paymentSchedule)
                  .map((token) => {
                    const schedule = token.underlyingAsset.paymentSchedule;
                    return (
                      <TableRow key={token.id}>
                        <TableCell sx={{ color: '#e8e8e8', borderBottom: '1px solid #1e2329' }}>
                          <Chip label={token.symbol} size="small" sx={{ bgcolor: '#00aaff', color: '#fff' }} />
                        </TableCell>
                        <TableCell sx={{ color: '#e8e8e8', borderBottom: '1px solid #1e2329' }}>
                          {schedule.paymentType}
                        </TableCell>
                        <TableCell sx={{ color: '#e8e8e8', borderBottom: '1px solid #1e2329' }}>
                          {schedule.frequency}
                        </TableCell>
                        <TableCell sx={{ color: '#00ff88', borderBottom: '1px solid #1e2329' }} align="right">
                          ${parseFloat(schedule.amountPerToken).toFixed(4)}
                        </TableCell>
                        <TableCell sx={{ color: '#e8e8e8', borderBottom: '1px solid #1e2329' }}>
                          {new Date(schedule.nextExecution).toLocaleDateString()}
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid #1e2329' }} align="right">
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PlayArrow />}
                            onClick={() => handleExecutePayment(token.id)}
                            sx={{
                              borderColor: '#00ff88',
                              color: '#00ff88',
                              borderRadius: 0,
                              '&:hover': {
                                borderColor: '#00dd77',
                                bgcolor: 'rgba(0, 255, 136, 0.1)'
                              }
                            }}
                          >
                            EXECUTE NOW
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>

          {tokens.filter(t => t.underlyingAsset?.paymentSchedule).length === 0 && (
            <Alert severity="info" sx={{ mt: 2, bgcolor: '#1e2329', color: '#e8e8e8' }}>
              No scheduled payments yet. Click "CREATE SCHEDULE" to set up automated payments.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Create Schedule Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#0f1419',
            border: '1px solid #1e2329',
            borderRadius: 0,
            minWidth: 500
          }
        }}
      >
        <DialogTitle sx={{ color: '#e8e8e8', borderBottom: '1px solid #1e2329' }}>
          Create Automated Payment Schedule
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#9ca3af' }}>Token</InputLabel>
            <Select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              sx={{
                color: '#e8e8e8',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e2329' }
              }}
            >
              {tokens.map(token => (
                <MenuItem key={token.id} value={token.id}>
                  {token.symbol} - {token.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#9ca3af' }}>Payment Type</InputLabel>
            <Select
              value={formData.paymentType}
              onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
              sx={{
                color: '#e8e8e8',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e2329' }
              }}
            >
              <MenuItem value="dividend">Dividend</MenuItem>
              <MenuItem value="coupon">Bond Coupon</MenuItem>
              <MenuItem value="rental">Rental Income</MenuItem>
              <MenuItem value="royalty">Royalty</MenuItem>
              <MenuItem value="platform_fee">Platform Fee Share</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#9ca3af' }}>Frequency</InputLabel>
            <Select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              sx={{
                color: '#e8e8e8',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e2329' }
              }}
            >
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="semi_annual">Semi-Annual</MenuItem>
              <MenuItem value="annual">Annual</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Amount Per Token"
            type="number"
            value={formData.amountPerToken}
            onChange={(e) => setFormData({ ...formData, amountPerToken: e.target.value })}
            InputProps={{
              startAdornment: <InputAdornment position="start" sx={{ color: '#9ca3af' }}>$</InputAdornment>
            }}
            sx={{
              '& .MuiInputLabel-root': { color: '#9ca3af' },
              '& .MuiInputBase-input': { color: '#e8e8e8' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1e2329' }
            }}
          />

          <Alert severity="success" sx={{ mt: 2, bgcolor: 'rgba(0, 255, 136, 0.1)', color: '#00ff88' }}>
            This will automatically distribute payments to all holders. No paying agent fees!
          </Alert>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #1e2329', p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#9ca3af' }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSchedule}
            variant="contained"
            sx={{
              bgcolor: '#00ff88',
              color: '#0a0e14',
              borderRadius: 0,
              '&:hover': { bgcolor: '#00dd77' }
            }}
          >
            CREATE SCHEDULE
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
