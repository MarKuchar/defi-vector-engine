import 'dotenv/config';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { DriftClient, getMarketsAndOraclesForSubscription, DriftClientConfig } from '@drift-labs/sdk';
import { getWalletFromEnv } from '../../wallet/wallet';
import dotenv from 'dotenv';
dotenv.config();

async function checkBalance() {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const wallet = getWalletFromEnv();

  console.log('Wallet Public Key:', wallet.publicKey.toBase58());

  const { perpMarketIndexes, spotMarketIndexes, oracleInfos } = getMarketsAndOraclesForSubscription('devnet');

  const driftClientConfig: DriftClientConfig = {
    connection,
    wallet,
    env: 'devnet',
    perpMarketIndexes,
    spotMarketIndexes,
    oracleInfos,
  };

  const driftClient = new DriftClient(driftClientConfig);
  await driftClient.subscribe();

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet balance: ${balance / 1e9} SOL`);

  await driftClient.unsubscribe();
}

(async () => {
  try {
    await checkBalance();
  } catch (e) {
    console.error('Error:', e);
  }
})();
