import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';

export default function OpenPositions() {
  // Mock data - will be replaced with real orders
  const positions = [
    {
      id: 1,
      symbol: 'BTC',
      side: 'BUY',
      lots: 0.01,
      entryPrice: 45230.50,
      currentPrice: 45350.20,
      stopLoss: 45000.00,
      takeProfit: 46000.00,
      profit: 119.70,
      profitPercent: 0.26,
      time: '2025-10-30 11:32:15'
    }
  ];

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1.5, borderBottom: '1px solid #1f2937', display: 'flex', gap: 2 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 700, 
            fontSize: '12px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            color: '#00ff88'
          }}
        >
          Positions ({positions.length})
        </Typography>
      </Box>

      <TableContainer sx={{ flex: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: '10px', py: 1 }}>Symbol</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '10px', py: 1 }}>Side</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1 }}>Lots</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1 }}>Entry</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1 }}>Current</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1 }}>S/L</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1 }}>T/P</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1 }}>Profit</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '10px', py: 1 }}>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {positions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3, color: '#9ca3af' }}>
                  No open positions
                </TableCell>
              </TableRow>
            ) : (
              positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell sx={{ fontWeight: 700, py: 1 }}>{position.symbol}</TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Chip 
                      label={position.side} 
                      size="small"
                      sx={{ 
                        bgcolor: position.side === 'BUY' ? '#00ff88' : '#ff3366',
                        color: position.side === 'BUY' ? '#000' : '#fff',
                        fontWeight: 700,
                        fontSize: '10px',
                        height: '20px'
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1 }}>{position.lots}</TableCell>
                  <TableCell align="right" sx={{ py: 1 }}>${position.entryPrice.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, py: 1 }}>${position.currentPrice.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ color: '#ff3366', py: 1 }}>${position.stopLoss.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ color: '#00ff88', py: 1 }}>${position.takeProfit.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Typography 
                        sx={{ 
                          fontWeight: 700, 
                          color: position.profit >= 0 ? '#00ff88' : '#ff3366',
                          fontSize: '13px'
                        }}
                      >
                        ${position.profit.toFixed(2)}
                      </Typography>
                      <Typography 
                        sx={{ 
                          fontSize: '10px', 
                          color: position.profit >= 0 ? '#00ff88' : '#ff3366'
                        }}
                      >
                        ({position.profitPercent >= 0 ? '+' : ''}{position.profitPercent.toFixed(2)}%)
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '11px', color: '#9ca3af', py: 1 }}>{position.time}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
