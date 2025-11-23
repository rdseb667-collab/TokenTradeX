# TTX Security Setup Guide

## Overview

This guide shows you how to secure your TokenTradeX platform so developers cannot steal funds while you maintain full control.

---

## 🔐 Security Architecture

### Key Principles

1. **Multisig Control**: All admin functions require multiple signatures
2. **Role Separation**: Backend can only deposit, never withdraw
3. **Timelock Protection**: Withdrawals require 24-48 hour delay
4. **Destination Allowlist**: Funds can only go to pre-approved addresses
5. **Automatic Caps**: Daily (5%) and monthly (20%) withdrawal limits

---

## 📋 Step-by-Step Setup

### Step 1: Create Gnosis Safe Multisig

**Why**: So no single person (including you) can move funds alone

**How**:
1. Go to https://safe.global
2. Click "Create new Safe"
3. Choose your blockchain (Ethereum, Polygon, etc.)
4. Add signers:
   - Your primary wallet
   - Your backup wallet (hardware wallet recommended)
   - Trusted advisor/partner (optional)
5. Set threshold: 2-of-3 recommended
6. Deploy Safe

**Result**: You get a multisig address like `0x1234...5678`

---

### Step 2: Deploy Secure Contract

**Set environment variables** (in `contracts/.env`):

```bash
# Your Gnosis Safe address from Step 1
MULTISIG_ADDRESS=0x1234567890123456789012345678901234567890

# Backend service wallet (will only deposit revenue)
REVENUE_COLLECTOR_ADDRESS=0xabcdef...

# Optional: Marketing/ops wallets (pre-approved destinations)
MARKETING_WALLET=0x9876...
OPERATIONS_WALLET=0x5432...
```

**Deploy contract**:

```bash
cd contracts
npx hardhat run scripts/deploy-secure.js --network mainnet
```

**What this does**:
- Deploys `TTXUnifiedSecure.sol`
- Sets your multisig as owner
- Grants `REVENUE_COLLECTOR_ROLE` to backend
- Approves destination addresses
- Sets 24-hour timelock delay

---

### Step 3: Configure Backend Service

**Update backend `.env`**:

```bash
# Smart Contract Integration
CONTRACT_MODE=production
TTX_UNIFIED_ADDRESS=0x... # From deployment output
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
```

**Important**: The `PLATFORM_PRIVATE_KEY` should be:
- Stored in AWS Secrets Manager / HashiCorp Vault
- OR use institutional custody (Fireblocks / Coinbase Custody)
- NEVER committed to git
- NEVER accessible to developers

**For maximum security**, use a custody provider:
- Fireblocks API: https://www.fireblocks.com
- Coinbase Custody: https://custody.coinbase.com
- Configure policies: "Can only call collectRevenue()"

---

### Step 4: Role Verification

**Check roles are set correctly**:

```javascript
// Using ethers.js
const ttx = await ethers.getContractAt("TTXUnifiedSecure", CONTRACT_ADDRESS);

// Verify multisig has all admin roles
const ADMIN_ROLE = await ttx.ADMIN_ROLE();
const hasAdmin = await ttx.hasRole(ADMIN_ROLE, MULTISIG_ADDRESS);
console.log("Multisig has admin:", hasAdmin); // Should be true

// Verify backend only has collector role
const COLLECTOR_ROLE = await ttx.REVENUE_COLLECTOR_ROLE();
const hasCollector = await ttx.hasRole(COLLECTOR_ROLE, BACKEND_ADDRESS);
console.log("Backend has collector:", hasCollector); // Should be true

// Verify backend DOES NOT have admin
const backendHasAdmin = await ttx.hasRole(ADMIN_ROLE, BACKEND_ADDRESS);
console.log("Backend has admin:", backendHasAdmin); // Should be FALSE
```

---

## 🛡️ How Security Works

### What Backend CAN Do

✅ **Deposit revenue** via `collectRevenue(streamId, amount, isTTX)`
```solidity
// Backend calls this when users trade/subscribe/etc
contract.collectRevenue(0, ethAmount, false, { value: ethAmount });
```

### What Backend CANNOT Do

❌ Withdraw funds
❌ Change parameters
❌ Pause contract
❌ Grant roles
❌ Approve destinations
❌ Bypass timelock

All these require `ADMIN_ROLE` which only your multisig has.

---

## 💰 How to Use Reserve Funds

### Option 1: Approved Destinations (Instant)

For pre-approved addresses (marketing wallet, ops wallet):

```javascript
// Queue operation (requires TIMELOCK_ROLE)
const tx = await ttx.queueTimelockOp(
  MARKETING_WALLET,      // Destination
  ethers.utils.parseEther("10"), // 10 ETH
  "0x",                  // No calldata
  "Marketing campaign Q1"
);
await tx.wait();

// Wait 24 hours...

// Execute operation
const opId = "0x..."; // From event
await ttx.executeTimelockOp(opId);
```

### Option 2: Buyback TTX (Admin)

```javascript
// Requires ADMIN_ROLE (your multisig)
await ttx.buybackTTX(
  ethers.utils.parseEther("5"),  // 5 ETH to spend
  UNISWAP_ROUTER,                // DEX router address
  minTTXOut                      // Slippage protection
);
```

### Option 3: Emergency Withdrawal

```javascript
// Requires ADMIN_ROLE + respects caps
await ttx.emergencyWithdrawReserve(
  ethers.utils.parseEther("100"), // Amount
  MULTISIG_ADDRESS                // Must be approved destination
);
```

**All withdrawals are subject to**:
- 10% per-call limit
- 5% daily cap
- 20% monthly cap
- Destination must be approved

---

## 🚨 Emergency Procedures

### If Backend is Compromised

1. **Pause contract** (Guardian can do instantly):
   ```javascript
   await ttx.emergencyPause();
   ```

2. **Revoke collector role**:
   ```javascript
   await ttx.revokeRevenueCollectorRole(COMPROMISED_ADDRESS);
   ```

3. **Rotate backend key** in custody provider

4. **Grant role to new address**:
   ```javascript
   await ttx.grantRevenueCollectorRole(NEW_BACKEND_ADDRESS);
   ```

5. **Unpause**:
   ```javascript
   await ttx.unpause();
   ```

### If Timelock Operation is Suspicious

**Cancel it** (Admin can cancel before execution):

```javascript
await ttx.cancelTimelockOp(OPERATION_ID);
```

**This is why timelock is important** - gives you 24 hours to spot and stop bad transactions.

---

## 📊 Monitoring & Alerts

### Set Up Event Monitoring

Monitor these critical events:

```javascript
// Revenue collection (normal)
ttx.on("RevenueCollected", (streamId, amount, collector) => {
  console.log(`Revenue: Stream ${streamId}, $${amount} from ${collector}`);
});

// Timelock operations (suspicious if unexpected)
ttx.on("TimelockOperationQueued", (opId, target, value, description) => {
  // ALERT: New withdrawal queued!
  sendAlert(`⚠️ Withdrawal queued: ${value} ETH to ${target}`);
});

// Emergency actions (very suspicious)
ttx.on("EmergencyAction", (executor, action, value) => {
  // ALERT: Emergency action taken!
  sendAlert(`🚨 EMERGENCY: ${action} by ${executor}, ${value} ETH`);
});
```

### Recommended Monitoring Tools

- **Defender** (OpenZeppelin): https://defender.openzeppelin.com
- **Tenderly**: https://tenderly.co
- **Forta** (security alerts): https://forta.org

---

## 👥 Team Onboarding

### For Developers

**What they CAN access**:
- Development/staging environments
- Test networks (Sepolia, Goerli)
- Code repositories
- Backend logs (production, read-only)

**What they CANNOT access**:
- Production private keys
- Multisig signers
- Contract admin functions
- Reserve funds

**Best practices**:
1. Use test keys in dev/staging only
2. No private keys in code or .env committed to git
3. CI/CD has no signing privileges
4. All production deployments reviewed by you

### For Backend Service

**Minimal privileges**:
- Can call `collectRevenue()` only
- Uses custody-managed signer
- Has daily/monthly usage limits
- Monitored 24/7 for anomalies

---

## 🔒 Key Storage Best Practices

### Your Multisig Signers

- **Option 1**: Hardware wallets (Ledger, Trezor)
  - Store in safe
  - Use PIN/passphrase
  - Keep seed phrase in bank vault

- **Option 2**: Institutional custody
  - Coinbase Custody
  - Fireblocks
  - BitGo

### Backend Service Key

- **Never** store in .env file on server
- Use secrets manager:
  - AWS Secrets Manager
  - HashiCorp Vault
  - Azure Key Vault

- Or use custody provider API:
  - Fireblocks: Policy = "Can only call collectRevenue"
  - Coinbase Custody: Whitelisted contract functions

---

## 📈 Operational Workflow

### Daily Operations (Automated)

1. Backend collects revenue → `collectRevenue()`
2. Revenue splits 15/85 automatically
3. Stakers earn rewards automatically
4. Reserve accumulates in contract

**No manual intervention needed.**

### Monthly Operations (Manual via Multisig)

1. Review reserve balance
2. Decide usage:
   - Buyback TTX to boost price
   - Fund marketing campaign
   - Operational expenses
3. Queue timelock operation
4. Wait 24 hours
5. Execute operation
6. Funds released to approved destination

---

## ✅ Security Checklist

Before going live:

- [ ] Gnosis Safe created with 2+ signers
- [ ] Hardware wallets secured
- [ ] Contract deployed with multisig as owner
- [ ] Backend has REVENUE_COLLECTOR_ROLE only
- [ ] Backend key in custody/secrets manager
- [ ] Destination allowlist configured
- [ ] Event monitoring set up
- [ ] Emergency contacts identified
- [ ] Pause procedure tested
- [ ] Timelock delay verified (24+ hours)
- [ ] Withdrawal caps verified
- [ ] Contract verified on Etherscan
- [ ] Audit completed (optional but recommended)

---

## 🆘 Support Contacts

- **Smart Contract Issues**: [Your contract auditor]
- **Custody Provider**: [Fireblocks/Coinbase support]
- **Infrastructure**: [Your DevOps team]
- **Emergency**: [Your phone, backup phone]

---

## 📚 Additional Resources

- **Gnosis Safe Docs**: https://docs.safe.global
- **OpenZeppelin Access Control**: https://docs.openzeppelin.com/contracts/access-control
- **Timelock Patterns**: https://ethereum.org/en/developers/docs/smart-contracts/security/
- **Fireblocks**: https://developers.fireblocks.com

---

## Summary

You now have:

1. ✅ **Multisig control** - No single person can steal funds
2. ✅ **Role separation** - Backend can only deposit
3. ✅ **Timelock protection** - 24-hour delay on withdrawals
4. ✅ **Allowlist** - Funds only go to approved addresses
5. ✅ **Automatic caps** - Daily/monthly limits
6. ✅ **Emergency pause** - Stop everything if needed
7. ✅ **Full monitoring** - Track every transaction

**Result**: Developers can build features safely. Only you (via multisig) can move funds, with multiple safeguards and delays.
