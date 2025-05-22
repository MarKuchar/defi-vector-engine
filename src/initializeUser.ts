// src/forceInitializeUser.ts
import 'dotenv/config';
import { Connection } from '@solana/web3.js';
import { DriftClient, getMarketsAndOraclesForSubscription } from '@drift-labs/sdk';
import { getWalletFromEnv } from './wallet';

async function main() {
  const connection = new Connection(process.env.SOLANA_CLUSTER_URL!, 'confirmed');
  const wallet = getWalletFromEnv();

  console.log('Wallet Public Key:', wallet.publicKey.toBase58());
  console.log('SOLANA_CLUSTER_URL:', process.env.SOLANA_CLUSTER_URL);
  console.log('WALLET_PATH:', process.env.WALLET_PATH);


  const { perpMarketIndexes, spotMarketIndexes, oracleInfos } = getMarketsAndOraclesForSubscription('devnet');

  const driftClient = new DriftClient({
    connection,
    wallet,
    env: 'devnet',
    perpMarketIndexes,
    spotMarketIndexes,
    oracleInfos,
  });

  await driftClient.subscribe();

  try {
    console.log('Attempting to initialize user account...');
    await driftClient.initializeUserAccount();
    console.log('Initialization tx sent, waiting for confirmation...');
  } catch (err) {
    console.error('Error during user initialization:', err);
  }

  // Wait for user to show up
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const user = driftClient.getUser();
    if (user) {
      console.log('User account successfully initialized!');
      break;
    } else {
      console.log(`Waiting for user to initialize... (${i + 1}/15)`);
    }
  }

  await driftClient.unsubscribe();
}

main().catch(console.error);
