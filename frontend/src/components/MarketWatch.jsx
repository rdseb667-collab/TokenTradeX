import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

export default function MarketWatch({ tokens, selectedTokenId, onSelectToken }) {
  const [prices, setPrices] = useState({});

  useEffect(() => {
    // Update prices every 5 seconds
    const updatePrices = () => {
      const newPrices = {};
      tokens.forEach(token => {
        const lastPrice = prices[token.id] || parseFloat(token.currentPrice);
        const change = (Math.random() - 0.5) * 2;
        newPrices[token.id] = lastPrice + change;
      });
      setPrices(newPrices);
    };

    const interval = setInterval(updatePrices, 5000);
    return () => clearInterval(interval);
  }, [tokens, prices]);

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1.5, borderBottom: '1px solid #1f2937' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Market Watch
        </Typography>
      </Box>

      <TableContainer sx={{ flex: 1 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: '10px', py: 1 }}>Symbol</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1 }}>Bid</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1 }}>Ask</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tokens.map((token) => {
              const price = prices[token.id] || parseFloat(token.currentPrice);
              const bid = price * 0.9995;
              const ask = price * 1.0005;
              const change = parseFloat(token.priceChange24h) || 0;
              const isPositive = change >= 0;
              const isSelected = token.id === selectedTokenId;

              return (
                <TableRow 
                  key={token.id}
                  onClick={() => onSelectToken(token.id)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: isSelected ? 'rgba(0,255,136,0.05)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #00ff88' : '3px solid transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                  }}
                >
                  <TableCell sx={{ py: 1 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '13px' }}>{token.symbol}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {isPositive ? <TrendingUp sx={{ fontSize: 12, color: '#00ff88' }} /> : <TrendingDown sx={{ fontSize: 12, color: '#ff3366' }} />}
                        <Typography sx={{ fontSize: '10px', color: isPositive ? '#00ff88' : '#ff3366', fontWeight: 600 }}>
                          {isPositive ? '+' : ''}{change.toFixed(2)}%
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#ff3366', fontWeight: 600, fontSize: '13px', py: 1 }}>
                    {bid.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#00ff88', fontWeight: 600, fontSize: '13px', py: 1 }}>
                    {ask.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
