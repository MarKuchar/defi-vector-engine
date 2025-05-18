import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import {
  DriftClient,
  initialize,
  PositionDirection,
  OrderType,
  BN,
  BulkAccountLoader,
} from '@drift-labs/sdk';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Connect to Solana devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Create AnchorProvider from existing connection
  const provider = AnchorProvider.local('https://api.devnet.solana.com');
  const wallet = provider.wallet as Wallet;

  // Initialize Drift SDK environment
  initialize({
    env: 'devnet',
    overrideEnv: {},
  });

  // Setup account loader for polling mode (required)
  const accountLoader = new BulkAccountLoader(connection, 'confirmed', 500);

  // Instantiate DriftClient
  const driftClient = new DriftClient({
    connection,
    wallet,
    env: 'devnet',
    accountSubscription: {
      type: 'polling',
      accountLoader,
    },
  });

  // Subscribe to accounts
  await driftClient.subscribe();

  // Initialize user account if needed
  const userAccount = driftClient.getUserAccount();

  if (!userAccount) {
    await driftClient.initializeUserAccount();
  } else {
    console.log('User account already initialized.');
  }

  // Deposit collateral
  const depositAmount = new BN(1_000_000); // 1 USDC with 6 decimals
  const marketIndex = 0;                    // usually 0 is USDC spot market index

  // For native SOL, associatedTokenAccount = wallet public key
  // For SPL tokens like USDC, you'd find the associated token account address for the wallet
  // Here we assume native SOL or you have the correct token account PublicKey
  const associatedTokenAccount = wallet.publicKey; 

  try {
    const txSig1 = await driftClient.deposit(
      depositAmount,
      marketIndex,
      associatedTokenAccount
      // subAccountId, reduceOnly, txParams are optional
    );
    console.log("Deposit tx:", txSig1);
  } catch (e) {
    console.error('Deposit failed:', e);
    return;
  }

  // Get perp market info
  const perpMarketIndex = 0;
  const market = driftClient.getPerpMarketAccount(perpMarketIndex);
  if (!market) throw new Error(`Market not found for index ${perpMarketIndex}`);

  // Use the market's minimum order step size (BN)
  const orderStepSize = market.amm.orderStepSize;

  // Place a limit long order
  const txSig2 = await driftClient.placePerpOrder({
    marketIndex: perpMarketIndex,
    direction: PositionDirection.LONG,
    baseAssetAmount: orderStepSize,
    price: new BN(100_000_000), // $100 price scaled
    orderType: OrderType.LIMIT,
  });

  console.log(`✅ Order placed: ${txSig2}`);
}

main().catch((e) => {
  console.error('❌ Error running script:', e);
});
