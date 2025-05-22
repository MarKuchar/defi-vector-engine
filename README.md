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
