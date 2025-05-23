import 'dotenv/config';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import {
  DriftClient,
  getMarketsAndOraclesForSubscription,
  OrderType,
  PositionDirection,
} from '@drift-labs/sdk';
import BN from 'bn.js';
import { getWalletFromEnv } from './wallet';

async function main() {
  const connection = new Connection(process.env.SOLANA_CLUSTER_URL!, 'confirmed');
  const wallet = getWalletFromEnv();

  console.log('Wallet Public Key:', wallet.publicKey.toBase58());

  const { perpMarketIndexes, spotMarketIndexes, oracleInfos } =
    getMarketsAndOraclesForSubscription('devnet');

  const driftClient = new DriftClient({
    connection,
    wallet,
    env: 'devnet',
    perpMarketIndexes,
    spotMarketIndexes,
    oracleInfos,
  });

  await driftClient.subscribe();

  let user = driftClient.getUser();
  if (!user) {
    console.log('No user found. Initializing user account...');
    await driftClient.initializeUserAccount();

    // Wait until the user appears in the DriftClient
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      user = driftClient.getUser();
      if (user) break;
      console.log(`Waiting for user to initialize... (${i + 1}/10)`);
    }

    if (!user) {
      throw new Error('User initialization timed out.');
    }
  }

  const marketIndex = 0;
  const baseAssetAmount = new BN(10_000_000); // = 1.0, because Drift uses 6 decimal places

  console.log('Placing order...');
  const txSig = await driftClient.placePerpOrder({
    orderType: OrderType.MARKET,
    marketIndex,
    baseAssetAmount,
    direction: PositionDirection.LONG,
  });

  console.log('Position opened! Tx Signature:', txSig);

  await driftClient.unsubscribe();
}

main().catch((err) => {
  console.error('Error running script:', err);
});
