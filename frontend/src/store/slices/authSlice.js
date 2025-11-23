import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    console.log('🔐 Attempting login with:', { email: credentials.email, has2FA: !!credentials.twoFactorToken });
    const response = await api.post('/auth/login', credentials);
    console.log('✅ Login response:', response.data);
    
    // Check if 2FA is required
    if (response.data?.requires2FA === true) {
      console.log('🔐 2FA Required');
      return rejectWithValue('2FA_REQUIRED');
    }
    
    // Normal login success
    localStorage.setItem('token', response.data.data.token);
    return response.data.data;
  } catch (err) {
    console.error('❌ Login failed:', {
      status: err?.response?.status,
      message: err?.response?.data?.message,
      errors: err?.response?.data?.errors,
      fullData: err?.response?.data
    });
    return rejectWithValue(err?.response?.data?.message || 'Login failed');
  }
});

export const register = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const response = await api.post('/auth/register', userData);
    localStorage.setItem('token', response.data.data.token);
    return response.data.data;
  } catch (err) {
    return rejectWithValue(err?.response?.data?.message || 'Registration failed');
  }
});

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/auth/me');
    return response.data.data;
  } catch (err) {
    return rejectWithValue(err?.response?.data?.message || 'Failed to fetch user');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token'),
    loading: false,
    error: null
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
        // Don't clear token on /auth/me failure - only logout should do that
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
