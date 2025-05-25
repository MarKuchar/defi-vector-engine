import { Connection, Keypair } from '@solana/web3.js';
import { DriftClient, initialize } from '@drift-labs/sdk';
import { KeypairWallet } from './wallet';
import { clusterApiUrl } from '@solana/web3.js';
import dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const clusterUrl = process.env.SOLANA_CLUSTER_URL || clusterApiUrl('devnet');
const connection = new Connection(clusterUrl, 'confirmed');

function loadKeypair(): Keypair {
  if (process.env.WALLET_SECRET_KEY) {
    // Load secret key from environment variable (array string)
    const secretKey = Uint8Array.from(JSON.parse(process.env.WALLET_SECRET_KEY));
    return Keypair.fromSecretKey(secretKey);
  } else if (process.env.WALLET_KEYPAIR_PATH) {
    // Load secret key from file path
    const secretKeyString = fs.readFileSync(process.env.WALLET_KEYPAIR_PATH, 'utf8');
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    return Keypair.fromSecretKey(secretKey);
  } else {
    throw new Error('No wallet keypair found in WALLET_SECRET_KEY or WALLET_KEYPAIR_PATH');
  }
}

const keypair = loadKeypair();
const wallet = new KeypairWallet(keypair);

(async () => {
  try {
    // Initialize drift-labs SDK environment — match the env to your cluster (devnet/mainnet)

    await initialize({ env: 'devnet' });

    const driftClient = new DriftClient({
      connection,
      wallet,
      env: 'devnet',
      // optionally pass DRIFT_PROGRAM_ID if required by SDK:
      // programID: new PublicKey(process.env.DRIFT_PROGRAM_ID || ''),
    });

    console.log('Drift client initialized for wallet:', wallet.publicKey.toBase58());
  } catch (error) {
    console.error('Error initializing Drift client:', error);
  }
})();
