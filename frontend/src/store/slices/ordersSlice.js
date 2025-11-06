import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchOrders = createAsyncThunk('orders/fetchOrders', async (params = {}) => {
  const response = await api.get('/orders', { params });
  return response.data.data;
});

export const createOrder = createAsyncThunk('orders/createOrder', async (orderData) => {
  const response = await api.post('/orders', orderData);
  return response.data.data;
});

export const cancelOrder = createAsyncThunk('orders/cancelOrder', async (orderId) => {
  const response = await api.delete(`/orders/${orderId}`);
  return response.data.data;
});

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    list: [],
    loading: false,
    error: null,
    creating: false
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addOrder: (state, action) => {
      state.list.unshift(action.payload);
    },
    updateOrder: (state, action) => {
      const index = state.list.findIndex(o => o.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createOrder.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.creating = false;
        state.list.unshift(action.payload);
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.creating = false;
        state.error = action.error.message;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        const index = state.list.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      });
  }
});

export const { clearError, addOrder, updateOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
