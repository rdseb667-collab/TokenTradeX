import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Typography
} from '@mui/material';
import { Security } from '@mui/icons-material';

export default function TwoFactorPrompt({ open, onClose, onSubmit, title, message }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!token || token.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    setError('');
    onSubmit(token);
  };

  const handleClose = () => {
    setToken('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Security color="primary" />
        {title || '2FA Verification Required'}
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          {message || 'This action requires two-factor authentication. Enter your 6-digit code from Google Authenticator.'}
        </Alert>
        <TextField
          autoFocus
          label="2FA Code"
          value={token}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setToken(value);
            setError('');
          }}
          fullWidth
          placeholder="123456"
          error={!!error}
          helperText={error}
          inputProps={{ maxLength: 6, style: { fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.5em' } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={token.length !== 6}>
          Verify
        </Button>
      </DialogActions>
    </Dialog>
  );
}
