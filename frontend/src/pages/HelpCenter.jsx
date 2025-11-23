import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert
} from '@mui/material';
import { ExpandMore, Diamond, TrendingUp, AccountBalanceWallet, ShowChart } from '@mui/icons-material';

export default function HelpCenter() {
  const [expanded, setExpanded] = useState('panel1');

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const quickGuides = [
    {
      title: '💰 Earning Passive Income',
      icon: <Diamond sx={{ fontSize: 40, color: '#00ff88' }} />,
      description: 'Hold TTX and earn 15% of ALL platform trading fees automatically',
      steps: ['Buy TTX tokens', 'Hold in your wallet', 'Earn from every trade on platform']
    },
    {
      title: '⛏️ Trading Mining',
      icon: <TrendingUp sx={{ fontSize: 40, color: '#ffaa00' }} />,
      description: 'Get rewarded with TTX just for trading',
      steps: ['Trade any token', 'Earn 5-20 TTX per $100', 'Higher volume = higher tier']
    },
    {
      title: '📊 How to Trade',
      icon: <ShowChart sx={{ fontSize: 40, color: '#00aaff' }} />,
      description: 'Start trading in 3 simple steps',
      steps: ['Go to Trading page', 'Select Buy/Sell + token', 'Enter amount and confirm']
    },
    {
      title: '💳 Managing Wallet',
      icon: <AccountBalanceWallet sx={{ fontSize: 40, color: '#ff3366' }} />,
      description: 'Deposit, withdraw, and track your assets',
      steps: ['Click Deposit/Withdraw', 'Enter token and amount', 'Confirm transaction']
    }
  ];

  const faqs = [
    {
      question: 'What is Trading Mining?',
      answer: 'Trading Mining rewards you with TTX tokens automatically when you trade. You earn 5 TTX per $100 traded (0-10K volume), 10 TTX per $100 (10K-100K volume), or 20 TTX per $100 (100K+ volume). Daily cap is 200 TTX.'
    },
    {
      question: 'How do I earn from platform fees?',
      answer: 'Simply hold TTX in your wallet. 15% of all trading fees collected by the platform are distributed to TTX holders proportionally based on your holdings. The more TTX you hold, the more you earn!'
    },
    {
      question: 'What are the trading fees?',
      answer: 'Trading fees are 0.1% of trade value. These fees are split: 15% goes to TTX holders, and 85% supports platform operations. Plus, you can reduce fees by holding more TTX!'
    },
    {
      question: 'How long do deposits take?',
      answer: 'Deposits are typically processed within minutes after blockchain confirmation. Withdrawals may have a delay based on security checks and your account activity.'
    },
    {
      question: 'What is the difference between Market and Limit orders?',
      answer: 'Market orders execute immediately at current price. Limit orders only execute when price reaches your specified level. Use Market for instant trades, Limit to wait for better prices.'
    },
    {
      question: 'How can I increase my mining rewards?',
      answer: 'Trade more volume to unlock higher tiers: Tier 1 (0-10K): 5 TTX/$100, Tier 2 (10K-100K): 10 TTX/$100, Tier 3 (100K+): 20 TTX/$100. Your tier updates based on your 24h trading volume.'
    },
    {
      question: 'Where can I see my earnings?',
      answer: 'Go to "My Earnings" page to see your complete breakdown: fee earnings from holdings, mining rewards from trading, daily/monthly totals, and projected annual income.'
    },
    {
      question: 'Are there withdrawal limits?',
      answer: 'Yes, withdrawal limits exist for security. Limits depend on your account verification level and trading history. Check the Wallet page for your current limits.'
    }
  ];

  const tradingTips = [
    { tip: 'Use keyboard shortcuts: B=Buy, S=Sell, M=Market, L=Limit, ?=Help', level: 'Pro Tip' },
    { tip: 'Check the Order Book to see current buy/sell pressure before trading', level: 'Beginner' },
    { tip: 'Trading during high volume periods gets you more mining rewards faster', level: 'Strategy' },
    { tip: 'Hold TTX to reduce your trading fees AND earn passive income', level: 'Essential' }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
        📚 Help Center
      </Typography>
      <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4 }}>
        Everything you need to know about TokenTradeX
      </Typography>

      {/* Quick Guides */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Quick Guides
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickGuides.map((guide, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%', bgcolor: '#0f1419', border: '2px solid #1f2937' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  {guide.icon}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: '14px' }}>
                  {guide.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '12px' }}>
                  {guide.description}
                </Typography>
                <Box sx={{ '& > div': { py: 0.5, fontSize: '11px' } }}>
                  {guide.steps.map((step, i) => (
                    <div key={i}>• {step}</div>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Trading Tips */}
      <Alert severity="info" sx={{ mb: 4, bgcolor: '#0f1419', border: '2px solid #00aaff' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          💡 Pro Trading Tips
        </Typography>
        <Grid container spacing={2}>
          {tradingTips.map((item, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Chip label={item.level} size="small" sx={{ bgcolor: '#00ff88', color: '#000', fontWeight: 700 }} />
                <Typography variant="body2">{item.tip}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Alert>

      {/* FAQs */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Frequently Asked Questions
      </Typography>
      <Box>
        {faqs.map((faq, index) => (
          <Accordion
            key={index}
            expanded={expanded === `panel${index + 1}`}
            onChange={handleChange(`panel${index + 1}`)}
            sx={{
              bgcolor: '#0f1419',
              border: '1px solid #1f2937',
              '&:before': { display: 'none' },
              mb: 1
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore sx={{ color: '#00ff88' }} />}
              sx={{
                '&:hover': { bgcolor: 'rgba(0, 255, 136, 0.05)' }
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>{faq.question}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: 'text.secondary' }}>
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Contact Support */}
      <Alert severity="warning" sx={{ mt: 4, bgcolor: '#1a1a0f', border: '2px solid #ffaa00' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          📧 Need More Help?
        </Typography>
        <Typography variant="body2">
          Can't find what you're looking for? Contact our support team at{' '}
          <strong>support@tokentradex.com</strong> or join our community Discord for real-time help.
        </Typography>
      </Alert>
    </Container>
  );
}
