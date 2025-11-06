import { useEffect, useRef, useState } from 'react';
import { Box, Paper, ToggleButtonGroup, ToggleButton, Typography, CircularProgress } from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../services/api';

export default function PriceChart({ token }) {
  const [timeframe, setTimeframe] = useState('1');
  const [chartData, setChartData] = useState([]);
  const [livePrice, setLivePrice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    // Fetch real chart data from CoinGecko via our API
    const fetchChartData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/prices/${token.symbol}/chart?days=${timeframe}`);
        const data = response.data.data;
        
        // Format data for chart
        const formattedData = data.map(point => ({
          time: new Date(point.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            ...(timeframe !== '1' && { month: 'short', day: 'numeric' })
          }),
          price: point.price
        }));
        
        setChartData(formattedData);
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch live price
    const fetchLivePrice = async () => {
      try {
        const response = await api.get(`/prices/${token.symbol}/live`);
        setLivePrice(response.data.data);
      } catch (error) {
        console.error('Failed to fetch live price:', error);
      }
    };

    fetchChartData();
    fetchLivePrice();

    // Update live price every 10 seconds
    const priceInterval = setInterval(fetchLivePrice, 10000);
    
    // Update chart every 60 seconds
    const chartInterval = setInterval(fetchChartData, 60000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(chartInterval);
    };
  }, [token, timeframe]);

  if (!token) {
    return null;
  }

  if (loading && chartData.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Paper>
    );
  }

  const displayPrice = livePrice?.price || parseFloat(token.currentPrice);
  const displayChange = livePrice?.change24h || parseFloat(token.priceChange24h);
  const isPositive = displayChange >= 0;

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            {token.symbol}/USD
          </Typography>
          <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
            ${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
          <Typography
            variant="body1"
            color={isPositive ? 'success.main' : 'error.main'}
            fontWeight={600}
          >
            {isPositive ? '+' : ''}{displayChange.toFixed(2)}% (24h)
          </Typography>
        </Box>
        
        <ToggleButtonGroup
          value={timeframe}
          exclusive
          onChange={(e, newValue) => newValue && setTimeframe(newValue)}
          size="small"
        >
          <ToggleButton value="1">24H</ToggleButton>
          <ToggleButton value="7">7D</ToggleButton>
          <ToggleButton value="30">30D</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? '#4caf50' : '#f44336'} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={isPositive ? '#4caf50' : '#f44336'} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis 
            dataKey="time" 
            stroke="#666"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke="#666"
            tick={{ fontSize: 12 }}
            domain={['dataMin - 10', 'dataMax + 10']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: '8px'
            }}
            formatter={(value) => [`$${value}`, 'Price']}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={isPositive ? '#4caf50' : '#f44336'}
            strokeWidth={2}
            fill="url(#colorPrice)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <Box sx={{ mt: 2, display: 'flex', gap: 3 }}>
        <Box>
          <Typography variant="caption" color="textSecondary">
            24h Volume
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            ${livePrice ? (livePrice.volume24h / 1e9).toFixed(2) : (parseFloat(token.volume24h) / 1e9).toFixed(2)}B
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="textSecondary">
            Market Cap
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            ${livePrice ? (livePrice.marketCap / 1e9).toFixed(2) : (parseFloat(token.marketCap) / 1e9).toFixed(2)}B
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="textSecondary">
            Last Updated
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            {new Date().toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
