import dotenv from "dotenv";
import { Connection } from '@solana/web3.js';
import {
  DriftClient,
  getMarketsAndOraclesForSubscription,
  OrderType,
  PositionDirection,
} from '@drift-labs/sdk';
import BN from 'bn.js';
import { getWalletFromEnv } from '../wallet/wallet';
dotenv.config();

async function openPosition() {
  const connection = new Connection(process.env.SOLANA_CLUSTER_URL!, 'confirmed');
  const wallet = getWalletFromEnv();

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

  const marketIndex = 0;
  const baseAssetAmount = new BN(10_000_000); // 1.0 base asset with 6 decimals

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

openPosition().catch((err) => {
  console.error('Error placing order:', err);
});
