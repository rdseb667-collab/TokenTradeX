import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert
} from '@mui/material';
import { toast } from 'react-toastify';

import { login } from '../store/slices/authSlice';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await dispatch(login(formData)).unwrap();
      toast.success('Login successful!');
      // Navigate to app dashboard
      navigate('/app/dashboard');
    } catch (err) {
      toast.error(err || 'Login failed');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2
          }}
        >
          <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
            TokenTradeX
          </Typography>
          <Typography variant="h6" align="center" gutterBottom sx={{ mb: 3 }}>
            Sign in to your account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              margin="normal"
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              margin="normal"
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link to="/register" style={{ color: '#00e676', textDecoration: 'none' }}>
                  Sign up
                </Link>
              </Typography>
            </Box>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" display="block" gutterBottom>
                <strong>Demo Credentials:</strong>
              </Typography>
              <Typography variant="caption" display="block">
                Email: demo@tokentradex.com
              </Typography>
              <Typography variant="caption" display="block">
                Password: Demo123!
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
