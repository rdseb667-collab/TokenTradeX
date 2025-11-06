import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

export default function LiveMarketTicker({ tokens }) {
  const [livePrices, setLivePrices] = useState({});

  useEffect(() => {
    // Initialize with current prices
    const initialPrices = {};
    tokens.forEach(token => {
      initialPrices[token.id] = {
        price: parseFloat(token.currentPrice),
        change: parseFloat(token.priceChange24h) || 0
      };
    });
    setLivePrices(initialPrices);

    // Update prices every 5 seconds
    const interval = setInterval(() => {
      setLivePrices(prev => {
        const updated = { ...prev };
        tokens.forEach(token => {
          const current = prev[token.id]?.price || parseFloat(token.currentPrice);
          const fluctuation = (Math.random() - 0.5) * 50; // ±$25 change
          updated[token.id] = {
            price: Math.max(current + fluctuation, 1),
            change: ((fluctuation / current) * 100).toFixed(2)
          };
        });
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [tokens]);

  return (
    <Box 
      sx={{ 
        bgcolor: '#0f1419',
        border: '1px solid #1f2937',
        borderBottom: '2px solid #00ff88',
        py: 1,
        overflow: 'hidden',
        mb: 3
      }}
    >
      <Box 
        sx={{ 
          display: 'flex',
          gap: 4,
          animation: 'scroll 30s linear infinite',
          '@keyframes scroll': {
            '0%': { transform: 'translateX(0)' },
            '100%': { transform: 'translateX(-50%)' }
          }
        }}
      >
        {/* Duplicate tokens for seamless scroll */}
        {[...tokens, ...tokens].map((token, index) => {
          const liveData = livePrices[token.id] || { price: parseFloat(token.currentPrice), change: 0 };
          const isPositive = parseFloat(liveData.change) >= 0;

          return (
            <Box 
              key={`${token.id}-${index}`}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                minWidth: '200px',
                px: 2,
                borderRight: '1px solid #1f2937'
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '14px' }}>
                {token.symbol}
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '14px', color: '#e8e8e8' }}>
                ${liveData.price.toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                {isPositive ? (
                  <TrendingUp sx={{ fontSize: 14, color: '#00ff88' }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 14, color: '#ff3366' }} />
                )}
                <Typography 
                  sx={{ 
                    fontSize: '12px', 
                    fontWeight: 700,
                    color: isPositive ? '#00ff88' : '#ff3366'
                  }}
                >
                  {isPositive ? '+' : ''}{liveData.change}%
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
