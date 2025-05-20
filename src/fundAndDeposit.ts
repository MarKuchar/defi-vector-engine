import {
  DriftClient,
  Wallet,
  initialize,
} from '@drift-labs/sdk';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { Connection, Keypair } from '@solana/web3.js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function main() {
  // Load keypair
  const keypairPath = process.env.WALLET_KEYPAIR_PATH || path.resolve(__dirname, '../.wallet/devnet.json');
  const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, 'utf8')));
  const keypair = Keypair.fromSecretKey(secretKey);

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = new Wallet(keypair);

  // Initialize SDK
  const sdkConfig = initialize({ env: 'devnet' });
  const driftClient = new DriftClient({
    connection,
    wallet,
    env: 'devnet',
  });

  await driftClient.subscribe();

  // Find USDC market
  const usdcMarket = sdkConfig.SPOT_MARKETS.find((m) => m.symbol === 'USDC');
  if (!usdcMarket) throw new Error('USDC market not found');

  const usdcMint = usdcMarket.mint;

  // Derive user's associated token account for USDC
  // Note: This function takes (ownerPubkey, mintPubkey)
  const associatedTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    wallet.publicKey
  );
  // Normally, you’d need to mint or get USDC tokens in your account here
  // The SystemProgram.transfer in your original code doesn't mint USDC, just lamports SOL

  // Deposit to Drift
  const depositAmount = new BN(100_000); // 100 USDC with 6 decimals
  const txSig = await driftClient.deposit(depositAmount, usdcMarket.marketIndex, associatedTokenAccount);
  console.log(`✅ Deposit successful! Tx: ${txSig}`);

  await driftClient.unsubscribe();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
