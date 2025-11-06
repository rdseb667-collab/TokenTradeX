import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchTokens = createAsyncThunk('tokens/fetchTokens', async () => {
  const response = await api.get('/tokens');
  return response.data.data;
});

export const fetchTokenById = createAsyncThunk('tokens/fetchTokenById', async (id) => {
  const response = await api.get(`/tokens/${id}`);
  return response.data.data;
});

export const fetchOrderBook = createAsyncThunk('tokens/fetchOrderBook', async (id) => {
  const response = await api.get(`/tokens/${id}/orderbook`);
  return response.data.data;
});

const tokensSlice = createSlice({
  name: 'tokens',
  initialState: {
    list: [],
    selectedToken: null,
    orderBook: null,
    loading: false,
    error: null
  },
  reducers: {
    setSelectedToken: (state, action) => {
      state.selectedToken = action.payload;
    },
    updateTokenPrice: (state, action) => {
      const { tokenId, price, priceChange24h } = action.payload;
      const token = state.list.find(t => t.id === tokenId);
      if (token) {
        token.currentPrice = price;
        token.priceChange24h = priceChange24h;
      }
      if (state.selectedToken?.id === tokenId) {
        state.selectedToken.currentPrice = price;
        state.selectedToken.priceChange24h = priceChange24h;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTokens.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTokens.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchTokens.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchTokenById.fulfilled, (state, action) => {
        state.selectedToken = action.payload;
      })
      .addCase(fetchOrderBook.fulfilled, (state, action) => {
        state.orderBook = action.payload;
      });
  }
});

export const { setSelectedToken, updateTokenPrice } = tokensSlice.actions;
export default tokensSlice.reducer;
