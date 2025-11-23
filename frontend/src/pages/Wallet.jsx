import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  Chip,
  Tabs,
  Tab,
  LinearProgress,
  Link,
  CircularProgress
} from '@mui/material';
import { AccountBalanceWallet, TrendingUp, Diamond, Add, VerifiedUser, AccountBalance, Receipt } from '@mui/icons-material';
import { toast } from 'react-toastify';

import { fetchWallet, deposit, withdraw, fetchTransactions } from '../store/slices/walletSlice';
import { fetchTokens } from '../store/slices/tokensSlice';
import InfoTooltip from '../components/InfoTooltip';
import api from '../services/api';

export default function Wallet() {
  const dispatch = useDispatch();
  const { wallets, totalValue, transactions } = useSelector((state) => state.wallet);
  const { list: tokens } = useSelector((state) => state.tokens);

  const [depositDialog, setDepositDialog] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [formData, setFormData] = useState({
    tokenId: '',
    amount: '',
    address: '',
    txHash: ''
  });
  const [ttxInfo, setTtxInfo] = useState(null);
  const [withdrawCheck, setWithdrawCheck] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [dispatch]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      dispatch(fetchWallet()),
      dispatch(fetchTokens()),
      dispatch(fetchTransactions({ limit: 20 }))
    ]);
    
    try {
      const res = await api.get('/wallet/ttx/fee-info');
      setTtxInfo(res.data.data);
    } catch {}
    
    setLoading(false);
  };

  useEffect(() => {
    const runCheck = async () => {
      if (!formData.tokenId || !formData.amount) {
        setWithdrawCheck(null);
        return;
      }
      try {
        const res = await api.get('/wallet/withdrawal/check', {
          params: { tokenId: formData.tokenId, amount: formData.amount }
        });
        setWithdrawCheck(res.data.data);
      } catch (err) {
        setWithdrawCheck({
          allowed: false,
          reason: err.response?.data?.message || 'Withdraw check failed'
        });
      }
    };
    runCheck();
  }, [formData.tokenId, formData.amount]);

  const handleOpenDeposit = () => {
    setDepositDialog(true);
    setFormData({ tokenId: '', amount: '', address: '', txHash: '' });
  };

  const handleOpenWithdraw = () => {
    setWithdrawDialog(true);
    setFormData({ tokenId: '', amount: '', address: '', txHash: '' });
  };

  const handleCloseDialogs = () => {
    setDepositDialog(false);
    setWithdrawDialog(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDeposit = async () => {
    try {
      await dispatch(deposit({
        tokenId: formData.tokenId,
        amount: parseFloat(formData.amount),
        txHash: formData.txHash
      })).unwrap();
      toast.success('Deposit successful!');
      handleCloseDialogs();
      dispatch(fetchWallet());
    } catch (err) {
      toast.error(err?.message || 'Deposit failed');
    }
  };

  const handleWithdraw = async () => {
    try {
      // Client-side validation before sending request
      if (!formData.tokenId) {
        toast.error('Please select a token to withdraw');
        return;
      }
      
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        toast.error('Please enter a valid withdrawal amount');
        return;
      }
      
      if (!formData.address || formData.address.trim() === '') {
        toast.error('Please enter a withdrawal address');
        return;
      }
      
      // Check available balance
      const selectedWallet = wallets.find(w => w.tokenId === formData.tokenId);
      if (!selectedWallet) {
        toast.error('Wallet not found for selected token');
        return;
      }
      
      const availableBalance = parseFloat(selectedWallet.balance) - parseFloat(selectedWallet.lockedBalance || 0);
      const withdrawalAmount = parseFloat(formData.amount);
      
      if (availableBalance < withdrawalAmount) {
        toast.error(`Insufficient balance. Available: ${availableBalance.toFixed(4)} ${selectedWallet.token?.symbol || ''}`);
        return;
      }
      
      // Proceed with withdrawal if all validations pass
      await dispatch(withdraw({
        tokenId: formData.tokenId,
        amount: withdrawalAmount,
        address: formData.address.trim()
      })).unwrap();
      
      toast.success('Withdrawal request submitted!');
      handleCloseDialogs();
      dispatch(fetchWallet());
    } catch (err) {
      // Improved error handling with clearer user feedback
      const errorMessage = err?.message || err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message || 'Withdrawal failed';
      toast.error(errorMessage);
      console.error('Withdrawal error:', err);
    }
  };

  // Get TTX balance
  const ttxWallet = wallets.find(w => w.token?.symbol === 'TTX');
  const ttxBalance = ttxWallet ? parseFloat(ttxWallet.balance) : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Wallet
          </Typography>
          <InfoTooltip title="Your wallet holds all your tokens. TTX earns you passive income from platform fees!" />
        </Box>
        <Box>
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={handleOpenDeposit}
            sx={{ mr: 2 }}
          >
            Add Funds
          </Button>
          <Button variant="outlined" onClick={handleOpenWithdraw}>
            Withdraw
          </Button>
        </Box>
      </Box>
      
      {/* KYC Status Funding Card */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: '2px solid #00ff88',
          borderRadius: 2,
          color: 'white'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <VerifiedUser sx={{ fontSize: 48, color: '#00ff88' }} />
              <Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', textTransform: 'uppercase' }}>
                  🔐 KYC Status
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'white', mt: 0.5 }}>
                  Verified
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
                  You have full access to all funding methods
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'right' }}>
              <Button 
                variant="contained" 
                startIcon={<Add />}
                onClick={handleOpenDeposit}
                sx={{ 
                  bgcolor: 'white',
                  color: 'primary.main',
                  fontWeight: 700,
                  '&:hover': { bgcolor: 'grey.100' }
                }}
              >
                Add Funds
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Add Funds Promo Strip */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 2, 
          mb: 3,
          background: 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)',
          borderRadius: 1,
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            💰 Add funds now and get 0.5% cashback on your first deposit!
          </Typography>
          <Button 
            variant="contained" 
            size="small"
            onClick={handleOpenDeposit}
            sx={{ 
              bgcolor: 'white',
              color: '#4CAF50',
              fontWeight: 700,
              '&:hover': { bgcolor: 'grey.100' }
            }}
          >
            Claim Offer
          </Button>
        </Box>
      </Paper>

      {/* TTX Highlight Banner */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: '2px solid #00ff88',
          borderRadius: 2
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Diamond sx={{ fontSize: 48, color: '#00ff88' }} />
              <Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', textTransform: 'uppercase' }}>
                  💎 Your TTX Holdings
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'white' }}>
                  {ttxBalance.toLocaleString()}
                  <Typography component="span" variant="h6" sx={{ ml: 1, color: 'rgba(255,255,255,0.7)' }}>
                    TTX
                  </Typography>
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Alert severity="info" sx={{ bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)' }}>
              <Typography variant="body2" sx={{ color: 'white' }}>
                💰 <strong>Earn More:</strong> Trade to get mining rewards (5-20 TTX per $100) + earn 15% of all platform fees!
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              {loading ? (
                <Box>
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="80%" height={50} sx={{ mt: 1 }} />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontSize: '0.9rem' }}>
                        Total Portfolio Value
                      </Typography>
                      <InfoTooltip title="Combined value of all your tokens in USD" />
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                      ${Number(totalValue ?? 0).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 60,
                      height: 60,
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                      color: 'white'
                    }}
                  >
                    <AccountBalanceWallet />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontSize: '0.9rem' }}>
                    Active Assets
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '2.5rem' }}>
                    {wallets.filter(w => parseFloat(w.balance) > 0).length}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 60,
                    height: 60,
                    borderRadius: 2,
                    bgcolor: 'secondary.main',
                    color: 'white'
                  }}
                >
                  <TrendingUp />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
          Your Assets
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: '0.95rem' }}>Token</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.95rem' }}>Balance</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.95rem' }}>Locked</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.95rem' }}>Available</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.95rem' }}>Value (USD)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {wallets.map((wallet) => {
                const available = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance || 0);
                const value = parseFloat(wallet.balance) * parseFloat(wallet.token?.currentPrice || 0);
                
                return (
                  <TableRow key={wallet.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.95rem' }}>
                          {wallet.token?.symbol}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.8rem' }}>
                          {wallet.token?.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.95rem' }}>{parseFloat(wallet.balance).toFixed(4)}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.95rem' }}>{parseFloat(wallet.lockedBalance || 0).toFixed(4)}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.95rem' }}>{available.toFixed(4)}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.95rem' }}>${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                );
              })}
              {wallets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <AccountBalanceWallet sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Your wallet is empty
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                        Add funds to start trading and earning passive income
                      </Typography>
                      <Button 
                        variant="contained" 
                        startIcon={<Add />}
                        onClick={handleOpenDeposit}
                        size="large"
                      >
                        Add Funds Now
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box sx={{ py: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        <strong>Tip:</strong> Add more assets to diversify your portfolio
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Recent Transactions
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Token</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} hover>
                  <TableCell>{new Date(tx.createdAt).toLocaleString()}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{tx.type}</TableCell>
                  <TableCell>{tx.token?.symbol}</TableCell>
                  <TableCell align="right">{parseFloat(tx.amount).toFixed(4)}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{tx.status}</TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Receipt sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        No transactions yet
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                        Your transaction history will appear here once you start trading
                      </Typography>
                      <Button 
                        variant="outlined" 
                        onClick={handleOpenDeposit}
                      >
                        Add Funds to Get Started
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Box sx={{ py: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Recent Deposit Status
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip 
                          label="Processing" 
                          color="warning" 
                          size="small" 
                          icon={<CircularProgress size={16} />} 
                        />
                        <Typography variant="body2">
                          <strong>BTC Deposit</strong> - 0.025 BTC - Estimated completion: 2 hours
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Deposit Dialog */}
      <Dialog open={depositDialog} onClose={handleCloseDialogs}>
        <DialogTitle>Deposit Tokens</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Token</InputLabel>
            <Select
              name="tokenId"
              value={formData.tokenId}
              onChange={handleChange}
              label="Token"
            >
              {tokens.map((token) => (
                <MenuItem key={token.id} value={token.id}>
                  {token.symbol} - {token.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Amount"
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleChange}
            required
            margin="normal"
            inputProps={{ step: '0.00000001' }}
          />
          <TextField
            fullWidth
            label="Transaction Hash (Optional)"
            name="txHash"
            value={formData.txHash}
            onChange={handleChange}
            margin="normal"
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            For demo purposes, tokens will be credited immediately.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleDeposit} variant="contained" disabled={!formData.tokenId || !formData.amount}>
            Deposit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialog} onClose={handleCloseDialogs}>
        <DialogTitle>Withdraw Tokens</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Token</InputLabel>
            <Select
              name="tokenId"
              value={formData.tokenId}
              onChange={handleChange}
              label="Token"
            >
              {tokens.map((token) => (
                <MenuItem key={token.id} value={token.id}>
                  {token.symbol} - {token.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Amount"
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleChange}
            required
            margin="normal"
            inputProps={{ step: '0.00000001' }}
          />
          <TextField
            fullWidth
            label="Withdrawal Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            margin="normal"
          />
          <Alert severity="warning" sx={{ mt: 2 }}>
            Please double-check the withdrawal address. Transactions cannot be reversed.
          </Alert>
          {ttxInfo && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Fee tier: {ttxInfo?.currentTier?.tierName || ttxInfo?.currentTier?.name || 'Standard'} · Discount: {Number(ttxInfo?.discountPercent ?? 0).toFixed(2)}%
              {ttxInfo?.nextTier && (
                <>
                  <br />
                  Next tier: {ttxInfo.nextTier.tierName} in {Number(ttxInfo.nextTier.ttxNeeded ?? 0).toLocaleString()} TTX
                </>
              )}
            </Alert>
          )}
          {withdrawCheck && (
            withdrawCheck.allowed ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                {withdrawCheck.message || 'Withdrawal allowed'}
                {withdrawCheck.delayHours > 0 && ` · Processes after ${withdrawCheck.delayHours}h`}
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mt: 2 }}>
                {withdrawCheck.reason || 'Withdrawal not allowed'}
                {typeof withdrawCheck.remaining !== 'undefined' && ` · Remaining allowance: $${Number(withdrawCheck.remaining).toFixed(2)}`}
                {typeof withdrawCheck.recommendedMax !== 'undefined' && (
                  <>
                    <br />
                    Recommended max: ${Number(withdrawCheck.recommendedMax ?? 0).toFixed(2)}
                  </>
                )}
              </Alert>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button
            onClick={handleWithdraw}
            variant="contained"
            color="error"
            disabled={
              !formData.tokenId || !formData.amount || !formData.address ||
              (withdrawCheck && withdrawCheck.allowed === false)
            }
          >
            Withdraw
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
