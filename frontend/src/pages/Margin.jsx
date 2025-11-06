import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, TextField, Button, Alert, Divider, Checkbox, FormControlLabel } from '@mui/material';
import api from '../services/api';

export default function Margin() {
  const [config, setConfig] = useState(null);
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('30');
  const [loanMessage, setLoanMessage] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMessage, setRepayMessage] = useState('');
  const [lastLoanId, setLastLoanId] = useState('');
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/margin/config');
        if (data.success) setConfig(data.config);
      } catch {
        // fallback UI
      }
    })();
  }, []);

  const apr = config?.baseAPR || 0.12;
  const calcInterest = () => {
    const principal = parseFloat(amount) || 0;
    const d = parseInt(days, 10) || 0;
    const interest = principal * apr * (d / 365);
    return { interest, total: principal + interest };
  };

  const handleBorrow = async () => {
    setLoanMessage('');
    try {
      const { data } = await api.post('/margin/borrow', { amount: parseFloat(amount), token: 'USDT' });
      if (data.success) {
        setLastLoanId(data.loan.id);
        setLoanMessage(`${data.message} APR: ${(apr * 100).toFixed(2)}% | Loan ID: ${data.loan.id}`);
      }
    } catch (err) {
      setLoanMessage(err.response?.data?.error || 'Borrow failed');
    }
  };

  const handleRepay = async () => {
    setRepayMessage('');
    try {
      const { data } = await api.post('/margin/repay', { amount: parseFloat(repayAmount), loanId: lastLoanId || 'loan_demo' });
      if (data.success) setRepayMessage(data.message);
    } catch (err) {
      setRepayMessage(err.response?.data?.error || 'Repay failed');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Margin</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Borrow Limits & Risk</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography>Max Leverage: {config?.maxLeverage || 3}x</Typography>
            <Typography>Base APR: {(apr * 100).toFixed(2)}%</Typography>
            <Box sx={{ mt: 1 }}>
              {(config?.tiers || []).map(t => (
                <Typography key={t.level}>{t.level}: APR {(t.apr * 100).toFixed(2)}% • Max ${t.maxBorrowUSD.toLocaleString()}</Typography>
              ))}
            </Box>
            <Box sx={{ mt: 2 }}>
              {(config?.riskNotices || []).map((n, i) => (
                <Alert key={i} severity="warning" sx={{ mb: 1 }}>{n}</Alert>
              ))}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Interest Calculator</Typography>
            <Divider sx={{ my: 1 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="Borrow Amount (USDT)" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Days" value={days} onChange={(e) => setDays(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">
                  Interest: {calcInterest().interest.toFixed(2)} • Total Due: {calcInterest().total.toFixed(2)}
                </Alert>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={riskAcknowledged} 
                    onChange={(e) => setRiskAcknowledged(e.target.checked)}
                    sx={{ color: '#ff3366', '&.Mui-checked': { color: '#00ff88' } }}
                  />
                }
                label="I understand the risks and liquidation terms"
                sx={{ color: '#9ca3af', fontSize: '12px' }}
              />
              <Button 
                variant="contained" 
                onClick={handleBorrow}
                disabled={!riskAcknowledged || !amount || parseFloat(amount) <= 0}
                sx={{ opacity: !riskAcknowledged ? 0.5 : 1 }}
              >
                Borrow
              </Button>
            </Box>
            {loanMessage && <Alert sx={{ mt: 2 }} severity={loanMessage.includes('failed') ? 'error' : 'success'}>{loanMessage}</Alert>}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">Repay</Typography>
            <Grid container spacing={2}>
              <Grid item xs={8}>
                <TextField fullWidth label="Repay Amount (USDT)" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} />
              </Grid>
              <Grid item xs={4}>
                <Button variant="outlined" fullWidth onClick={handleRepay}>Repay</Button>
              </Grid>
            </Grid>
            {repayMessage && <Alert sx={{ mt: 2 }} severity={repayMessage.includes('failed') ? 'error' : 'success'}>{repayMessage}</Alert>}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
