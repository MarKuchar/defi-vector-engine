import dotenv from "dotenv";
import { Connection, PublicKey } from '@solana/web3.js';
import {
  DriftClient,
  getMarketsAndOraclesForSubscription,
} from '@drift-labs/sdk';
import BN from 'bn.js';
import { getWalletFromEnv } from '../wallet/wallet';
dotenv.config();

async function depositCollateral() {
  const connection = new Connection(process.env.SOLANA_CLUSTER_URL!, 'confirmed');
  const wallet = getWalletFromEnv();
  const usdcAta = new PublicKey(process.env.TOKEN_ACCOUNT_PUBLIC_KEY!);

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

    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      user = driftClient.getUser();
      if (user) break;
      console.log(`Waiting for user to initialize... (${i + 1}/10)`);
    }
    if (!user) throw new Error('User initialization timed out.');
  }

  let usdcSpotMarketIndex: number | undefined;
  for (const index of spotMarketIndexes) {
    const spotMarket = driftClient.getSpotMarketAccount(index);
    if (spotMarket && spotMarket.mint.toBase58() === process.env.MINT!) {
      usdcSpotMarketIndex = index;
      break;
    }
  }
  if (usdcSpotMarketIndex === undefined) {
    throw new Error('Spot market index not found');
  }

  const depositAmount = new BN(10 * 1_000_000); 
  console.log(`Depositing 10 to index ${usdcSpotMarketIndex}...`);
  const depositTxSig = await driftClient.deposit(depositAmount, usdcSpotMarketIndex, usdcAta);
  console.log('Deposit tx signature:', depositTxSig);

  await driftClient.unsubscribe();
}

depositCollateral().catch((err) => {
  console.error('Error during deposit:', err);
});
