import { Connection, clusterApiUrl } from '@solana/web3.js';
import { DriftClient, getMarketsAndOraclesForSubscription } from '@drift-labs/sdk';
import { getWalletFromEnv } from '../../wallet/wallet';

async function getPositions() {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const wallet = getWalletFromEnv();

  console.log('Wallet Public Key:', wallet.publicKey.toBase58());

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

  const user = driftClient.getUser();
  const positions = user.getUserAccount().perpPositions;

  positions.forEach((position, index) => {
    if (position.baseAssetAmount.toNumber() !== 0) {
      console.log(`Position ${index}:`, position);
    }
  });

  await driftClient.unsubscribe();
}

getPositions().catch(console.error);
