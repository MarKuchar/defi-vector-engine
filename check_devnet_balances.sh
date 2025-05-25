#!/bin/bash

RPC_URL="https://api.devnet.solana.com"
WALLET_PUBKEY="5Sg6QH6U1fhXcMoQSBX5CJJTD7q2T9dpJH3G1HkQ6w7m"
TOKEN_ACCOUNT_PUBKEY="CAqsq7j8sAx62y5JN5xELzCR6JqT5Rc8fWuKCzSK96YW"
PROGRAM_ID="4ckmDgGzLYLyL3Xx3UczZzZbcfwgpSLyXz5jf2oF2LVv"

echo "=== Checking SOL balance for wallet $WALLET_PUBKEY ==="
solana balance "$WALLET_PUBKEY" --url "$RPC_URL"

echo -e "\n=== Listing all token accounts for wallet $WALLET_PUBKEY ==="
spl-token accounts --owner "$WALLET_PUBKEY" --url "$RPC_URL"

echo -e "\n=== Detailed info for TOKEN ACCOUNT $TOKEN_ACCOUNT_PUBKEY ==="
TOKEN_ACCOUNT_INFO=$(spl-token account-info "$TOKEN_ACCOUNT_PUBKEY" --url "$RPC_URL" 2>&1)
echo "$TOKEN_ACCOUNT_INFO"

# Extract Mint address from token account info
MINT=$(echo "$TOKEN_ACCOUNT_INFO" | grep 'Mint:' | awk '{print $2}')

if [ -z "$MINT" ]; then
  echo "⚠️ Could not extract Mint address from token account info."
else
  echo -e "\n=== Mint info for MINT $MINT ==="
  spl-token mint "$MINT" --url "$RPC_URL"
fi

echo -e "\n=== Confirming ownership of TOKEN ACCOUNT matches WALLET ==="
OWNER_IN_TOKEN_ACCOUNT=$(echo "$TOKEN_ACCOUNT_INFO" | grep Owner | awk '{print $2}')
echo "Owner in token account: $OWNER_IN_TOKEN_ACCOUNT"
if [ "$OWNER_IN_TOKEN_ACCOUNT" == "$WALLET_PUBKEY" ]; then
    echo "✔ Ownership verified"
else
    echo "⚠️ Ownership mismatch! Check your token account owner."
fi

echo -e "\n=== Checking if program ID $PROGRAM_ID is deployed on DevNet ==="
solana program show "$PROGRAM_ID" --url "$RPC_URL" || echo "Program not found or not deployed."
