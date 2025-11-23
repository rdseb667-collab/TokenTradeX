import { useState, useEffect } from 'react';
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
  TablePagination,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { SwapHoriz, ArrowDownward, ArrowUpward } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTransactions } from '../store/slices/walletSlice';

export default function TransactionHistory() {
  const dispatch = useDispatch();
  const { transactions } = useSelector((state) => state.wallet);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    dispatch(fetchTransactions({ page: page + 1, limit: rowsPerPage, type: filter === 'all' ? undefined : filter }));
  }, [dispatch, page, rowsPerPage, filter]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
    setPage(0);
  };

  const getTypeIcon = (type) => {
    if (type === 'deposit') {
      return <ArrowDownward sx={{ fontSize: 16, color: '#00ff88' }} />;
    } else if (type === 'withdrawal') {
      return <ArrowUpward sx={{ fontSize: 16, color: '#ff3366' }} />;
    }
    return <SwapHoriz sx={{ fontSize: 16 }} />;
  };

  const getTypeColor = (type) => {
    if (type === 'deposit') return '#00ff88';
    if (type === 'withdrawal') return '#ff3366';
    return '#9ca3af';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Transaction History
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Filter</InputLabel>
          <Select
            value={filter}
            onChange={handleFilterChange}
            label="Filter"
          >
            <MenuItem value="all">All Transactions</MenuItem>
            <MenuItem value="deposit">Deposits</MenuItem>
            <MenuItem value="withdrawal">Withdrawals</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Token</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions && transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TableRow key={transaction.id} hover>
                  <TableCell>
                    {new Date(transaction.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getTypeIcon(transaction.type)}
                      <span style={{ textTransform: 'capitalize' }}>{transaction.type}</span>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {transaction.token?.symbol || 'Unknown'}
                  </TableCell>
                  <TableCell align="right">
                    <span style={{ color: getTypeColor(transaction.type) }}>
                      {transaction.type === 'withdrawal' ? '-' : '+'}
                      {parseFloat(transaction.amount).toFixed(4)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={transaction.status} 
                      size="small" 
                      color={getStatusColor(transaction.status)}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="textSecondary">
                    No transaction history found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {transactions && transactions.length > 0 && (
        <TablePagination
          component="div"
          count={-1} // We don't know the total count, so we'll handle it client-side
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      )}
    </Paper>
  );
}