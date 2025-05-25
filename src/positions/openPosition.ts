import dotenv from "dotenv";
import { Connection, PublicKey } from '@solana/web3.js';
import {
  DriftClient,
  getMarketsAndOraclesForSubscription,
  OrderType,
  PositionDirection,
} from '@drift-labs/sdk';
import BN from 'bn.js';
import { getWalletFromEnv } from '../wallet/wallet';
dotenv.config();

async function main() {
  const connection = new Connection(process.env.SOLANA_CLUSTER_URL!, 'confirmed');
  const wallet = getWalletFromEnv();
  const usdcAta = new PublicKey(process.env.TOKEN_ACCOUNT_PUBLIC_KEY!); 

  console.log('Wallet Public Key:', wallet.publicKey.toBase58());

  // Load market and oracle info for devnet
  const { perpMarketIndexes, spotMarketIndexes, oracleInfos } =
    getMarketsAndOraclesForSubscription('devnet');

  // Create Drift client
  const driftClient = new DriftClient({
    connection,
    wallet,
    env: 'devnet',
    perpMarketIndexes,
    spotMarketIndexes,
    oracleInfos,
  });

  await driftClient.subscribe();

  // Initialize user account if not exists
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

  // Find USDC spot market index by mint
  let usdcSpotMarketIndex: number | undefined;

  console.log(driftClient.getSpotMarketAccounts().map(m => ({
    mint: m.mint.toBase58(),
    index: m.marketIndex.toString(),
  })));
  for (const index of spotMarketIndexes) {
    const spotMarket = driftClient.getSpotMarketAccount(index);
    if (spotMarket !== undefined && spotMarket.mint.toBase58() === process.env.MINT!) {
      usdcSpotMarketIndex = index;
      break;
    }
  }
  if (usdcSpotMarketIndex === undefined) {
    throw new Error('USDC spot market index not found');
  }
  console.log('USDC Spot Market Index:', usdcSpotMarketIndex);

  // Deposit 10 USDC collateral (10 * 1_000_000 because USDC has 6 decimals)
  const depositAmount = new BN(10 * 1_000_000);
  console.log(`Depositing 10 USDC collateral...`);
  const depositTxSig = await driftClient.deposit(
    depositAmount,            // amount to deposit (BN)
    usdcSpotMarketIndex,      // spot market index (number)
    usdcAta                   // associated token account (PublicKey)
  ); 
  console.log('Deposit tx signature:', depositTxSig);

  // Wait 5 seconds to ensure deposit processed
  await new Promise((r) => setTimeout(r, 5000));

  // Place perp order on market 0 (change as needed)
  const marketIndex = 0;
  const baseAssetAmount = new BN(10_000_000); // = 1.0 with 6 decimals

  console.log('Placing perp order...');
  const orderTxSig = await driftClient.placePerpOrder({
    orderType: OrderType.MARKET,
    marketIndex,
    baseAssetAmount,
    direction: PositionDirection.LONG,
  });

  console.log('Position opened! Tx Signature:', orderTxSig);

  await driftClient.unsubscribe();
}

main().catch((err) => {
  console.error('Error running script:', err);
});
