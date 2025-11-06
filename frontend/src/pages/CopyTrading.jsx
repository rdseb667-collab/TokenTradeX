import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, Button, Switch, FormControlLabel, Alert, Divider } from '@mui/material';
import api from '../services/api';

export default function CopyTrading() {
  const [providers, setProviders] = useState([]);
  const [autoCopy, setAutoCopy] = useState(() => {
    const saved = localStorage.getItem('copyTradingAutoCopy');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [message, setMessage] = useState('');
  const [subscriptions, setSubscriptions] = useState(() => {
    const saved = localStorage.getItem('copyTradingSubscriptions');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/copy-trading/providers');
        if (data.success) setProviders(data.providers);
      } catch {
        // noop
      }
    })();
  }, []);

  const subscribe = async (providerId) => {
    setMessage('');
    try {
      const { data } = await api.post('/copy-trading/subscribe', { providerId, autoCopy });
      if (data.success) {
        setMessage(data.message);
        const newSubs = { ...subscriptions, [providerId]: true };
        setSubscriptions(newSubs);
        localStorage.setItem('copyTradingSubscriptions', JSON.stringify(newSubs));
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Subscribe failed');
    }
  };

  const unsubscribe = async (providerId) => {
    setMessage('');
    try {
      const { data } = await api.post('/copy-trading/unsubscribe', { providerId });
      if (data.success) {
        setMessage(data.message);
        const newSubs = { ...subscriptions };
        delete newSubs[providerId];
        setSubscriptions(newSubs);
        localStorage.setItem('copyTradingSubscriptions', JSON.stringify(newSubs));
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unsubscribe failed');
    }
  };

  const copySampleOrder = async (providerId) => {
    setMessage('');
    try {
      const { data } = await api.post('/copy-trading/copy-order', { providerId, tokenSymbol: 'BTC', side: 'BUY', amount: 0.01 });
      if (data.success) setMessage(data.message);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Copy order failed');
    }
  };

  const handleAutoCopyToggle = (e) => {
    const newValue = e.target.checked;
    setAutoCopy(newValue);
    localStorage.setItem('copyTradingAutoCopy', JSON.stringify(newValue));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Copy Trading</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControlLabel
          control={<Switch checked={autoCopy} onChange={handleAutoCopyToggle} />}
          label="Enable Auto-Copy"
        />
        <Typography variant="body2" color="text.secondary">
          Auto-copy will mirror trades from subscribed providers proportionally to your wallet balance.
        </Typography>
      </Paper>

      {message && <Alert sx={{ mb: 2 }} severity={message.includes('failed') ? 'error' : 'success'}>{message}</Alert>}

      <Grid container spacing={2}>
        {providers.map((p) => (
          <Grid item xs={12} md={4} key={p.id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">{p.name}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography>24h: {p.performance24h}%</Typography>
              <Typography>30d: {p.performance30d}%</Typography>
              <Typography>Followers: {p.followers}</Typography>
              <Typography>Monthly Fee: ${p.feeMonthlyUSD}</Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {subscriptions[p.id] ? (
                  <>
                    <Button variant="outlined" disabled sx={{ bgcolor: 'rgba(0,255,136,0.1)', borderColor: '#00ff88', color: '#00ff88' }}>
                      ✓ Subscribed
                    </Button>
                    <Button variant="outlined" onClick={() => unsubscribe(p.id)}>Unsubscribe</Button>
                  </>
                ) : (
                  <Button variant="contained" onClick={() => subscribe(p.id)}>Subscribe</Button>
                )}
                <Button variant="text" onClick={() => copySampleOrder(p.id)} disabled={!subscriptions[p.id]}>Copy Sample BUY</Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
