import {
  DriftClient,
  Wallet,
} from '@drift-labs/sdk';
import { BN } from '@coral-xyz/anchor';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function main() {
  // Load wallet keypair from env path
  const keypairPath = process.env.WALLET_KEYPAIR_PATH;
  if (!keypairPath) throw new Error('WALLET_KEYPAIR_PATH not set in .env');
  const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, 'utf8')));
  const keypair = Keypair.fromSecretKey(secretKey);

  // Connection
  const rpcUrl = process.env.RPC_ENDPOINT || process.env.SOLANA_CLUSTER_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  // Wallet & DriftClient
  const wallet = new Wallet(keypair);
  const driftClient = new DriftClient({
    connection,
    wallet,
    env: 'devnet',
  });

  await driftClient.subscribe();

  // Mint and USDC ATA from env
  if (!process.env.MINT_PUBLIC_KEY) throw new Error('MINT_PUBLIC_KEY not set in .env');
  const usdcMint = new PublicKey(process.env.MINT_PUBLIC_KEY);

  // Derive or verify associated token account
  const associatedTokenAccount = await getAssociatedTokenAddress(usdcMint, wallet.publicKey);

  // Check if ATA exists
  const ataAccountInfo = await connection.getAccountInfo(associatedTokenAccount);
  if (!ataAccountInfo) {
    console.log('Creating associated token account for USDC...');
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,          // payer
        associatedTokenAccount,    // ATA address
        wallet.publicKey,          // owner
        usdcMint                  // mint
      )
    );
    const signature = await connection.sendTransaction(tx, [keypair]);
    console.log('Created ATA, tx:', signature);
    // Optionally wait for confirmation:
    await connection.confirmTransaction(signature, 'confirmed');
  } else {
    console.log('Associated token account already exists:', associatedTokenAccount.toBase58());
  }

  // Amount to deposit: 100 USDC with 6 decimals (adjust if needed)
  const FAUCET_AMOUNT = 100 * 1e6; // 100 USDC
  const depositAmount = new BN(FAUCET_AMOUNT);

  // Now call deposit on Drift
  const txSig = await driftClient.deposit(depositAmount, 0 /* marketIndex - you need to check your USDC market index */, associatedTokenAccount);
  console.log(`✅ Deposit successful! Tx: ${txSig}`);

  await driftClient.unsubscribe();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
