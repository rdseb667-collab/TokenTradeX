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
  TextField, 
  InputAdornment, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Pagination,
  Chip
} from '@mui/material';
import { Search, Person, SwapHoriz, AccountBalance, Security } from '@mui/icons-material';
import api from '../../services/api';

export default function AuditLog() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/audit-logs', {
        params: {
          page,
          limit: 20,
          action: actionFilter !== 'all' ? actionFilter : undefined
        }
      });
      
      if (response.data.success) {
        setAuditLogs(response.data.logs || []);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalCount(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, actionFilter]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // In a real implementation, you would debounce this and call the API
  };

  const getActionIcon = (action) => {
    if (action.includes('WITHDRAWAL') || action.includes('DEPOSIT')) {
      return <SwapHoriz sx={{ fontSize: 16 }} />;
    }
    if (action.includes('ROLE') || action.includes('STATUS')) {
      return <Person sx={{ fontSize: 16 }} />;
    }
    if (action.includes('FEE') || action.includes('REVENUE')) {
      return <AccountBalance sx={{ fontSize: 16 }} />;
    }
    return <Security sx={{ fontSize: 16 }} />;
  };

  const getActionColor = (action) => {
    if (action.includes('WITHDRAWAL') || action.includes('DEPOSIT')) {
      return 'info';
    }
    if (action.includes('ROLE') || action.includes('STATUS')) {
      return 'warning';
    }
    if (action.includes('FEE') || action.includes('REVENUE')) {
      return 'success';
    }
    return 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Audit Log
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search audit logs..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Action Type</InputLabel>
            <Select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              label="Action Type"
            >
              <MenuItem value="all">All Actions</MenuItem>
              <MenuItem value="APPROVE_WITHDRAWAL">Approve Withdrawal</MenuItem>
              <MenuItem value="REJECT_WITHDRAWAL">Reject Withdrawal</MenuItem>
              <MenuItem value="UPDATE_ROLE">Update Role</MenuItem>
              <MenuItem value="UPDATE_USER_STATUS">Update Status</MenuItem>
              <MenuItem value="UPDATE_AUTOMATION">Update Automation</MenuItem>
              <MenuItem value="REQUEST_PARAMETER_CHANGE">Parameter Change</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
          Showing {auditLogs.length} of {totalCount} audit logs
        </Typography>
      </Paper>
      
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Admin</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person sx={{ fontSize: 16, color: '#9ca3af' }} />
                      <span>{log.user?.email || 'System'}</span>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getActionIcon(log.action)}
                      label={log.action}
                      size="small"
                      color={getActionColor(log.action)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {log.resourceType}: {log.resourceId}
                  </TableCell>
                  <TableCell>
                    {log.metadata ? (
                      <details>
                        <summary>View Details</summary>
                        <pre style={{ fontSize: '11px', maxWidth: '300px', overflow: 'auto' }}>
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      'No details'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {totalPages > 1 && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}