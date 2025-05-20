import 'dotenv/config';
import { Connection, clusterApiUrl, Keypair, PublicKey } from '@solana/web3.js';
import {
  DriftClient,
  getMarketsAndOraclesForSubscription,
  DriftClientConfig,
  OrderType,
  PositionDirection,
} from '@drift-labs/sdk';
import BN from 'bn.js';
import { getWalletFromEnv } from './wallet';

async function safeOpenPosition(driftClient: DriftClient, marketIndex: number, amountRaw: number) {
  // Check if user account exists for this wallet
  const userAccount = await driftClient.getUserAccount();
  if (!userAccount) {
    console.log('User does not exist. Initializing user account...');
    await driftClient.initializeUserAccount();
    console.log('User initialized');
  } else {
    console.log('User already exists');
  }

  console.log(`Opening long position on market ${marketIndex} with amount ${amountRaw}...`);

  // Convert amount to BN (assuming amountRaw is in base units, adjust if needed)
  const amount = new BN(amountRaw);
  const orderParams = {
  orderType: OrderType.MARKET,        // or OrderType.LIMIT
  marketIndex: marketIndex,
  baseAssetAmount: amount,
  direction: PositionDirection.LONG,
  // Optional:
  // price: someBN,   // required for LIMIT orders
  // reduceOnly: false,
  // postOnly: false,
  // immediateOrCancel: false,
};


  const txSig = await driftClient.placePerpOrder(orderParams);

  console.log('Position opened, tx signature:', txSig);
}

async function main() {
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

  try {
    const marketIndex = 0; // example market index
    const amountRaw = 10000000; // example amount in base units (adjust as needed)

    await safeOpenPosition(driftClient, marketIndex, amountRaw);
  } catch (e) {
    console.error('Error opening position:', e);
  }

  await driftClient.unsubscribe();
}

(async () => {
  try {
    await main();
  } catch (e) {
    console.error('Fatal error:', e);
  }
})();
