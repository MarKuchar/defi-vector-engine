import 'dotenv/config';
import { Connection } from '@solana/web3.js';
import { DriftClient, getMarketsAndOraclesForSubscription } from '@drift-labs/sdk';
import { getWalletFromEnv } from '../wallet/wallet';

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

  const user = driftClient.getUser();
  if (!user) {
    console.log('User not found. Make sure your user is initialized.');
    return;
  }
  await user.fetchAccounts(); 
  const positions = user.getUserAccount().perpPositions;

  console.log('\n📊 Current Perp Positions:\n');

  positions.forEach((position) => {
  console.log(`- Market Index: ${position.marketIndex}`);
  console.log(`  Base Asset Amount: ${position.baseAssetAmount.toString()}`);
  console.log(`  Quote Asset Amount: ${position.quoteAssetAmount.toString()}`);
  console.log(`  Entry Price (approx): ${position.quoteEntryAmount.toString()}`);
  console.log('---');
});
  const nonZeroPositions = positions.filter(p => !p.baseAssetAmount.isZero());

  if (nonZeroPositions.length === 0) {
    console.log('No open perp positions.');
  } else {
    nonZeroPositions.forEach((position) => {
      console.log(`- Market Index: ${position.marketIndex}`);
      console.log(`  Base Asset Amount: ${position.baseAssetAmount.toString()}`);
      console.log(`  Quote Asset Amount: ${position.quoteAssetAmount.toString()}`);
      console.log(`  Entry Price (approx): ${position.quoteEntryAmount.toString()}`);
      console.log('---');
    });
  }

  await driftClient.unsubscribe();
}

main().catch((err) => {
  console.error('Error checking position:', err);
});
