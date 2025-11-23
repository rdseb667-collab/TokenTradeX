import { useEffect, useState } from 'react';
import { Box, Typography, Slide } from '@mui/material';
import { CheckCircle, TrendingUp, Diamond } from '@mui/icons-material';

/**
 * Live earnings notification that appears when user earns TTX
 */
export default function EarningsNotification({ earnings, onClose }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300); // Wait for slide out animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!earnings) return null;

  return (
    <Slide direction="left" in={show} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          top: 80,
          right: 20,
          zIndex: 9999,
          bgcolor: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
          background: 'linear-gradient(135deg, rgba(0,255,136,0.95) 0%, rgba(0,204,106,0.95) 100%)',
          border: '2px solid #00ff88',
          borderRadius: 2,
          p: 2,
          minWidth: 300,
          boxShadow: '0 8px 32px rgba(0, 255, 136, 0.4)',
          cursor: 'pointer',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'scale(1.05)'
          }
        }}
        onClick={() => {
          setShow(false);
          setTimeout(onClose, 300);
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Diamond sx={{ fontSize: 40, color: '#000', animation: 'pulse 2s infinite' }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#000', mb: 0.5 }}>
              🎉 Mining Reward Earned!
            </Typography>
            <Typography sx={{ fontSize: '20px', fontWeight: 900, color: '#000' }}>
              +{earnings.ttxEarned.toFixed(2)} TTX
            </Typography>
            <Typography sx={{ fontSize: '11px', color: 'rgba(0,0,0,0.7)' }}>
              From ${earnings.tradeValue.toFixed(2)} trade • {earnings.tier}
            </Typography>
          </Box>
          <CheckCircle sx={{ fontSize: 32, color: '#000' }} />
        </Box>
      </Box>
    </Slide>
  );
}
