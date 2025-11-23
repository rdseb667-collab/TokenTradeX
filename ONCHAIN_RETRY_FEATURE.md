# On-Chain Revenue Retry Feature

This document explains the new on-chain revenue retry mechanism that ensures failed smart contract deliveries are automatically retried with exponential backoff.

## Features

1. **Automatic Retry with Exponential Backoff** - Failed on-chain deliveries are retried with increasing delays (2, 4, 8, 16, 32 minutes)
2. **Capped Failure Logging** - Prevents log spam by throttling failure messages
3. **Admin Dashboard Endpoints** - View failures and worker status
4. **Aggregated Failure Reporting** - See which revenue streams have delivery issues

## How It Works

1. When revenue is collected, it's immediately recorded in the database
2. A separate process attempts to send the holder share (15%) to the smart contract
3. If the on-chain delivery fails, the failure is tracked in the event metadata
4. The retry worker periodically picks up failed deliveries and retries them
5. After 5 attempts, failures are marked as "critical" for manual reconciliation

## Admin Endpoints

### Get On-Chain Failure Report
```
GET /api/admin/revenue/onchain-failures
Query Parameters:
  - streamId (optional): Filter by specific revenue stream
  - hours (optional, default 24): Hours to look back
  
Example Response:
{
  "success": true,
  "data": {
    "summary": {
      "totalFailures": 15,
      "criticalFailures": 2,
      "totalHolderSharePending": 12.45,
      "period": "Last 24 hours",
      "needsReconciliation": true
    },
    "byStream": [
      {
        "streamId": 0,
        "streamName": "Trading Fees",
        "count": 15,
        "totalHolderShare": 12.45,
        "maxRetries": 3,
        "events": [...]
      }
    ]
  }
}
```

### Get Worker Status
```
GET /api/admin/revenue/onchain-worker-status

Example Response:
{
  "success": true,
  "data": {
    "isRunning": true,
    "pollIntervalMs": 60000,
    "batchSize": 20,
    "maxRetryAttempts": 5,
    "enabled": true,
    "failureLogCaps": [...]
  }
}
```

## Configuration

Environment variables:
- `ONCHAIN_RETRY_POLL_MS` (default: 60000) - How often to check for failed deliveries
- `ONCHAIN_RETRY_BATCH` (default: 20) - How many events to process per batch
- `ONCHAIN_MAX_RETRIES` (default: 5) - Maximum retry attempts before marking as critical

## Testing

Run the test script:
```bash
cd backend
node test-onchain-retry.js
```

## Production Requirements

To enable actual on-chain deliveries:
1. Set `CONTRACT_MODE=production`
2. Set `TTX_TOKEN_ADDRESS` to your deployed contract address

When these are not set, the system operates in simulation mode and logs what would be sent to the blockchain.
