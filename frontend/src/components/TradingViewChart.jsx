import { useEffect, useRef } from 'react';
import { Box, Paper, ToggleButtonGroup, ToggleButton, Typography, IconButton } from '@mui/material';
import { ShowChart, Fullscreen, CandlestickChart } from '@mui/icons-material';
import { createChart } from 'lightweight-charts';

export default function TradingViewChart({ token }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!token || !chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0a0e14' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      crosshair: {
        mode: 1, // Magnet mode - snaps to data points
        vertLine: {
          width: 1,
          color: '#9ca3af',
          style: 3, // Dashed
        },
        horzLine: {
          width: 1,
          color: '#9ca3af',
          style: 3,
        },
      },
      timeScale: {
        borderColor: '#1f2937',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1f2937',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
    });

    // Generate realistic candlestick data
    const basePrice = parseFloat(token.currentPrice);
    const now = Math.floor(Date.now() / 1000);
    const data = [];
    
    let currentPrice = basePrice * 0.95; // Start lower
    for (let i = 390; i >= 0; i--) {
      const time = now - (i * 60); // 1-minute candles
      const volatility = basePrice * 0.002;
      
      const open = currentPrice;
      const change = (Math.random() - 0.48) * volatility; // Slight upward bias
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      
      data.push({
        time,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
      });
      
      currentPrice = close;
    }

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00ff88',
      downColor: '#ff3366',
      borderUpColor: '#00ff88',
      borderDownColor: '#ff3366',
      wickUpColor: '#00ff88',
      wickDownColor: '#ff3366',
    });

    candlestickSeries.setData(data);

    // Add volume histogram
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const volumeData = data.map(d => ({
      time: d.time,
      value: Math.random() * 1000000 + 500000,
      color: d.close >= d.open ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 51, 102, 0.3)'
    }));

    volumeSeries.setData(volumeData);

    // Fit content nicely
    chart.timeScale().fitContent();

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Live price updates
    const updateInterval = setInterval(() => {
      const lastCandle = data[data.length - 1];
      const newClose = lastCandle.close + (Math.random() - 0.5) * (basePrice * 0.002);
      const newTime = Math.floor(Date.now() / 1000);
      
      const newCandle = {
        time: newTime,
        open: lastCandle.close,
        high: Math.max(lastCandle.close, newClose),
        low: Math.min(lastCandle.close, newClose),
        close: newClose,
      };
      
      candlestickSeries.update(newCandle);
      volumeSeries.update({
        time: newTime,
        value: Math.random() * 1000000 + 500000,
        color: newClose >= lastCandle.close ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 51, 102, 0.3)'
      });
    }, 5000);

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(updateInterval);
      chart.remove();
    };
  }, [token]);

  if (!token) return null;

  const displayPrice = parseFloat(token.currentPrice);
  const displayChange = parseFloat(token.priceChange24h) || 0;
  const isPositive = displayChange >= 0;

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
      <Box ref={chartContainerRef} sx={{ flex: 1, position: 'relative' }} />
    </Paper>
  );
}
