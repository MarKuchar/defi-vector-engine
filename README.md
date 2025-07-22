# Drift Trading Bot
[![Node.js CI](https://github.com/yourusername/drift-trading-bot/actions/workflows/node.js.yml/badge.svg)](https://github.com/yourusername/drift-trading-bot/actions/workflows/node.js.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Automated market-making and mean-reversion trading bot for Solana's Drift Protocol.

## 📋 Prerequisites

### Hardware
- Minimum: 2 CPU cores, 4GB RAM, 50GB SSD
- Recommended: 4+ CPU cores, 8GB RAM, NVMe SSD (for low-latency trading)

### Software
- Node.js 18.x+
- Yarn 1.22.x+
- Solana CLI 1.10.x+
- Docker 20.x+ (optional for containerization)

### API Keys
- Drift API access
- Pyth oracle mainnet endpoint
- Private RPC endpoint (recommended)

## 🛠 Installation

```bash
# Clone repository
git clone https://github.com/yourusername/drift-trading-bot.git
cd drift-trading-bot

# Install dependencies
yarn install

# Set up environment
cp .env.example .env

## Overview

This bot interacts with the Solana Drift protocol to manage USDC collateral, open and monitor positions, handle market data, and ensure proper setup of token accounts and oracles.

---

## Folder Structure

- `accounts/`: Check balances and token accounts.
- `bot.ts`: Entrypoint for running the trading bot logic.
- `collateral/`: Mint, fund, and deposit USDC collateral.
- `config/`: Market configuration and constants.
- `oracle/`: Check oracle price feed freshness.
- `positions/`: Open, check, and fetch trading positions.
- `services/`: External market data services.
- `utils/`: Helper functions for market, connections, and price fetching.
- `wallet/`: Wallet configuration and keypair access.
- `index.ts`: Script orchestrator (if used).
- `env.d.ts`: Type declarations.

---

## Commands

Each command can be executed using `npx ts-node`:

### Account Checks

- ✅ Check USDC balance:  
  `npx ts-node src/accounts/check-usdc-balance.ts`

- ✅ Check token accounts:  
  `npx ts-node src/accounts/checkTokenAccount.ts`

### Collateral Management

- ✅ Ensure collateral (check/freeze/unfreeze):  
  `npx ts-node src/collateral/ensureCollateral.ts`

- ✅ Deposit collateral:  
  `npx ts-node src/collateral/depositCollateral.ts`

- ✅ Mint test USDC for devnet:  
  `npx ts-node src/collateral/mintTestUSDC.ts`

### Position Management

- ✅ Open a position:  
  `npx ts-node src/positions/openPosition.ts`

- ✅ Get all positions:  
  `npx ts-node src/positions/getPositions.ts`

- ✅ Check a specific position:  
  `npx ts-node src/positions/checkPosition.ts`

---

## Setup & Usage

1. Configure your wallet in `wallet/wallet.ts`.
2. Check/create token accounts:
   - `checkTokenAccount.ts`
   - `check-usdc-balance.ts`
3. Optionally mint USDC on devnet with `mintTestUSDC.ts`.
4. Deposit collateral using `depositCollateral.ts` or `ensureCollateral.ts`.
5. Open positions with `openPosition.ts`.
6. Monitor positions with `getPositions.ts` or `checkPosition.ts`.

---

## Next Steps

- Automate strategies for opening/closing positions.
- Use listeners or polling for reactive updates.
- Improve retry logic and error handling.
- Optionally build a CLI or UI for easier control.

---

## Notes

- Ensure your Solana CLI is configured correctly (`devnet` recommended for testing).
- Never expose your keypair files or secrets.

---

## Solana SPL Token CLI Reference

```bash
export RPC_ENDPOINT=https://api.devnet.solana.com
export OWNER_PUBLIC_KEY=<YOUR_OWNER_PUBLIC_KEY>
export MINT=<YOUR_TOKEN_MINT_ADDRESS>

# List all token accounts
spl-token accounts --owner $OWNER_PUBLIC_KEY --url $RPC_ENDPOINT

# Check balance
spl-token balance $MINT --owner $OWNER_PUBLIC_KEY --url $RPC_ENDPOINT

# Create ATA
spl-token create-account $MINT --owner $OWNER_PUBLIC_KEY --url $RPC_ENDPOINT

# Transfer tokens
spl-token transfer $MINT <RECIPIENT_ADDRESS> <AMOUNT> --owner $OWNER_PUBLIC_KEY --url $RPC_ENDPOINT

# Mint info
spl-token mint-info $MINT --url $RPC_ENDPOINT

## ⚙️ Configuration
RPC_URL=your_private_rpc_endpoint
DRIFT_ENV=mainnet # or devnet
MARKET_INDEX=0 # 0 = SOL-PERP
STRATEGY_NAME=meanReversion