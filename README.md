# Drift Trading Bot

## Overview

This bot interacts with the Solana Drift protocol to manage USDC collateral, open and monitor positions, and handle user accounts.

---

## Folder Structure

- `accounts/`: Manage token accounts and balances.
- `collateral/`: Handle collateral deposit and management.
- `positions/`: Open and query trading positions.
- `user/`: Initialize user-specific on-chain state.
- `wallet/`: Wallet and keypair utilities.
- `utils/`: Helper functions.
- `index.ts`: Main orchestrator script (if applicable).

---

## Setup & Usage

1. Configure your wallet in `wallet.ts`.
2. Check and create necessary token accounts:
   - `checkTokenAccount.ts`
   - `create-usdc-ata.ts`
   - `check-usdc-balance.ts`
3. Initialize your user with `initializeUser.ts`.
4. Deposit collateral using `depositCollateral.ts` and ensure it using `ensureCollateral.ts`.
5. Open positions using `openPosition.ts`.
6. Query and monitor positions with `checkPosition.ts` and `getPositions.ts`.
7. Use utility functions from `utils.ts` where needed.

---

## Next Steps

- Implement automated logic for opening and closing positions based on strategy signals.
- Integrate event listeners or polling to react to position changes.
- Add error handling and retries for network or on-chain failures.
- Consider building a UI or CLI wrapper to control the bot interactively.

---

## Notes

- Make sure your Solana CLI is configured to the desired network (devnet/mainnet).
- Keep your keypair secure and never expose it publicly.


# Solana SPL Token CLI Commands Reference

Replace the placeholders (`<OWNER_PUBLIC_KEY>`, `<MINT_ADDRESS>`, `<RECIPIENT_ADDRESS>`, `<RPC_ENDPOINT>`) with your actual values.

```bash
# Set environment variables (adjust accordingly)
export RPC_ENDPOINT=https://api.devnet.solana.com
export OWNER_PUBLIC_KEY=<YOUR_OWNER_PUBLIC_KEY>
export MINT=<YOUR_TOKEN_MINT_ADDRESS>

# 1. List all token accounts owned by your wallet on the specified cluster
#    Shows all SPL token accounts, their mint addresses, and balances
spl-token accounts --owner $OWNER_PUBLIC_KEY --url $RPC_ENDPOINT

# 2. List token accounts with output in JSON format (useful for automation or scripts)
spl-token accounts --owner $OWNER_PUBLIC_KEY --url $RPC_ENDPOINT --output json

# 3. Check the token balance of a specific mint
spl-token balance $MINT --owner $OWNER_PUBLIC_KEY --url $RPC_ENDPOINT

# 4. Create an associated token account (ATA) for a mint (if it doesn't already exist)
spl-token create-account $MINT --owner $OWNER_PUBLIC_KEY --url $RPC_ENDPOINT

# 5. Transfer tokens from your wallet to another address
spl-token transfer $MINT <RECIPIENT_ADDRESS> <AMOUNT> --owner $OWNER_PUBLIC_KEY --url $RPC_ENDPOINT

# 6. Get detailed information about a token mint (decimals, supply, authority, etc.)
spl-token mint-info $MINT --url $RPC_ENDPOINT

# 7. (Programmatic) Generate the Associated Token Account (ATA) address using solana-web3.js

# JavaScript example:
#
# ```js
# import { PublicKey } from '@solana/web3.js';
# import { getAssociatedTokenAddress } from '@solana/spl-token';
#
# (async () => {
#   const mintPubkey = new PublicKey('<YOUR_TOKEN_MINT_ADDRESS>');
#   const ownerPubkey = new PublicKey('<YOUR_OWNER_PUBLIC_KEY>');
#   const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey);
#   console.log('Associated Token Account (ATA):', ata.toBase58());
# })();
# ```
