# Adding Forex Pairs to TokenTradeX

This document explains how to add major forex pairs to the TokenTradeX platform.

## Overview

The TokenTradeX platform has been extended to support trading of major forex pairs. This enhancement allows users to trade currency pairs like EUR/USD, GBP/USD, etc. alongside existing cryptocurrency tokens.

## Files Added/Modified

1. **Backend Migration**: `src/migrations/20251123000000-add-forex-pairs.js`
   - Tracking migration for forex pairs addition

2. **Seed Scripts**: 
   - `src/scripts/seed-forex.js` - Dedicated script to add forex pairs
   - `src/scripts/seed.js` - Updated to include forex pairs in main seed
   - `src/scripts/test-forex-pairs.js` - Test script to verify integration

3. **Fee Configuration**: `src/helpers/feeCalculators.js`
   - Added forex pairs to trading fee table with reduced fees (5-8 bps)
   - Added base currencies to withdrawal fee table

4. **Forex Pairs Added**:
   - EUR/USD - Euro / US Dollar
   - GBP/USD - British Pound / US Dollar
   - USD/JPY - US Dollar / Japanese Yen
   - USD/CHF - US Dollar / Swiss Franc
   - AUD/USD - Australian Dollar / US Dollar
   - USD/CAD - US Dollar / Canadian Dollar
   - NZD/USD - New Zealand Dollar / US Dollar
   - EUR/GBP - Euro / British Pound
   - EUR/JPY - Euro / Japanese Yen

## How to Add Forex Pairs

### Option 1: Run the dedicated forex seed script (Recommended)

```bash
cd backend
node src/scripts/seed-forex.js
```

This script will:
- Add all 9 forex pairs to the database
- Create wallets for existing users with initial balances
- Ensure all pairs are marked as active and trading-enabled

### Option 2: Run the main seed script

```bash
cd backend
node src/scripts/seed.js
```

This will re-seed the entire database including forex pairs.

## Verification

Run the test script to verify the integration:

```bash
cd backend
node src/scripts/test-forex-pairs.js
```

This will check that all forex pairs are properly configured in the database.

## Frontend Integration

No frontend changes are required. The existing MarketWatch component and trading interface will automatically display and support the new forex pairs because:

1. The frontend fetches all tokens from `/api/tokens` endpoint
2. Forex pairs are stored as Token records with the same schema
3. The symbol format (e.g., "EUR/USD") is already supported by the UI

## Fee Structure

Forex pairs have reduced trading fees compared to other assets:
- Maker Fee: 5 basis points (0.05%)
- Taker Fee: 8 basis points (0.08%)
- Minimum Fee: $0.01

Withdrawal fees for forex base currencies:
- EUR, GBP, CHF, AUD, CAD, NZD: $0.50 + 0.5%
- JPY: ¥50 + 0.5% (minimum ¥100)

## Testing Trading

To test trading a forex pair:

1. Start the backend server
2. Run the forex seed script
3. Log in as demo user (demo@tokentradex.com / Demo123!)
4. Navigate to the Trading page
5. Select a forex pair from the Market Watch list
6. Place a buy or sell order

Example: Trading EUR/USD
- Select EUR/USD from the market list
- Enter quantity (minimum 100)
- Click BUY or SELL
- Order should execute successfully

## Technical Details

### Database Schema

Forex pairs are stored in the same `tokens` table as other assets with:
- `symbol`: Format like "EUR/USD"
- `name`: Descriptive name like "Euro / US Dollar"
- `assetCategory`: Set to "FOREX" for filtering
- `minTradeAmount`: Set to appropriate values (100-1000 units)
- `isActive`: true
- `isTradingEnabled`: true

### Price Simulation

Forex pairs use the same price simulation service as other tokens:
- Real-time price updates via WebSocket
- 24h change and volume tracking
- Market cap calculation based on current price

### Order Matching

Forex pairs use the same order matching engine as other tokens:
- Support for market and limit orders
- Real-time order book updates
- Trade execution with fee calculation