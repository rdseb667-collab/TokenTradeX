import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchWallet = createAsyncThunk('wallet/fetchWallet', async () => {
  const response = await api.get('/wallet');
  return response.data.data;
});

export const fetchTransactions = createAsyncThunk('wallet/fetchTransactions', async (params = {}) => {
  const response = await api.get('/wallet/transactions', { params });
  return response.data.data;
});

export const deposit = createAsyncThunk('wallet/deposit', async (data) => {
  const response = await api.post('/wallet/deposit', data);
  return response.data.data;
});

export const withdraw = createAsyncThunk('wallet/withdraw', async (data) => {
  const response = await api.post('/wallet/withdraw', data);
  return response.data.data;
});

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    wallets: [],
    totalValue: 0,
    transactions: [],
    loading: false,
    error: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateWalletBalance: (state, action) => {
      const { tokenId, balance, lockedBalance } = action.payload;
      const wallet = state.wallets.find(w => w.tokenId === tokenId);
      if (wallet) {
        wallet.balance = balance;
        wallet.lockedBalance = lockedBalance;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallet.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.loading = false;
        state.wallets = action.payload.wallets;
        state.totalValue = action.payload.totalValue;
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload;
      })
      .addCase(deposit.fulfilled, (state, action) => {
        const wallet = state.wallets.find(w => w.tokenId === action.payload.wallet.tokenId);
        if (wallet) {
          wallet.balance = action.payload.wallet.balance;
        }
      })
      .addCase(withdraw.fulfilled, (state, action) => {
        const wallet = state.wallets.find(w => w.tokenId === action.payload.wallet.tokenId);
        if (wallet) {
          wallet.balance = action.payload.wallet.balance;
        }
      });
  }
});

export const { clearError, updateWalletBalance } = walletSlice.actions;
export default walletSlice.reducer;
