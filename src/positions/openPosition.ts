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
import { checkOracleFreshness } from '../oracle/checkOracleFreshness'
dotenv.config();

const ALLOWED_ORACLE_DELAY_SECONDS = 30; // Example threshold

async function openPosition() {
  const connection = new Connection(process.env.SOLANA_CLUSTER_URL!, 'confirmed');
  const wallet = getWalletFromEnv();

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

  const marketIndex = 1;
  const baseAssetAmount = new BN(10_000_000); // 1.0 base asset with 6 decimals

  // ✅ Oracle delay check

  const oracleDelay = await checkOracleFreshness();
  console.log(`Oracle delay for market ${marketIndex}: ${oracleDelay}s`);

  if (oracleDelay !== undefined && oracleDelay > ALLOWED_ORACLE_DELAY_SECONDS) {
    console.warn(`🚨 Oracle data too stale. Skipping position open.`);
    await driftClient.unsubscribe();
    return;
  }

  console.log('Perp markets:', perpMarketIndexes);
    const perpMarkets = driftClient.getPerpMarketAccounts();
perpMarkets.forEach((market, index) => {
  console.log(`Market Index: ${index}, Market Name: ${decodeMarketName(market.name)}`);
});
  console.log('Spot markets:', spotMarketIndexes);

  // ✅ Optional: Log current oracle price
  const oraclePrice = await driftClient.getOracleDataForPerpMarket(marketIndex);
  console.log(`Oracle price: ${oraclePrice.price.toString()}`);

  console.log('📤 Placing perp order...');
  const orderTxSig = await driftClient.placePerpOrder({
    orderType: OrderType.MARKET,
    marketIndex,
    baseAssetAmount,
    direction: PositionDirection.LONG,
  });

  console.log('✅ Position opened! Tx Signature:', orderTxSig);

  await driftClient.unsubscribe();
}

openPosition().catch((err) => {
  console.error('❌ Error placing order:', err);
});


function decodeMarketName(asciiArray: any[]) {
  return asciiArray.map(code => String.fromCharCode(code)).join('').trim();
}