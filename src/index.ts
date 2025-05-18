import { Connection, Keypair } from '@solana/web3.js';
import { DriftClient, initialize } from '@drift-labs/sdk';
import { KeypairWallet } from './wallet';
import { clusterApiUrl } from '@solana/web3.js';
import dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const clusterUrl = process.env.SOLANA_CLUSTER_URL || clusterApiUrl('devnet');
const connection = new Connection(clusterUrl, 'confirmed');

const keypairPath = process.env.WALLET_KEYPAIR_PATH!;
const secretKeyString = fs.readFileSync(keypairPath, 'utf8');
const secretKey = Uint8Array.from(JSON.parse(secretKeyString));

const keypair = Keypair.fromSecretKey(secretKey);

const wallet = new KeypairWallet(keypair);
(async () => {
  try {
    await initialize({ env: 'devnet' });

    const driftClient = new DriftClient({
      connection,
      wallet,
      env: 'devnet',
    });

    console.log('Drift client initialized for wallet:', wallet.publicKey.toBase58());
  } catch (error) {
    console.error('Error initializing Drift client:', error);
  }
})();
