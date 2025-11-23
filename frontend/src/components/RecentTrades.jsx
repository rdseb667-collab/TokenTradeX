import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { useSelector } from 'react-redux';

export default function RecentTrades() {
  const { list: orders } = useSelector((state) => state.orders);
  
  // Filter for filled orders and sort by timestamp
  const recentTrades = orders
    .filter(order => order.status === 'filled')
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 10); // Show only the 10 most recent trades

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 1.5, 
        height: '100%', 
        bgcolor: '#0a0e14', 
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Typography 
        variant="h6" 
        gutterBottom 
        sx={{ 
          fontWeight: 700, 
          mb: 1, 
          fontSize: '10px', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em', 
          color: '#9ca3af' 
        }}
      >
        RECENT TRADES
      </Typography>
      
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {recentTrades.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: '#6b7280'
          }}>
            <Typography sx={{ fontSize: '11px' }}>
              No recent trades
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {recentTrades.map((trade) => (
              <Box 
                key={trade.id} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 0.75,
                  bgcolor: '#0f1419',
                  borderRadius: 0,
                  border: '1px solid #1f2937'
                }}
              >
                <Box>
                  <Chip 
                    label={trade.side.toUpperCase()} 
                    size="small" 
                    sx={{ 
                      height: '16px', 
                      borderRadius: 0,
                      fontWeight: 700,
                      fontSize: '8px',
                      minWidth: '40px',
                      bgcolor: trade.side === 'buy' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 51, 102, 0.1)',
                      color: trade.side === 'buy' ? '#00ff88' : '#ff3366'
                    }} 
                  />
                  <Typography sx={{ 
                    fontSize: '10px', 
                    fontWeight: 700, 
                    color: '#e8e8e8',
                    mt: 0.5
                  }}>
                    {trade.token?.symbol || 'N/A'}
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ 
                    fontSize: '10px', 
                    fontWeight: 700, 
                    color: trade.side === 'buy' ? '#00ff88' : '#ff3366'
                  }}>
                    {trade.side === 'buy' ? '+' : '-'}{Number(trade.filledQuantity || 0).toFixed(4)}
                  </Typography>
                  <Typography sx={{ 
                    fontSize: '9px', 
                    color: '#6b7280',
                    mt: 0.25
                  }}>
                    ${Number(trade.totalValue || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  );
}