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
  Alert
} from '@mui/material';
import { AccountBalanceWallet, TrendingUp } from '@mui/icons-material';
import { toast } from 'react-toastify';

import { fetchWallet, deposit, withdraw, fetchTransactions } from '../store/slices/walletSlice';
import { fetchTokens } from '../store/slices/tokensSlice';
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

  useEffect(() => {
    dispatch(fetchWallet());
    dispatch(fetchTokens());
    dispatch(fetchTransactions({ limit: 20 }));
    // Load TTX fee tier info
    (async () => {
      try {
        const res = await api.get('/wallet/ttx/fee-info');
        setTtxInfo(res.data.data);
      } catch {}
    })();
  }, [dispatch]);

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
      await dispatch(withdraw({
        tokenId: formData.tokenId,
        amount: parseFloat(formData.amount),
        address: formData.address
      })).unwrap();
      toast.success('Withdrawal request submitted!');
      handleCloseDialogs();
      dispatch(fetchWallet());
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || 'Withdrawal failed');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Wallet
        </Typography>
        <Box>
          <Button variant="contained" onClick={handleOpenDeposit} sx={{ mr: 2 }}>
            Deposit
          </Button>
          <Button variant="outlined" onClick={handleOpenWithdraw}>
            Withdraw
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Total Portfolio Value
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
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
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Active Assets
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
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
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Your Assets
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Token</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell align="right">Locked</TableCell>
                <TableCell align="right">Available</TableCell>
                <TableCell align="right">Value (USD)</TableCell>
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
                        <Typography variant="body2" fontWeight="600">
                          {wallet.token?.symbol}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {wallet.token?.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{parseFloat(wallet.balance).toFixed(4)}</TableCell>
                    <TableCell align="right">{parseFloat(wallet.lockedBalance || 0).toFixed(4)}</TableCell>
                    <TableCell align="right">{available.toFixed(4)}</TableCell>
                    <TableCell align="right">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                );
              })}
              {wallets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No assets found
                    </Typography>
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
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No transactions found
                    </Typography>
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
