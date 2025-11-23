import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchOrders = createAsyncThunk('orders/fetchOrders', async (params = {}) => {
  const response = await api.get('/orders', { params });
  return response.data.data;
});

export const createOrder = createAsyncThunk('orders/createOrder', async (orderData, { rejectWithValue }) => {
  console.log('📤 REDUX createOrder called with:', orderData);
  try {
    const response = await api.post('/orders', orderData);
    console.log('✅ REDUX createOrder success:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ REDUX createOrder failed:', error);
    console.error('❌ Error response:', error.response);
    console.error('❌ Error data:', error.response?.data);
    console.error('❌ Validation errors:', error.response?.data?.errors);
    
    // Extract detailed error message
    let message = error.response?.data?.message || error.message || 'Failed to create order';
    
    // If there are validation errors, append them to the message
    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const validationErrors = error.response.data.errors.map(err => {
        if (typeof err === 'string') return err;
        if (err.msg) return `${err.param || 'Field'}: ${err.msg}`;
        return JSON.stringify(err);
      }).join(', ');
      message = `${message}: ${validationErrors}`;
      console.error('🔍 VALIDATION ERRORS:', validationErrors);
    }
    
    // Return the backend error message properly
    return rejectWithValue({ message, ...error.response?.data });
  }
});

export const cancelOrder = createAsyncThunk('orders/cancelOrder', async (orderId) => {
  const response = await api.delete(`/orders/${orderId}`);
  return response.data.data;
});

export const updateOrder = createAsyncThunk('orders/updateOrder', async ({ orderId, updates }, { rejectWithValue }) => {
  try {
    console.log('🔄 UPDATE ORDER:', { orderId, updates });
    const response = await api.patch(`/orders/${orderId}`, updates);
    console.log('✅ UPDATE SUCCESS:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ UPDATE FAILED:', error);
    console.error('❌ Error response:', error.response);
    const message = error.response?.data?.message || error.message || 'Failed to update order';
    return rejectWithValue({ message });
  }
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
    updateOrderInList: (state, action) => {
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
        state.error = action.payload?.message || action.error.message;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        const index = state.list.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(updateOrder.fulfilled, (state, action) => {
        const index = state.list.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      });
  }
});

export const { clearError, addOrder, updateOrderInList } = ordersSlice.actions;
export default ordersSlice.reducer;
