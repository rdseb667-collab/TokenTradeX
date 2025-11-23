import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Pagination
} from '@mui/material';
import { CheckCircle, Cancel, AccessTime, AccountBalance } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function WithdrawalApprovals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, action: null });
  const [formData, setFormData] = useState({ txHash: '', notes: '', reason: '', twoFactorToken: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, [page]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/withdrawals/pending', {
        params: { page, limit: 20 }
      });
      setWithdrawals(response.data.withdrawals || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      toast.error('Failed to fetch pending withdrawals');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (withdrawal, action) => {
    setSelectedWithdrawal(withdrawal);
    setActionDialog({ open: true, action });
    setFormData({ txHash: '', notes: '', reason: '' });
  };

  const handleCloseDialog = () => {
    setActionDialog({ open: false, action: null });
    setSelectedWithdrawal(null);
    setFormData({ txHash: '', notes: '', reason: '' });
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal) return;
    
    setSubmitting(true);
    try {
      await api.post(`/admin/withdrawals/${selectedWithdrawal.id}/approve`, {
        txHash: formData.txHash,
        notes: formData.notes
      }, {
        headers: {
          'X-2FA-Token': formData.twoFactorToken
        }
      });
      toast.success('Withdrawal approved successfully');
      handleCloseDialog();
      fetchWithdrawals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve withdrawal');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !formData.reason) {
      toast.error('Rejection reason is required');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post(`/admin/withdrawals/${selectedWithdrawal.id}/reject`, {
        reason: formData.reason
      }, {
        headers: {
          'X-2FA-Token': formData.twoFactorToken
        }
      });
      toast.success('Withdrawal rejected and amount refunded');
      handleCloseDialog();
      fetchWithdrawals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject withdrawal');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && withdrawals.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Withdrawal Approvals
        </Typography>
        <Chip 
          icon={<AccessTime />}
          label={`${withdrawals.length} Pending`}
          color="warning"
        />
      </Box>

      {withdrawals.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <AccountBalance sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No pending withdrawals
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            All withdrawal requests have been processed
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Token</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">USD Value</TableCell>
                  <TableCell>Destination</TableCell>
                  <TableCell>Waiting Time</TableCell>
                  <TableCell>KYC Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {withdrawal.User?.username || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {withdrawal.User?.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={withdrawal.token?.symbol || 'N/A'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {parseFloat(withdrawal.amount).toFixed(4)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
                        ${withdrawal.usdValue?.toFixed(2) || '0.00'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {withdrawal.reference?.substring(0, 20)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${withdrawal.waitingTime}h`}
                        size="small"
                        color={withdrawal.waitingTime > 24 ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={withdrawal.User?.kycStatus || 'unknown'}
                        size="small"
                        color={withdrawal.User?.kycStatus === 'approved' ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => handleOpenDialog(withdrawal, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => handleOpenDialog(withdrawal, 'reject')}
                        >
                          Reject
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination 
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </>
      )}

      {/* Approve Dialog */}
      <Dialog open={actionDialog.open && actionDialog.action === 'approve'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Withdrawal</DialogTitle>
        <DialogContent>
          {selectedWithdrawal && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>User:</strong> {selectedWithdrawal.User?.email}
                </Typography>
                <Typography variant="body2">
                  <strong>Amount:</strong> {parseFloat(selectedWithdrawal.amount).toFixed(4)} {selectedWithdrawal.token?.symbol}
                </Typography>
                <Typography variant="body2">
                  <strong>USD Value:</strong> ${selectedWithdrawal.usdValue?.toFixed(2)}
                </Typography>
                <Typography variant="body2">
                  <strong>Destination:</strong> {selectedWithdrawal.reference}
                </Typography>
              </Alert>

              <TextField
                fullWidth
                label="Transaction Hash (Optional)"
                name="txHash"
                value={formData.txHash}
                onChange={(e) => setFormData({ ...formData, txHash: e.target.value })}
                placeholder="0x..."
                margin="normal"
              />
              <TextField
                fullWidth
                label="Admin Notes (Optional)"
                name="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={2}
                margin="normal"
              />

              <TextField
                fullWidth
                label="2FA Token *"
                name="twoFactorToken"
                value={formData.twoFactorToken}
                onChange={(e) => setFormData({ ...formData, twoFactorToken: e.target.value })}
                placeholder="Enter your 2FA token"
                margin="normal"
                required
              />

              <Alert severity="warning" sx={{ mt: 2 }}>
                This action requires 2FA verification. Please confirm you have reviewed the withdrawal details.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove} 
            variant="contained" 
            color="success"
            disabled={submitting || !formData.twoFactorToken}
          >
            {submitting ? <CircularProgress size={20} /> : 'Approve Withdrawal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionDialog.open && actionDialog.action === 'reject'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Withdrawal</DialogTitle>
        <DialogContent>
          {selectedWithdrawal && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>User:</strong> {selectedWithdrawal.User?.email}
                </Typography>
                <Typography variant="body2">
                  <strong>Amount:</strong> {parseFloat(selectedWithdrawal.amount).toFixed(4)} {selectedWithdrawal.token?.symbol}
                </Typography>
                <Typography variant="body2">
                  <strong>Amount will be refunded to user's wallet</strong>
                </Typography>
              </Alert>

              <TextField
                fullWidth
                label="Rejection Reason *"
                name="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                multiline
                rows={3}
                required
                margin="normal"
                placeholder="Explain why this withdrawal is being rejected..."
              />

              <TextField
                fullWidth
                label="2FA Token *"
                name="twoFactorToken"
                value={formData.twoFactorToken}
                onChange={(e) => setFormData({ ...formData, twoFactorToken: e.target.value })}
                placeholder="Enter your 2FA token"
                margin="normal"
                required
              />

              <Alert severity="error" sx={{ mt: 2 }}>
                This action requires 2FA verification. The amount will be refunded to the user's wallet.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleReject} 
            variant="contained" 
            color="error"
            disabled={submitting || !formData.reason || !formData.twoFactorToken}
          >
            {submitting ? <CircularProgress size={20} /> : 'Reject & Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
