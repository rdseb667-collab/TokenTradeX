# Technical Gaps and Limitations

This document outlines known technical gaps, limitations, and areas for improvement in the TokenTradeX platform.

## RWA Token Security Model

### Factory-Only Token Transfer Enforcement

**Status**: ✅ IMPLEMENTED

**Description**: 
RWAToken contracts now restrict direct ERC-20 transfers to prevent bypassing platform controls. Only the RWATokenFactory contract can move tokens, ensuring all transfers go through the proper compliance and fee collection mechanisms.

**Implementation Details**:
- Overrode `transfer` and `transferFrom` functions in RWAToken to only allow the factory contract
- Added `factoryTransfer` function that can only be called by the factory
- Updated factory's `transferAssetToken` function to use the new factory-only transfer mechanism
- Added factory pause check inside all RWAToken transfer, mint, and burn paths

**Benefits**:
- Prevents bypass of KYC requirements through direct ERC-20 transfers
- Ensures platform fees are collected on all token movements
- Maintains pause functionality control at the factory level
- Enforces compliance checks for all token transfers
- Emergency pause reliably halts token movement even if upstream guards are missed

**Files Modified**:
- `contracts/RWATokenFactory.sol`

## Other Technical Gaps

*(This section will be populated as other technical gaps are identified)*