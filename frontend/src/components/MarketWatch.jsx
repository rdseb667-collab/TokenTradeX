import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { TrendingUp, TrendingDown, Search } from '@mui/icons-material';
import websocket from '../services/websocket';

export default function MarketWatch({ tokens, selectedTokenId, onSelectToken }) {
  const [prices, setPrices] = useState({});
  const [priceFlashes, setPriceFlashes] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [assetCategory, setAssetCategory] = useState('all');
  const [favorites, setFavorites] = useState([]);

  // Load favorites from localStorage on component mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('marketWatchFavorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Failed to parse favorites from localStorage', e);
      }
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('marketWatchFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (tokenId) => {
    setFavorites(prev => 
      prev.includes(tokenId) 
        ? prev.filter(id => id !== tokenId) 
        : [...prev, tokenId]
    );
  };

  useEffect(() => {
    // Initialize prices with current token prices
    const initialPrices = {};
    tokens.forEach(token => {
      initialPrices[token.symbol] = {
        price: parseFloat(token.currentPrice),
        change24h: parseFloat(token.priceChange24h) || 0,
        volume24h: parseFloat(token.volume24h) || 0,
        high24h: parseFloat(token.currentPrice) * 1.05,
        low24h: parseFloat(token.currentPrice) * 0.95,
      };
    });
    setPrices(initialPrices);
  }, [tokens]);

  useEffect(() => {
    // Connect to WebSocket and listen for real-time price updates
    const handlePriceUpdate = (data) => {
      console.log('💰 Price update received:', data);
      const { symbol, price, change24h, volume24h, high24h, low24h } = data;
      
      setPrices(prev => {
        const oldPrice = prev[symbol]?.price || price;
        const direction = price > oldPrice ? 'up' : price < oldPrice ? 'down' : null;
        
        console.log(`${symbol}: $${oldPrice.toFixed(2)} → $${price.toFixed(2)} (${direction || 'same'})`);
        
        // Trigger flash animation
        if (direction) {
          setPriceFlashes(prevFlashes => ({
            ...prevFlashes,
            [symbol]: direction
          }));
          
          // Clear flash after animation
          setTimeout(() => {
            setPriceFlashes(prevFlashes => {
              const newFlashes = { ...prevFlashes };
              delete newFlashes[symbol];
              return newFlashes;
            });
          }, 500);
        }
        
        return {
          ...prev,
          [symbol]: {
            price,
            change24h,
            volume24h,
            high24h,
            low24h,
          }
        };
      });
    };

    console.log('🔌 MarketWatch subscribing to price updates...');
    websocket.on('price:update', handlePriceUpdate);

    return () => {
      console.log('🔌 MarketWatch unsubscribing from price updates');
      websocket.off('price:update', handlePriceUpdate);
    };
  }, []);

  // Filter tokens based on search term and category
  const filteredTokens = tokens.filter(token => {
    const matchesSearch = token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         token.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = assetCategory === 'all' || 
                           (assetCategory === 'forex' && token.assetCategory === 'FOREX') ||
                           (assetCategory === 'crypto' && !token.assetCategory) ||
                           (assetCategory === 'other' && token.assetCategory && token.assetCategory !== 'FOREX');
    
    return matchesSearch && matchesCategory;
  });

  // Sort tokens: favorites first, then by market cap
  const sortedTokens = [...filteredTokens].sort((a, b) => {
    const aIsFavorite = favorites.includes(a.id);
    const bIsFavorite = favorites.includes(b.id);
    
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    
    return parseFloat(b.marketCap) - parseFloat(a.marketCap);
  });

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0a0e14' }}>
      <Box sx={{ p: 1.5, borderBottom: '1px solid #1f2937' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', mb: 1 }}>
          Market Watch
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            size="small"
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 16, color: '#6b7280' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                fontSize: '12px',
                bgcolor: '#1f2937',
                '& fieldset': {
                  borderColor: '#374151',
                },
                '&:hover fieldset': {
                  borderColor: '#4b5563',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#00ff88',
                },
              },
              '& .MuiInputBase-input': {
                color: '#e8e8e8',
              },
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={assetCategory}
              onChange={(e) => setAssetCategory(e.target.value)}
              sx={{
                fontSize: '12px',
                bgcolor: '#1f2937',
                color: '#e8e8e8',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#374151',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#4b5563',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00ff88',
                },
              }}
            >
              <MenuItem value="all">All Assets</MenuItem>
              <MenuItem value="crypto">Crypto</MenuItem>
              <MenuItem value="forex">Forex</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <TableContainer sx={{ flex: 1 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: '10px', py: 1, bgcolor: '#0a0e14', color: '#6b7280' }}>Symbol</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1, bgcolor: '#0a0e14', color: '#6b7280' }}>Bid</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '10px', py: 1, bgcolor: '#0a0e14', color: '#6b7280' }}>Ask</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTokens.map((token) => {
              const livePrice = prices[token.symbol]?.price || parseFloat(token.currentPrice);
              const change24h = (prices[token.symbol]?.change24h ?? parseFloat(token.priceChange24h)) || 0;
              const flash = priceFlashes[token.symbol];
              
              const bid = livePrice * 0.9995;
              const ask = livePrice * 1.0005;
              const isPositive = change24h >= 0;
              const isSelected = token.id === selectedTokenId;
              const isFavorite = favorites.includes(token.id);

              return (
                <TableRow 
                  key={token.id}
                  onClick={() => onSelectToken(token.id)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: isSelected ? 'rgba(0,255,136,0.05)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #00ff88' : '3px solid transparent',
                    transition: 'background-color 0.2s ease',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                  }}
                >
                  <TableCell sx={{ py: 1, borderBottom: '1px solid #1f2937' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(token.id);
                        }}
                        sx={{ 
                          cursor: 'pointer',
                          color: isFavorite ? '#fbbf24' : '#374151',
                          '&:hover': { color: isFavorite ? '#fbbf24' : '#6b7280' }
                        }}
                      >
                        {isFavorite ? '★' : '☆'}
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '13px', color: '#e8e8e8' }}>{token.symbol}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {isPositive ? <TrendingUp sx={{ fontSize: 12, color: '#00ff88' }} /> : <TrendingDown sx={{ fontSize: 12, color: '#ff3366' }} />}
                          <Typography sx={{ fontSize: '10px', color: isPositive ? '#00ff88' : '#ff3366', fontWeight: 600 }}>
                            {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      color: '#ff3366', 
                      fontWeight: 600, 
                      fontSize: '13px', 
                      py: 1,
                      borderBottom: '1px solid #1f2937',
                      bgcolor: flash === 'down' ? 'rgba(255, 51, 102, 0.2)' : 'transparent',
                      transition: 'background-color 0.5s ease'
                    }}
                  >
                    ${bid.toFixed(2)}
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      color: '#00ff88', 
                      fontWeight: 600, 
                      fontSize: '13px', 
                      py: 1,
                      borderBottom: '1px solid #1f2937',
                      bgcolor: flash === 'up' ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
                      transition: 'background-color 0.5s ease'
                    }}
                  >
                    ${ask.toFixed(2)}
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