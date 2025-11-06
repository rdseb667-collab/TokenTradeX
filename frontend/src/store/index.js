import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tokensReducer from './slices/tokensSlice';
import ordersReducer from './slices/ordersSlice';
import walletReducer from './slices/walletSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    tokens: tokensReducer,
    orders: ordersReducer,
    wallet: walletReducer
  }
});

export default store;
