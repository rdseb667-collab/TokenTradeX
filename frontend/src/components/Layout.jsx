import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Button,
  Chip,
  Select,
  MenuItem as SelectMenuItem
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  ShowChart,
  AccountBalanceWallet,
  Receipt,
  AccountCircle,
  AdminPanelSettings,
  Stars,
  AttachMoney,
  Cached,
  Rocket,
  CardMembership,
  MonetizationOn,
  LocalAtm,
  Warning,
  Public,
  TrendingUp,
  AutoMode,
  AccountBalance,
  EmojiEvents,
  PieChart,
  Settings,
  HelpOutline,
  Add
} from '@mui/icons-material';

import { logout } from '../store/slices/authSlice';
import AddFundsModal from './AddFundsModal';

const drawerWidth = 240;

// USER MENU - Simplified core items
const userMenuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/app/dashboard' },
  { text: 'Trading', icon: <ShowChart />, path: '/app/trading' },
  { text: 'Wallet', icon: <AccountBalanceWallet />, path: '/app/wallet' },
  { text: 'Orders', icon: <Receipt />, path: '/app/orders' },
  { text: 'My Earnings', icon: <MonetizationOn />, path: '/app/my-earnings', highlight: true },
  { text: 'Volume Rebates', icon: <LocalAtm />, path: '/app/volume-rebates', highlight: true },
  { text: '💰 Revenue Streams', icon: <AttachMoney />, path: '/app/revenue-streams', highlight: true },
  { text: 'Settings', icon: <Settings />, path: '/app/settings' },
  { text: 'Help Center', icon: <HelpOutline />, path: '/app/help' },
];

// ADMIN MENU - Extensive RWA & platform management
const adminMenuItems = [
  { text: 'Admin Control Center', icon: <AdminPanelSettings />, path: '/app/admin', isHeader: true },
  { text: 'Audit Logs', icon: <Receipt />, path: '/app/admin/audit-logs', highlight: true },
  { text: 'RWA Asset Manager', icon: <Public />, path: '/app/admin/rwa-assets', highlight: true },
  { text: 'Fractional Controls', icon: <TrendingUp />, path: '/app/admin/fractional', highlight: true },
  { text: 'Automation Hub', icon: <AutoMode />, path: '/app/admin/automation', highlight: true },
  { text: 'Whale Watch Monitor', icon: <Warning />, path: '/whale-watch', external: true },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [addFundsOpen, setAddFundsOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, color: 'primary.main' }}>
          TokenTradeX
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {userMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton 
                onClick={() => navigate(item.path)}
                sx={{
                  backgroundColor: item.revolutionary 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : item.highlight 
                    ? 'rgba(102, 126, 234, 0.1)' 
                    : 'transparent',
                  color: item.revolutionary ? 'white' : 'inherit',
                  fontWeight: item.revolutionary ? 900 : 'normal',
                  border: item.revolutionary ? '2px solid #FFD700' : 'none',
                  borderRadius: item.revolutionary ? 2 : 0,
                  my: item.revolutionary ? 1 : 0,
                  '&:hover': {
                    backgroundColor: item.revolutionary
                      ? 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                      : item.highlight 
                      ? 'rgba(102, 126, 234, 0.2)' 
                      : 'action.hover',
                    transform: item.revolutionary ? 'scale(1.05)' : 'none',
                  }
                }}
              >
                <ListItemIcon sx={{ color: item.highlight ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    fontWeight: item.highlight ? 700 : 400,
                    color: item.highlight ? 'primary.main' : 'inherit'
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
      
      {/* ADMIN SECTION - Only visible to admin/super_admin users */}
      {(user?.role === 'admin' || user?.role === 'super_admin') && (
        <>
          <Divider sx={{ my: 2, borderColor: 'primary.main', borderWidth: 2 }} />
          <List>
            {adminMenuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton 
                  onClick={() => navigate(item.path)}
                  sx={{
                    backgroundColor: item.isHeader
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : item.highlight 
                      ? 'rgba(255, 215, 0, 0.1)' 
                      : 'transparent',
                    color: item.isHeader ? 'white' : 'inherit',
                    fontWeight: item.isHeader ? 900 : item.highlight ? 700 : 400,
                    border: item.isHeader ? '2px solid #FFD700' : 'none',
                    borderRadius: item.isHeader ? 2 : 0,
                    my: item.isHeader ? 1 : 0,
                    '&:hover': {
                      backgroundColor: item.isHeader
                        ? 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                        : item.highlight 
                        ? 'rgba(255, 215, 0, 0.2)' 
                        : 'action.hover',
                      transform: item.isHeader ? 'scale(1.02)' : 'none',
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: item.highlight ? '#FFD700' : item.isHeader ? 'white' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{ 
                      fontWeight: item.isHeader ? 900 : item.highlight ? 700 : 400,
                      color: item.highlight ? '#FFD700' : item.isHeader ? 'white' : 'inherit'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sticky Global Header */}
      <AppBar
        position="fixed"
        sx={{
          width: '100%',
          bgcolor: '#0a0e14',
          borderBottom: '1px solid #1f2937',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          zIndex: 1300
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
          {/* Left Section - Branding and Quick Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {/* TokenTradeX Branding */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 800, 
                  background: 'linear-gradient(45deg, #00aaff, #00ff88)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.5px'
                }}
              >
                TokenTradeX
              </Typography>
              <Chip 
                label="BETA" 
                size="small" 
                sx={{ 
                  height: '16px', 
                  borderRadius: 0,
                  bgcolor: 'rgba(0, 255, 136, 0.1)',
                  color: '#00ff88',
                  fontWeight: 700,
                  fontSize: '8px'
                }} 
              />
            </Box>
            
            {/* Quick Navigation */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
              <Button 
                size="small" 
                onClick={() => navigate('/app/trading')}
                sx={{ 
                  color: location.pathname.includes('trading') ? '#00ff88' : '#9ca3af',
                  fontWeight: 700,
                  fontSize: '12px',
                  textTransform: 'none',
                  minWidth: 0,
                  '&:hover': { color: '#00ff88' }
                }}
              >
                Trading
              </Button>
              <Button 
                size="small" 
                onClick={() => navigate('/app/dashboard')}
                sx={{ 
                  color: location.pathname.includes('dashboard') ? '#00ff88' : '#9ca3af',
                  fontWeight: 700,
                  fontSize: '12px',
                  textTransform: 'none',
                  minWidth: 0,
                  '&:hover': { color: '#00ff88' }
                }}
              >
                Dashboard
              </Button>
              <Button 
                size="small" 
                onClick={() => navigate('/app/wallet')}
                sx={{ 
                  color: location.pathname.includes('wallet') ? '#00ff88' : '#9ca3af',
                  fontWeight: 700,
                  fontSize: '12px',
                  textTransform: 'none',
                  minWidth: 0,
                  '&:hover': { color: '#00ff88' }
                }}
              >
                Wallet
              </Button>
            </Box>
          </Box>
          
          {/* Right Section - Network Indicator and User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Live Network Indicator */}
            <Chip 
              icon={<Public sx={{ color: '#00ff88 !important', fontSize: '14px !important' }} />}
              label="Mainnet"
              size="small" 
              sx={{ 
                height: '24px', 
                borderRadius: 0,
                bgcolor: 'rgba(0, 255, 136, 0.1)',
                color: '#00ff88',
                fontWeight: 700,
                fontSize: '10px',
                '& .MuiChip-icon': {
                  color: '#00ff88'
                }
              }} 
            />
            
            {/* Language Selector */}
            <Select
              value="EN"
              size="small"
              sx={{ 
                height: '24px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#9ca3af',
                '& .MuiSelect-select': { py: 0, pl: 1, pr: 2 },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1f2937' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00aaff' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00aaff' }
              }}
            >
              <SelectMenuItem value="EN">EN</SelectMenuItem>
              <SelectMenuItem value="ES">ES</SelectMenuItem>
              <SelectMenuItem value="ZH">中文</SelectMenuItem>
            </Select>
            
            {/* Add Funds Button */}
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={() => setAddFundsOpen(true)}
              size="small"
              sx={{ 
                bgcolor: 'success.main',
                '&:hover': { bgcolor: 'success.dark' },
                boxShadow: 2,
                textTransform: 'none',
                height: '24px',
                fontSize: '10px',
                fontWeight: 700
              }}
            >
              Add Funds
            </Button>
            
            {/* User Menu */}
            <IconButton onClick={handleMenuOpen} size="small">
              <Avatar sx={{ width: 24, height: 24, fontSize: '12px', bgcolor: 'primary.main' }}>
                {user?.username?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* User Menu Dropdown */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem disabled>
          <AccountCircle sx={{ mr: 1 }} />
          {user?.email}
        </MenuItem>
        <MenuItem disabled sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          Role: {user?.role}
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { navigate('/app/settings'); handleMenuClose(); }}>
          <Settings sx={{ mr: 1 }} />
          Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px' // Height of the new header
        }}
      >
        <Outlet />
      </Box>
      
      <AddFundsModal 
        open={addFundsOpen} 
        onClose={() => setAddFundsOpen(false)}
        onDepositSuccess={() => setAddFundsOpen(false)}
      />
    </Box>
  );
}
