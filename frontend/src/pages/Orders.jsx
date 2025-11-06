import { useEffect } from 'react';
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
  Tooltip
} from '@mui/material';
import { Cancel, CheckCircle } from '@mui/icons-material';
import { toast } from 'react-toastify';

import { fetchOrders, cancelOrder } from '../store/slices/ordersSlice';
import { fetchTokens } from '../store/slices/tokensSlice';

export default function Orders() {
  const dispatch = useDispatch();
  const { list: orders, loading } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrders());
    dispatch(fetchTokens());
  }, [dispatch]);

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
                        <Tooltip title="Cancel Order">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
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
    </Box>
  );
}
