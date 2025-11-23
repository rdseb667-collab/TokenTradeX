import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api'
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    // Handle specific error codes from backend
    const { response } = error;
    const { data } = response;
    
    // Map backend error codes to user-friendly messages
    const errorMessages = {
      'INVALID_MARKET': 'Invalid market selected. Please choose a valid trading pair.',
      'INVALID_SIZE': 'Invalid order size. Please check the minimum and maximum limits.',
      'INVALID_PRICE': 'Invalid price. Please enter a valid price.',
      'MAX_NOTIONAL_EXCEEDED': 'Order size exceeds maximum allowed limit.',
      'INSUFFICIENT_FUNDS': 'Insufficient funds for this transaction.',
      'DAILY_WITHDRAWAL_LIMIT_REACHED': 'Daily withdrawal limit reached. Please try again tomorrow.',
      'ALREADY_PROCESSED': 'This transaction has already been processed.',
      'MISSING_FIELDS': 'Required fields are missing. Please fill in all required information.',
      'INVALID_AMOUNT': 'Invalid amount. Please enter a valid number.',
      'INVALID_ADDRESS': 'Invalid withdrawal address. Please check and try again.',
      'TOKEN_NOT_FOUND': 'Token not found. Please select a valid token.',
      'WALLET_NOT_FOUND': 'Wallet not found. Please contact support.',
      'WITHDRAWAL_LIMIT_EXCEEDED': 'Withdrawal limit exceeded for your account tier.',
      'CANNOT_ASSIGN_SUPER_ADMIN': 'Cannot assign super admin role through this endpoint.',
      'INVALID_ROLE': 'Invalid role selected.',
      'USER_NOT_FOUND': 'User not found.',
      'MISSING_REASON': 'Reason is required for rejection.',
      'ERROR_UPDATING_USER_ROLE': 'Error updating user role. Please try again.',
      'ERROR_UPDATING_USER_STATUS': 'Error updating user status. Please try again.',
      'ERROR_FETCHING_TRANSACTIONS': 'Error fetching transaction history. Please try again.',
      'ERROR_FETCHING_AUDIT_LOGS': 'Error fetching audit logs. Please try again.',
      'ERROR_FETCHING_FEE_METRICS': 'Error fetching fee metrics. Please try again.'
    };

    // Show user-friendly error message
    if (data && data.message && errorMessages[data.message]) {
      toast.error(errorMessages[data.message]);
    } else if (data && data.error) {
      toast.error(data.error);
    } else if (data && data.message) {
      toast.error(data.message);
    } else {
      toast.error('An unexpected error occurred. Please try again.');
    }

    return Promise.reject(error);
  }
);

export default api;