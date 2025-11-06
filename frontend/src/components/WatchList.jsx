import { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function WatchList({ tokens, selectedTokenId, onSelectToken }) {
  const navigate = useNavigate();

  const handleSelectToken = (token) => {
    onSelectToken(token);
  };

  return (
    <Paper sx={{ 
      height: '100%', 
      bgcolor: 'background.paper',
      borderLeft: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{ 
        px: 2, 
        py: 1.5, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        bgcolor: 'background.default'
      }}>
        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
          Instruments
        </Typography>
      </Box>

      {/* Header */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
        gap: 1,
        px: 2,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default'
      }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>SYMBOL</Typography>
        <Typography variant="caption" color="text.secondary" textAlign="right" sx={{ fontSize: '0.7rem' }}>BID</Typography>
        <Typography variant="caption" color="text.secondary" textAlign="right" sx={{ fontSize: '0.7rem' }}>ASK</Typography>
        <Typography variant="caption" color="text.secondary" textAlign="right" sx={{ fontSize: '0.7rem' }}>SPREAD</Typography>
        <Typography variant="caption" color="text.secondary" textAlign="right" sx={{ fontSize: '0.7rem' }}>LEVERAGE</Typography>
      </Box>

      {/* Token List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {tokens.map((token) => {
          const price = parseFloat(token.currentPrice);
          const change = parseFloat(token.priceChange24h);
          const isPositive = change >= 0;
          const isSelected = token.id === selectedTokenId;
          const bid = price;
          const ask = price * 1.0001; // Small spread
          const spread = Math.abs(ask - bid);

          return (
            <Box
              key={token.id}
              onClick={() => handleSelectToken(token)}
              sx={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                gap: 1,
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                bgcolor: isSelected ? 'rgba(41, 182, 246, 0.08)' : 'transparent',
                '&:hover': {
                  bgcolor: isSelected ? 'rgba(41, 182, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)'
                }
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Box
                    component="span"
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: isPositive ? 'success.main' : 'error.main',
                      display: 'inline-block'
                    }}
                  />
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                    {token.symbol}USD
                  </Typography>
                </Box>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontSize: '0.7rem',
                    color: isPositive ? 'success.main' : 'error.main'
                  }}
                >
                  {isPositive ? '+' : ''}{change.toFixed(2)}%
                </Typography>
              </Box>

              <Typography 
                variant="body2" 
                textAlign="right" 
                fontFamily="monospace"
                sx={{ fontSize: '0.8125rem' }}
              >
                {bid.toFixed(2)}
              </Typography>

              <Typography 
                variant="body2" 
                textAlign="right"
                fontFamily="monospace"
                sx={{ fontSize: '0.8125rem' }}
              >
                {ask.toFixed(2)}
              </Typography>

              <Typography 
                variant="body2" 
                textAlign="right"
                fontFamily="monospace"
                color="text.secondary"
                sx={{ fontSize: '0.8125rem' }}
              >
                {spread.toFixed(1)}
              </Typography>

              <Typography 
                variant="body2" 
                textAlign="right"
                fontFamily="monospace"
                color="text.secondary"
                sx={{ fontSize: '0.8125rem' }}
              >
                {Math.floor(Math.random() * 400 + 100)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
