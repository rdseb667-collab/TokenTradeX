import { useEffect, useRef, useState } from 'react';
import { Box, Paper, ToggleButtonGroup, ToggleButton, Typography, IconButton, CircularProgress, Alert } from '@mui/material';
import { ShowChart, Fullscreen } from '@mui/icons-material';

// Symbol mapping for TradingView
const SYMBOL_MAP = {
  'BTC': 'BTCUSD',
  'ETH': 'ETHUSD',
  'BNB': 'BNBUSD',
  'SOL': 'SOLUSD',
  'USDT': 'USDTUSD',
  'TTX': 'BTCUSD', // Fallback to BTC for custom token
};

// Timeframe mapping for TradingView
const TIMEFRAME_MAP = {
  '1H': '60',
  '1D': 'D',
  '1W': 'W',
  '1M': 'M',
};

export default function TradingViewChart({ token }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [timeframe, setTimeframe] = useState('1D');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !containerRef.current) return;

    setLoading(true);
    setError(null);

    // Lazy-load TradingView widget script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      try {
        // Clear previous widget
        if (widgetRef.current) {
          containerRef.current.innerHTML = '';
        }

        const tvSymbol = SYMBOL_MAP[token.symbol] || 'BTCUSD';

        // Initialize TradingView widget
        widgetRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: TIMEFRAME_MAP[timeframe],
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1', // Candlestick
          locale: 'en',
          toolbar_bg: '#0a0e14',
          enable_publishing: false,
          hide_side_toolbar: true,
          allow_symbol_change: false,
          save_image: false,
          container_id: containerRef.current.id,
          backgroundColor: '#0a0e14',
          gridColor: '#1f2937',
          hide_top_toolbar: false,
          hide_legend: false,
          studies: [],
          disabled_features: [
            'use_localstorage_for_settings',
            'volume_force_overlay',
            'create_volume_indicator_by_default',
          ],
          enabled_features: ['hide_left_toolbar_by_default'],
          overrides: {
            'mainSeriesProperties.candleStyle.upColor': '#00ff88',
            'mainSeriesProperties.candleStyle.downColor': '#ff3366',
            'mainSeriesProperties.candleStyle.borderUpColor': '#00ff88',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ff3366',
            'mainSeriesProperties.candleStyle.wickUpColor': '#00ff88',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ff3366',
            'paneProperties.background': '#0a0e14',
            'paneProperties.backgroundType': 'solid',
            'paneProperties.vertGridProperties.color': '#1f2937',
            'paneProperties.horzGridProperties.color': '#1f2937',
          },
        });

        setLoading(false);
      } catch (err) {
        console.error('TradingView widget error:', err);
        setError('Failed to load chart');
        setLoading(false);
      }
    };

    script.onerror = () => {
      setError('Failed to load TradingView script');
      setLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Safe cleanup: check if widget exists and has a valid DOM parent
      if (widgetRef.current) {
        try {
          if (typeof widgetRef.current.remove === 'function') {
            widgetRef.current.remove();
          }
        } catch (err) {
          // Silently ignore - widget may already be destroyed
          console.debug('TradingView cleanup skipped:', err.message);
        }
        widgetRef.current = null;
      }
      
      // Clean container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      
      // Remove script safely
      if (script && script.parentNode) {
        script.remove();
      }
    };
  }, [token, timeframe]);

  if (!token) return null;

  const displayPrice = parseFloat(token.currentPrice);
  const displayChange = parseFloat(token.priceChange24h) || 0;
  const isPositive = displayChange >= 0;

  // Generate unique container ID
  const containerId = `tradingview_${token.symbol}_${Date.now()}`;

  return (
    <Paper elevation={0} sx={{ border: '1px solid #1f2937', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chart Header */}
      <Box sx={{ p: 1.5, borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#e8e8e8' }}>
              {token.symbol}/USD
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography sx={{ fontSize: '18px', fontWeight: 700 }}>
                ${displayPrice.toFixed(2)}
              </Typography>
              <Typography 
                sx={{ 
                  fontSize: '12px', 
                  fontWeight: 700,
                  color: isPositive ? '#00ff88' : '#ff3366'
                }}
              >
                {isPositive ? '+' : ''}{displayChange.toFixed(2)}%
              </Typography>
            </Box>
          </Box>

          {/* Timeframe Selector */}
          <ToggleButtonGroup
            value={timeframe}
            exclusive
            onChange={(e, newValue) => newValue && setTimeframe(newValue)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 1.5,
                py: 0.5,
                fontSize: '11px',
                fontWeight: 700,
                border: '1px solid #1f2937',
                color: '#9ca3af',
                '&.Mui-selected': {
                  bgcolor: '#00ff88',
                  color: '#000',
                  '&:hover': {
                    bgcolor: '#00cc6a'
                  }
                }
              }
            }}
          >
            <ToggleButton value="1H">1H</ToggleButton>
            <ToggleButton value="1D">1D</ToggleButton>
            <ToggleButton value="1W">1W</ToggleButton>
            <ToggleButton value="1M">1M</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton size="small" sx={{ color: '#9ca3af' }}>
            <ShowChart fontSize="small" />
          </IconButton>
          <IconButton size="small" sx={{ color: '#9ca3af' }}>
            <Fullscreen fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Chart Container */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 400 }}>
        {loading && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: '#0a0e14',
            zIndex: 10
          }}>
            <CircularProgress size={40} sx={{ color: '#00ff88' }} />
          </Box>
        )}
        
        {error && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: '#0a0e14',
            p: 3,
            zIndex: 10
          }}>
            <Alert severity="error" sx={{ bgcolor: '#1f2937', color: '#ff3366' }}>
              {error}
            </Alert>
          </Box>
        )}

        <Box 
          id={containerId} 
          ref={containerRef}
          sx={{ 
            width: '100%', 
            height: '100%',
            minHeight: 400,
            opacity: loading || error ? 0 : 1,
            transition: 'opacity 0.3s ease'
          }} 
        />
      </Box>
    </Paper>
  );
}
