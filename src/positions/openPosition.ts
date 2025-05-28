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

// Config
const ENV = 'devnet'; // Change to 'mainnet-beta' when ready
const MARKET_INDEX = 0; // SOL
const BASE_ASSET_AMOUNT = new BN(10_000_000); // 0.1 SOL
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function executeTrade() {
  const connection = new Connection(process.env.SOLANA_CLUSTER_URL!, {
    commitment: 'confirmed'
  });
  
  const wallet = getWalletFromEnv();
  const { perpMarketIndexes, spotMarketIndexes, oracleInfos } = 
    getMarketsAndOraclesForSubscription(ENV);

  const driftClient = new DriftClient({
    connection,
    wallet,
    env: ENV,
    perpMarketIndexes,
    spotMarketIndexes,
    oracleInfos,
    opts: {
      skipPreflight: ENV === 'devnet', // Only skip on DevNet
      commitment: 'confirmed',
    },
    accountSubscription: {
      type: 'websocket',
      resubTimeoutMs: 15_000,
    },
  });

  try {
    await driftClient.subscribe();
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Trade attempt ${attempt}/${MAX_RETRIES}`);
        
        const txSig = await driftClient.placePerpOrder({
          orderType: OrderType.MARKET,
          marketIndex: MARKET_INDEX,
          baseAssetAmount: BASE_ASSET_AMOUNT,
          direction: PositionDirection.LONG,
        });

        console.log('✅ Trade executed successfully!');
        console.log('Tx:', txSig);
        return txSig;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt < MAX_RETRIES) await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
    
    throw new Error(`Failed after ${MAX_RETRIES} attempts`);
  } finally {
    await driftClient.unsubscribe();
  }
}

executeTrade().catch(err => {
  console.error('Trade failed:', err);
  process.exit(1);
});