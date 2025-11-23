import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid
} from '@mui/material';
import { Cancel, CheckCircle, Edit, Timeline } from '@mui/icons-material';
import { toast } from 'react-toastify';

import { fetchOrders, cancelOrder, updateOrder } from '../store/slices/ordersSlice';
import { fetchTokens } from '../store/slices/tokensSlice';

export default function Orders() {
  const dispatch = useDispatch();
  const { list: orders, loading } = useSelector((state) => state.orders);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    price: '',
    quantity: '',
    stopPrice: ''
  });

  useEffect(() => {
    dispatch(fetchOrders());
    dispatch(fetchTokens());
  }, [dispatch]);

  const handleOpenEditDialog = (order) => {
    setEditingOrder(order);
    setEditForm({
      price: order.price || '',
      quantity: order.quantity || '',
      stopPrice: order.stopPrice || ''
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingOrder(null);
    setEditForm({ price: '', quantity: '', stopPrice: '' });
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;

    try {
      const updates = {};
      
      if (editForm.price !== editingOrder.price) {
        updates.price = parseFloat(editForm.price);
      }
      
      if (editForm.quantity !== editingOrder.quantity) {
        updates.quantity = parseFloat(editForm.quantity);
      }
      
      if (editForm.stopPrice && editForm.stopPrice !== editingOrder.stopPrice) {
        updates.stopPrice = parseFloat(editForm.stopPrice);
      }

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to update');
        return;
      }

      await dispatch(updateOrder({ 
        orderId: editingOrder.id, 
        updates 
      })).unwrap();
      
      toast.success('Order updated successfully!');
      handleCloseEditDialog();
      dispatch(fetchOrders());
    } catch (err) {
      toast.error(err?.message || 'Failed to update order');
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await dispatch(cancelOrder(orderId)).unwrap();
      toast.success('Order cancelled successfully!');
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel order');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'filled':
        return 'success';
      case 'partial':
        return 'info';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'default';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Orders
      </Typography>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Order History
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Token</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Side</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Filled</TableCell>
                <TableCell align="right">Total Value</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => {
                const canCancel = ['pending', 'partial'].includes(order.status);
                const fillPercentage = (parseFloat(order.filledQuantity) / parseFloat(order.quantity) * 100).toFixed(0);
                
                return (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString()}
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="600">
                          {order.token?.symbol}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {order.token?.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>
                      {order.orderType.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.side.toUpperCase()}
                        size="small"
                        color={order.side === 'buy' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {order.orderType === 'market'
                        ? 'Market'
                        : `$${parseFloat(order.price).toLocaleString()}`}
                    </TableCell>
                    <TableCell align="right">{parseFloat(order.quantity).toFixed(4)}</TableCell>
                    <TableCell align="right">
                      {parseFloat(order.filledQuantity).toFixed(4)}
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        ({fillPercentage}%)
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      ${parseFloat(order.totalValue).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        size="small"
                        color={getStatusColor(order.status)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {canCancel ? (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          {order.orderType !== 'market' && (
                            <Tooltip title="Edit Order">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenEditDialog(order)}
                                sx={{ 
                                  '&:hover': { 
                                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                                    transform: 'scale(1.1)'
                                  },
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Cancel Order">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleCancelOrder(order.id)}
                              sx={{ 
                                '&:hover': { 
                                  backgroundColor: 'rgba(255, 51, 102, 0.1)',
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s'
                              }}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : order.status === 'filled' ? (
                        <Tooltip title="Completed">
                          <CheckCircle color="success" />
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {orders.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography variant="body2" color="textSecondary" sx={{ py: 4 }}>
                      No orders found. Start trading to see your orders here.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit Order Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0f1419',
            border: '2px solid #1f2937',
            borderRadius: 0
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Timeline sx={{ color: '#00ff88' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Edit Order
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {editingOrder && (
            <Box>
              <Box sx={{ 
                mb: 3, 
                p: 2, 
                bgcolor: 'rgba(0, 255, 136, 0.05)', 
                border: '1px solid rgba(0, 255, 136, 0.2)',
                borderRadius: 0
              }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Token</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#00ff88' }}>
                      {editingOrder.token?.symbol}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Side</Typography>
                    <Chip 
                      label={editingOrder.side.toUpperCase()} 
                      size="small"
                      color={editingOrder.side === 'buy' ? 'success' : 'error'}
                      sx={{ mt: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Filled</Typography>
                    <Typography variant="body2">
                      {parseFloat(editingOrder.filledQuantity).toFixed(4)} / {parseFloat(editingOrder.quantity).toFixed(4)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Type</Typography>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {editingOrder.orderType.replace('_', ' ')}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Price"
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    inputProps={{ step: '0.01', min: '0' }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 0,
                        '&.Mui-focused fieldset': {
                          borderColor: '#00ff88'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#00ff88'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    inputProps={{ 
                      step: '0.0001', 
                      min: parseFloat(editingOrder.filledQuantity).toString() 
                    }}
                    helperText={`Minimum: ${parseFloat(editingOrder.filledQuantity).toFixed(4)} (already filled)`}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 0,
                        '&.Mui-focused fieldset': {
                          borderColor: '#00ff88'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#00ff88'
                      }
                    }}
                  />
                </Grid>
                {['stop_loss', 'take_profit'].includes(editingOrder.orderType) && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Stop Price"
                      type="number"
                      value={editForm.stopPrice}
                      onChange={(e) => setEditForm({ ...editForm, stopPrice: e.target.value })}
                      inputProps={{ step: '0.01', min: '0' }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 0,
                          '&.Mui-focused fieldset': {
                            borderColor: '#00ff88'
                          }
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#00ff88'
                        }
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #1f2937' }}>
          <Button 
            onClick={handleCloseEditDialog}
            sx={{ 
              color: '#9ca3af',
              borderRadius: 0,
              '&:hover': {
                bgcolor: 'rgba(156, 163, 175, 0.1)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateOrder}
            variant="contained"
            sx={{
              bgcolor: '#00ff88',
              color: '#000',
              borderRadius: 0,
              fontWeight: 700,
              '&:hover': {
                bgcolor: '#00cc6a'
              }
            }}
          >
            Update Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
