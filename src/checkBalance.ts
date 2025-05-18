import { Connection, clusterApiUrl, Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Use environment variables or defaults
const KEYPAIR_PATH = process.env.WALLET_KEYPAIR_PATH || '/Users/martycook/.config/solana/id.json';
const CLUSTER_URL = process.env.SOLANA_CLUSTER_URL || clusterApiUrl('devnet');

// Load your keypair
const secretKeyString = fs.readFileSync(KEYPAIR_PATH, 'utf8');
const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
const keypair = Keypair.fromSecretKey(secretKey);

// Connect to devnet
const connection = new Connection(CLUSTER_URL, 'confirmed');

async function checkBalance() {
  try {
    const balance = await connection.getBalance(keypair.publicKey);
    console.log('Balance (lamports):', balance);
    console.log('Balance (SOL):', balance / 1e9);
  } catch (err) {
    console.error('Error fetching balance:', err);
  }
}

async function main() {
  await checkBalance();
}

main();