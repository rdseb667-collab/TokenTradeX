import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
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
  Divider
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
  Warning,
  Public,
  TrendingUp,
  AutoMode,
  AccountBalance,
  EmojiEvents,
  PieChart,
  Settings
} from '@mui/icons-material';

import { logout } from '../store/slices/authSlice';

const drawerWidth = 240;

// USER MENU - Optimized for trading & tracking
const userMenuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/app/dashboard' },
  { text: 'Trading', icon: <ShowChart />, path: '/app/trading' },
  { text: 'Staking', icon: <AccountBalance />, path: '/app/staking', highlight: true },
  { text: 'Synthetic Positions', icon: <PieChart />, path: '/app/synthetic-positions', highlight: true },
  { text: 'Dividend Lottery', icon: <EmojiEvents />, path: '/app/dividend-lottery', highlight: true },
  { text: 'Fractional Shares', icon: <TrendingUp />, path: '/fractional-shares', highlight: true, external: true },
  { text: 'RWA Marketplace', icon: <Public />, path: '/rwa-marketplace', highlight: true, external: true },
  { text: 'Wallet', icon: <AccountBalanceWallet />, path: '/app/wallet' },
  { text: 'My Earnings', icon: <MonetizationOn />, path: '/app/my-earnings', highlight: true },
  { text: 'Orders', icon: <Receipt />, path: '/app/orders' },
  { text: 'Subscriptions', icon: <CardMembership />, path: '/app/subscriptions' },
  { text: 'Margin', icon: <AttachMoney />, path: '/app/margin', highlight: true },
  { text: 'Copy Trading', icon: <Stars />, path: '/app/copy-trading', highlight: true },
  { text: 'Settings', icon: <Settings />, path: '/app/settings' },
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
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

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
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Welcome, {user?.firstName || user?.username}
          </Typography>
          <IconButton onClick={handleMenuOpen}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
          </IconButton>
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
        </Toolbar>
      </AppBar>
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
          mt: 8
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
