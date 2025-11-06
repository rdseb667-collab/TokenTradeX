import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Component } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@mui/material';

import { fetchCurrentUser } from './store/slices/authSlice';
import websocket from './services/websocket';

import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Wallet from './pages/Wallet';
import Orders from './pages/Orders';
import Admin from './pages/Admin';
import Subscriptions from './pages/Subscriptions';
import UserEarnings from './pages/UserEarnings';
import WhaleWatch from './pages/WhaleWatch';
import RWAMarketplace from './pages/RWAMarketplace';
import FractionalShares from './pages/FractionalShares';
import AutomationDashboard from './pages/AutomationDashboard';
import Staking from './pages/Staking';
import SyntheticPositions from './pages/SyntheticPositions';
import DividendLottery from './pages/DividendLottery';
import Settings from './pages/Settings';
import Margin from './pages/Margin';
import CopyTrading from './pages/CopyTrading';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import RWAAssetManager from './pages/admin/RWAAssetManager';
import FractionalControls from './pages/admin/FractionalControls';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

// Error Boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, color: 'white', bgcolor: '#0a0e14', minHeight: '100vh' }}>
          <h1>Something went wrong</h1>
          <pre style={{ color: '#ff3366' }}>{this.state.error?.toString()}</pre>
          <pre style={{ color: '#9ca3af', fontSize: '12px' }}>{this.state.error?.stack}</pre>
          <button onClick={() => window.location.reload()} style={{ mt: 2, p: 2 }}>
            Reload Page
          </button>
        </Box>
      );
    }
    return this.props.children;
  }
}

function PrivateRoute({ children }) {
  const { token } = useSelector((state) => state.auth);
  return token ? children : <Navigate to="/login" />;
}

function App() {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      dispatch(fetchCurrentUser());
      websocket.connect();
    }

    return () => {
      websocket.disconnect();
    };
  }, [token, dispatch]);

  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* PROTECTED ROUTES - Require login */}
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trading" element={<Trading />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="staking" element={<Staking />} />
          <Route path="synthetic-positions" element={<SyntheticPositions />} />
          <Route path="dividend-lottery" element={<DividendLottery />} />
          <Route path="orders" element={<Orders />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="my-earnings" element={<UserEarnings />} />
          <Route path="settings" element={<Settings />} />
          <Route path="margin" element={<Margin />} />
          <Route path="copy-trading" element={<CopyTrading />} />
          
          {/* Admin Routes - Protected */}
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/rwa-assets" element={<RWAAssetManager />} />
          <Route path="admin/fractional" element={<FractionalControls />} />
          <Route path="admin/automation" element={<AutomationDashboard />} />
          <Route path="admin/audit-logs" element={<AdminAuditLogs />} />
        </Route>
      
        {/* Public Routes */}
        <Route path="/whale-watch" element={<WhaleWatch />} />
        <Route path="/rwa-marketplace" element={<RWAMarketplace />} />
        <Route path="/fractional-shares" element={<FractionalShares />} />
      </Routes>
    </Box>
    </ErrorBoundary>
  );
}

export default App;
