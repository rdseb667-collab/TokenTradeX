import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Chip,
  CircularProgress,
  Divider,
  Link
} from '@mui/material';
import {
  AccountBalance,
  CurrencyBitcoin,
  CreditCard,
  Warning,
  Info,
  CheckCircle
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTokens } from '../store/slices/tokensSlice';
import { deposit } from '../store/slices/walletSlice';
import api from '../services/api';
import ttxService from '../services/ttxService';

const steps = ['Select Method', 'Enter Details', 'Review & Confirm'];

const fundingMethods = [
  {
    id: 'fiat',
    name: 'Bank Transfer',
    icon: <AccountBalance />,
    description: 'Deposit via bank wire or ACH transfer',
    kycRequired: true,
    processingTime: '1-3 business days',
    fee: '0.5%',
    limits: '$100 - $100,000'
  },
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    icon: <CurrencyBitcoin />,
    description: 'Deposit using Bitcoin, Ethereum, or other cryptocurrencies',
    kycRequired: false,
    processingTime: 'Instant',
    fee: '0%',
    limits: 'No limits'
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: <CreditCard />,
    description: 'Instant deposit using your credit or debit card',
    kycRequired: true,
    processingTime: 'Instant',
    fee: '3.5%',
    limits: '$10 - $10,000'
  }
];

export default function AddFundsModal({ open, onClose, onDepositSuccess }) {
  const dispatch = useDispatch();
  const { list: tokens } = useSelector((state) => state.tokens);
  const { user } = useSelector((state) => state.auth);
  
  const [activeStep, setActiveStep] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [formData, setFormData] = useState({
    tokenId: '',
    amount: '',
    currency: 'USD',
    address: '',
    txHash: ''
  });
  const [kycStatus, setKycStatus] = useState('verified'); // In real app, this would come from user data
  const [feeEstimate, setFeeEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Preload token data when modal opens
  useEffect(() => {
    if (open) {
      dispatch(fetchTokens());
      setActiveStep(0);
      setSelectedMethod(null);
      setFormData({
        tokenId: '',
        amount: '',
        currency: 'USD',
        address: '',
        txHash: ''
      });
      setFeeEstimate(null);
      setError(null);
      setSuccess(false);
    }
  }, [open, dispatch]);

  // Calculate fee estimate when amount or method changes
  useEffect(() => {
    if (formData.amount && selectedMethod) {
      const amount = parseFloat(formData.amount);
      if (!isNaN(amount) && amount > 0) {
        const fee = amount * (selectedMethod.fee.replace('%', '') / 100);
        setFeeEstimate({
          fee: fee.toFixed(2),
          total: (amount - fee).toFixed(2),
          feePercent: selectedMethod.fee
        });
      } else {
        setFeeEstimate(null);
      }
    } else {
      setFeeEstimate(null);
    }
  }, [formData.amount, selectedMethod]);

  const handleNext = () => {
    // Validate step 0
    if (activeStep === 0 && !selectedMethod) {
      setError('Please select a funding method');
      return;
    }
    
    // Validate step 1
    if (activeStep === 1) {
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      
      if (selectedMethod.id === 'crypto' && !formData.tokenId) {
        setError('Please select a cryptocurrency');
        return;
      }
    }
    
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setError(null);
    
    // Set default token for crypto method
    if (method.id === 'crypto' && tokens.length > 0 && !formData.tokenId) {
      const btcToken = tokens.find(t => t.symbol === 'BTC');
      setFormData(prev => ({
        ...prev,
        tokenId: btcToken ? btcToken.id : tokens[0].id
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call the appropriate API endpoint
      // based on the selected funding method
      if (selectedMethod.id === 'crypto') {
        // For crypto deposits, we'll use the existing deposit functionality
        await dispatch(deposit({
          tokenId: formData.tokenId,
          amount: parseFloat(formData.amount),
          txHash: formData.txHash
        })).unwrap();
      } else {
        // For fiat/card deposits, we would call a different API
        // This is a simulation for demo purposes
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      setSuccess(true);
      if (onDepositSuccess) {
        onDepositSuccess();
      }
    } catch (err) {
      setError(err?.message || 'Failed to process deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              How would you like to add funds?
            </Typography>
            
            {kycStatus !== 'verified' && (
              <Alert 
                severity="warning" 
                icon={<Warning />} 
                sx={{ mb: 3 }}
              >
                <Typography variant="body2">
                  Some funding methods require KYC verification. Please complete verification to unlock all options.
                </Typography>
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {fundingMethods.map((method) => (
                <Paper
                  key={method.id}
                  elevation={selectedMethod?.id === method.id ? 8 : 1}
                  onClick={() => {
                    if (method.kycRequired && kycStatus !== 'verified') return;
                    handleMethodSelect(method);
                  }}
                  sx={{
                    p: 2,
                    cursor: (method.kycRequired && kycStatus !== 'verified') ? 'not-allowed' : 'pointer',
                    opacity: (method.kycRequired && kycStatus !== 'verified') ? 0.6 : 1,
                    border: selectedMethod?.id === method.id ? '2px solid' : '1px solid',
                    borderColor: selectedMethod?.id === method.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      borderColor: (method.kycRequired && kycStatus !== 'verified') ? 'divider' : 'primary.main'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ 
                      color: 'primary.main',
                      mt: 0.5
                    }}>
                      {method.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="subtitle1" fontWeight="600">
                          {method.name}
                        </Typography>
                        {method.kycRequired && kycStatus !== 'verified' && (
                          <Chip 
                            label="KYC Required" 
                            size="small" 
                            color="warning" 
                            variant="outlined" 
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                        {method.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          ⏱ {method.processingTime}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          💰 {method.fee} fee
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          📊 {method.limits}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        );
      
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Enter deposit details
            </Typography>
            
            <TextField
              fullWidth
              label="Amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              required
              margin="normal"
              InputProps={{
                endAdornment: (
                  <Typography variant="body2" color="textSecondary">
                    {selectedMethod?.id === 'crypto' ? 'USD' : 'USD'}
                  </Typography>
                )
              }}
            />
            
            {feeEstimate && (
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Fee Estimate
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Amount:</Typography>
                  <Typography variant="body2">${parseFloat(formData.amount).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Fee ({feeEstimate.feePercent}):</Typography>
                  <Typography variant="body2">-${feeEstimate.fee}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2">You'll receive:</Typography>
                  <Typography variant="subtitle2">${feeEstimate.total}</Typography>
                </Box>
              </Paper>
            )}
            
            {selectedMethod?.id === 'crypto' && (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Cryptocurrency</InputLabel>
                  <Select
                    name="tokenId"
                    value={formData.tokenId}
                    onChange={handleChange}
                    label="Cryptocurrency"
                  >
                    {tokens.map((token) => (
                      <MenuItem key={token.id} value={token.id}>
                        {token.symbol} - {token.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Alert severity="info" icon={<Info />} sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Send your cryptocurrency to the address below. Your deposit will be credited once we receive the transaction.
                  </Typography>
                </Alert>
              </>
            )}
            
            {selectedMethod?.id === 'fiat' && (
              <Alert severity="info" icon={<Info />} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  You'll receive bank transfer instructions after confirming your deposit. Processing typically takes 1-3 business days.
                </Typography>
              </Alert>
            )}
            
            {selectedMethod?.id === 'card' && (
              <Alert severity="warning" icon={<Warning />} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Credit/debit card deposits are subject to a 3.5% fee. For larger amounts, consider using bank transfer to save on fees.
                </Typography>
              </Alert>
            )}
          </Box>
        );
      
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review your deposit
            </Typography>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1">Method:</Typography>
                <Typography variant="body1" fontWeight="600">
                  {selectedMethod?.name}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1">Amount:</Typography>
                <Typography variant="body1" fontWeight="600">
                  ${parseFloat(formData.amount).toFixed(2)}
                </Typography>
              </Box>
              
              {feeEstimate && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body1">Fee:</Typography>
                    <Typography variant="body1" fontWeight="600">
                      ${feeEstimate.fee} ({feeEstimate.feePercent})
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body1">You'll receive:</Typography>
                    <Typography variant="body1" fontWeight="600">
                      ${feeEstimate.total}
                    </Typography>
                  </Box>
                </>
              )}
              
              {selectedMethod?.id === 'crypto' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1">Cryptocurrency:</Typography>
                  <Typography variant="body1" fontWeight="600">
                    {tokens.find(t => t.id === formData.tokenId)?.symbol || 'Unknown'}
                  </Typography>
                </Box>
              )}
            </Paper>
            
            <Alert severity="info" icon={<Info />} sx={{ mb: 2 }}>
              <Typography variant="body2">
                By confirming this deposit, you agree to our Terms of Service and acknowledge that processing times may vary.
              </Typography>
            </Alert>
            
            {selectedMethod?.id === 'crypto' && (
              <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Please ensure you send the exact cryptocurrency selected. Sending the wrong cryptocurrency may result in loss of funds.
                </Typography>
              </Alert>
            )}
          </Box>
        );
      
      default:
        return 'Unknown step';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Add Funds</Typography>
          {success && <CheckCircle color="success" />}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {!success ? (
          <>
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {getStepContent(activeStep)}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Deposit Submitted!
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Your deposit is being processed. You'll receive a notification when funds are available.
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body2">
                <strong>Amount:</strong> ${parseFloat(formData.amount).toFixed(2)}
              </Typography>
              <Typography variant="body2">
                <strong>Method:</strong> {selectedMethod?.name}
              </Typography>
              {selectedMethod?.id === 'crypto' && (
                <Typography variant="body2">
                  <strong>Status:</strong> Pending blockchain confirmation
                </Typography>
              )}
            </Paper>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        {!success ? (
          <>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep !== 0 && (
              <Button onClick={handleBack} disabled={loading}>
                Back
              </Button>
            )}
            {activeStep === steps.length - 1 ? (
              <Button 
                onClick={handleSubmit} 
                variant="contained" 
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Processing...' : 'Confirm Deposit'}
              </Button>
            ) : (
              <Button 
                onClick={handleNext} 
                variant="contained" 
                disabled={loading}
              >
                Next
              </Button>
            )}
          </>
        ) : (
          <Button onClick={handleClose} variant="contained" color="success">
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}