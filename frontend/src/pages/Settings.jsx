import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Divider,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  Person,
  Security,
  VpnKey,
  Tune,
  QrCode2,
  ContentCopy,
  Delete
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Settings() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || ''
  });

  // Security state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState(null);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);

  // API Keys state
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState(null);

  // Preferences state
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    currency: 'USD',
    emailNotifications: true,
    tradingNotifications: true
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Profile handlers
  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      await api.put('/auth/profile', profile);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Security handlers
  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      await api.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate2FA = async () => {
    try {
      setLoading(true);
      const response = await api.post('/auth/2fa/generate');
      setQrCode(response.data.qrCode);
      setTwoFactorSecret(response.data.secret);
      setBackupCodes(response.data.backupCodes || []);
      setShow2FADialog(true);
    } catch (error) {
      toast.error('Failed to generate 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      await api.post('/auth/2fa/enable', {
        secret: twoFactorSecret,
        token: twoFactorToken
      });
      toast.success('2FA enabled successfully! Save your backup codes.');
      setShow2FADialog(false);
      setTwoFactorToken('');
      // Refresh user data
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid 2FA token');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const token = prompt('Enter your 2FA code to disable:');
    if (!token) return;
    
    try {
      setLoading(true);
      await api.post('/auth/2fa/disable', { token });
      toast.success('2FA disabled');
      window.location.reload();
    } catch (error) {
      toast.error('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  // API Keys handlers
  const fetchApiKeys = async () => {
    try {
      const response = await api.get('/api-keys');
      setApiKeys(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }
    try {
      setLoading(true);
      const response = await api.post('/api-keys', { name: newKeyName });
      setNewApiKey(response.data.data);
      setShowNewKeyDialog(true);
      setNewKeyName('');
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApiKey = async (keyId) => {
    if (!window.confirm('Delete this API key? This cannot be undone.')) return;
    
    try {
      await api.delete(`/api-keys/${keyId}`);
      toast.success('API key deleted');
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Load API keys on mount
  useState(() => {
    if (tabValue === 2) {
      fetchApiKeys();
    }
  }, [tabValue]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<Person />} label="Profile" />
          <Tab icon={<Security />} label="Security" />
          <Tab icon={<VpnKey />} label="API Keys" />
          <Tab icon={<Tune />} label="Preferences" />
        </Tabs>

        {/* Profile Tab */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={3}>
            <TextField
              label="First Name"
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Last Name"
              value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Username"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              value={user?.email}
              disabled
              fullWidth
              helperText="Contact support to change email"
            />
            <Button
              variant="contained"
              onClick={handleUpdateProfile}
              disabled={loading}
              sx={{ alignSelf: 'flex-start' }}
            >
              Update Profile
            </Button>
          </Stack>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={4}>
            {/* Change Password */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField
                  label="Current Password"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="New Password"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={handleChangePassword}
                  disabled={loading}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Change Password
                </Button>
              </Stack>
            </Box>

            <Divider />

            {/* Two-Factor Authentication */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Two-Factor Authentication (2FA)
              </Typography>
              {user?.twoFactorEnabled ? (
                <Alert severity="success" sx={{ mt: 2 }}>
                  2FA is enabled. Your account is protected.
                  <Button
                    size="small"
                    color="error"
                    onClick={handleDisable2FA}
                    sx={{ ml: 2 }}
                  >
                    Disable 2FA
                  </Button>
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  2FA is not enabled. Enable it to secure privileged operations.
                  <Button
                    size="small"
                    onClick={handleGenerate2FA}
                    sx={{ ml: 2 }}
                  >
                    Enable 2FA
                  </Button>
                </Alert>
              )}
            </Box>
          </Stack>
        </TabPanel>

        {/* API Keys Tab */}
        <TabPanel value={tabValue} index={2}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Create New API Key
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <TextField
                  label="Key Name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Trading Bot"
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  variant="contained"
                  onClick={handleCreateApiKey}
                  disabled={loading}
                >
                  Create Key
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom>
                Your API Keys
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Key</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {apiKeys.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No API keys yet. Create one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      apiKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell>{key.name}</TableCell>
                          <TableCell>
                            {key.key.substring(0, 20)}...
                            <IconButton size="small" onClick={() => copyToClipboard(key.key)}>
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={key.status}
                              color={key.status === 'active' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(key.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleDeleteApiKey(key.id)}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        </TabPanel>

        {/* Preferences Tab */}
        <TabPanel value={tabValue} index={3}>
          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.emailNotifications}
                  onChange={(e) =>
                    setPreferences({ ...preferences, emailNotifications: e.target.checked })
                  }
                />
              }
              label="Email Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.tradingNotifications}
                  onChange={(e) =>
                    setPreferences({ ...preferences, tradingNotifications: e.target.checked })
                  }
                />
              }
              label="Trading Notifications"
            />
            <TextField
              select
              label="Preferred Currency"
              value={preferences.currency}
              onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </TextField>
            <Alert severity="info">
              More preferences coming soon...
            </Alert>
          </Stack>
        </TabPanel>
      </Paper>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FADialog} onClose={() => setShow2FADialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              Scan this QR code with Google Authenticator or Authy
            </Alert>
            {qrCode && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <img src={qrCode} alt="2FA QR Code" style={{ maxWidth: '100%' }} />
              </Box>
            )}
            <TextField
              label="Enter 6-digit code"
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value)}
              fullWidth
              placeholder="123456"
            />
            {backupCodes.length > 0 && (
              <Alert severity="warning">
                <Typography variant="subtitle2" gutterBottom>
                  Save these backup codes:
                </Typography>
                <Box sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {backupCodes.map((code, i) => (
                    <div key={i}>{code}</div>
                  ))}
                </Box>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShow2FADialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEnable2FA} disabled={loading}>
            Enable 2FA
          </Button>
        </DialogActions>
      </Dialog>

      {/* New API Key Dialog */}
      <Dialog open={showNewKeyDialog} onClose={() => setShowNewKeyDialog(false)}>
        <DialogTitle>API Key Created</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Save this key now! You won't be able to see it again.
          </Alert>
          <TextField
            label="API Key"
            value={newApiKey?.key || ''}
            fullWidth
            InputProps={{
              readOnly: true,
              endAdornment: (
                <IconButton onClick={() => copyToClipboard(newApiKey?.key)}>
                  <ContentCopy />
                </IconButton>
              )
            }}
          />
          <TextField
            label="API Secret"
            value={newApiKey?.secret || ''}
            fullWidth
            sx={{ mt: 2 }}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <IconButton onClick={() => copyToClipboard(newApiKey?.secret)}>
                  <ContentCopy />
                </IconButton>
              )
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewKeyDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
