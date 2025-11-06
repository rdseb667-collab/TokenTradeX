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
  TextField,
  Stack,
  MenuItem,
  IconButton,
  Collapse,
  Alert
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, FilterList } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

function LogRow({ log }) {
  const [open, setOpen] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'blocked':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE_ADMIN')) return 'error';
    if (action.includes('UPDATE_ROLE')) return 'warning';
    if (action.includes('2FA')) return 'info';
    return 'default';
  };

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
        <TableCell>
          <Chip label={log.action} color={getActionColor(log.action)} size="small" />
        </TableCell>
        <TableCell>{log.user?.email || 'System'}</TableCell>
        <TableCell>{log.resourceType || '-'}</TableCell>
        <TableCell>
          <Chip label={log.status} color={getStatusColor(log.status)} size="small" />
        </TableCell>
        <TableCell>{log.ipAddress || '-'}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Details
              </Typography>
              <Stack spacing={1}>
                {log.resourceId && (
                  <Typography variant="body2">
                    <strong>Resource ID:</strong> {log.resourceId}
                  </Typography>
                )}
                {log.changes && (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      <strong>Changes:</strong>
                    </Typography>
                    <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
                      {JSON.stringify(log.changes, null, 2)}
                    </pre>
                  </Box>
                )}
                {log.metadata && (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      <strong>Metadata:</strong>
                    </Typography>
                    <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </Box>
                )}
                {log.userAgent && (
                  <Typography variant="body2">
                    <strong>User Agent:</strong> {log.userAgent}
                  </Typography>
                )}
                {log.errorMessage && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {log.errorMessage}
                  </Alert>
                )}
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    status: '',
    userId: ''
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      
      const response = await api.get('/admin/audit-logs', { params });
      setLogs(response.data.logs || []);
      setTotalCount(response.data.total || 0);
    } catch (error) {
      toast.error('Failed to fetch audit logs');
      console.error('Audit logs error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage, filters]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    setPage(0);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Audit Logs
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Immutable record of all privileged actions and security events
      </Typography>

      <Paper sx={{ mt: 3, p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <FilterList />
          <TextField
            select
            label="Action"
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Actions</MenuItem>
            <MenuItem value="CREATE_ADMIN">Create Admin</MenuItem>
            <MenuItem value="UPDATE_ROLE">Update Role</MenuItem>
            <MenuItem value="UPDATE_STATUS">Update Status</MenuItem>
            <MenuItem value="2FA_VERIFICATION">2FA Verification</MenuItem>
            <MenuItem value="UPDATE_AUTOMATION">Update Automation</MenuItem>
          </TextField>

          <TextField
            select
            label="Status"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="blocked">Blocked</MenuItem>
          </TextField>
        </Stack>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Timestamp</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>IP Address</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => <LogRow key={log.id} log={log} />)
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
}
