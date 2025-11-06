import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Alert
} from '@mui/material';
import {
  EmojiEvents,
  Casino,
  TrendingUp,
  AccountBalance
} from '@mui/icons-material';
import api from '../services/api';

export default function DividendLottery() {
  const [lotteryHistory, setLotteryHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [historyRes, statsRes] = await Promise.all([
        api.get('/dividend-mining/lottery?limit=20'),
        api.get('/dividend-mining/stats')
      ]);

      console.log('Lottery API Response:', historyRes.data);
      console.log('Stats API Response:', statsRes.data);

      // Handle different response structures
      const history = Array.isArray(historyRes.data) 
        ? historyRes.data 
        : (historyRes.data.history || historyRes.data.lotteries || []);
      
      const stats = statsRes.data.stats || statsRes.data || {};
      
      console.log('Parsed history:', history);
      console.log('Parsed stats:', stats);
      
      setLotteryHistory(Array.isArray(history) ? history : []);
      setStats(stats);
    } catch (error) {
      console.error('Error fetching lottery data:', error);
      // Set empty array on error to prevent map error
      setLotteryHistory([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const getMultiplierColor = (multiplier) => {
    if (multiplier >= 100) return '#FFD700'; // Gold
    if (multiplier >= 50) return '#C0C0C0'; // Silver
    if (multiplier >= 10) return '#CD7F32'; // Bronze
    return '#4CAF50';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
          🎰 Dividend Lottery - Win Big on Dividends!
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Every dividend payment = a chance to win 10-1000x your share! Stake RWA tokens to participate.
        </Typography>
      </Box>

      {/* How It Works */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'rgba(255, 215, 0, 0.1)', border: '1px solid #FFD700', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Casino sx={{ color: '#FFD700', fontSize: 40, mr: 2 }} />
                <Typography variant="h6" sx={{ color: '#FFD700' }}>
                  How It Works
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                1. Stake RWA tokens (AAPL, MSFT, etc.)<br/>
                2. Every dividend payment = automatic lottery entry<br/>
                3. 10% of dividends go to lottery pool<br/>
                4. One random staker wins the entire pool!
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4CAF50', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ color: '#4CAF50', fontSize: 40, mr: 2 }} />
                <Typography variant="h6" sx={{ color: '#4CAF50' }}>
                  Prize Multipliers
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                <strong style={{ color: '#FFD700' }}>1000x:</strong> Mega Jackpot (0.1%)<br/>
                <strong style={{ color: '#C0C0C0' }}>100x:</strong> Super Prize (1%)<br/>
                <strong style={{ color: '#CD7F32' }}>50x:</strong> Big Win (5%)<br/>
                <strong style={{ color: '#4CAF50' }}>10x:</strong> Standard (93.9%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', border: '1px solid #2196F3', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalance sx={{ color: '#2196F3', fontSize: 40, mr: 2 }} />
                <Typography variant="h6" sx={{ color: '#2196F3' }}>
                  Your Entries
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#2196F3', fontWeight: 700 }}>
                {stats.lotteryEntries || 0}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Active lottery entries
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'rgba(156, 39, 176, 0.1)', border: '1px solid #9C27B0', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmojiEvents sx={{ color: '#9C27B0', fontSize: 40, mr: 2 }} />
                <Typography variant="h6" sx={{ color: '#9C27B0' }}>
                  Total Winnings
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#9C27B0', fontWeight: 700 }}>
                ${parseFloat(stats.totalWinnings || 0).toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                All-time lottery wins
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Winners */}
      <Card sx={{ bgcolor: '#0a0e14', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
            🏆 Recent Lottery Winners
          </Typography>

          {!Array.isArray(lotteryHistory) || lotteryHistory.length === 0 ? (
            <Alert severity="info">
              No lottery draws yet. Stake RWA tokens to be eligible for the next draw!
            </Alert>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'text.secondary' }}>Date</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>Token</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>Winner</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>Multiplier</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>Prize</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>Participants</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lotteryHistory.map((lottery) => (
                  <TableRow key={lottery.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        {new Date(lottery.drawDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {new Date(lottery.drawDate).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={lottery.token?.symbol || 'N/A'}
                        size="small"
                        sx={{ bgcolor: 'rgba(33, 150, 243, 0.2)', color: '#2196F3' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#FFD700' }}>
                          {lottery.winner?.username?.[0] || '?'}
                        </Avatar>
                        <Typography variant="body2" sx={{ color: 'white' }}>
                          {lottery.winner?.username || 'Anonymous'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${lottery.multiplier}x`}
                        sx={{
                          bgcolor: getMultiplierColor(lottery.multiplier),
                          color: '#000',
                          fontWeight: 700
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: getMultiplierColor(lottery.multiplier),
                          fontWeight: 700,
                          fontSize: lottery.multiplier >= 100 ? '1.2rem' : '1rem'
                        }}
                      >
                        ${parseFloat(lottery.winnerPrize || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {lottery.totalParticipants || 0} stakers
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          🎯 How to participate:
        </Typography>
        <Typography variant="body2">
          1. Go to Staking page<br/>
          2. Stake any RWA token (AAPL, MSFT, GOOGL, etc.)<br/>
          3. When dividends are distributed, you're automatically entered in the lottery<br/>
          4. Winners are selected randomly - more stake = better odds!
        </Typography>
      </Alert>
    </Box>
  );
}
