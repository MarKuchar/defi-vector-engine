import { Connection, PublicKey } from "@solana/web3.js";
import { DriftClient, getMarketsAndOraclesForSubscription } from "@drift-labs/sdk";
import { getWalletFromEnv } from "../wallet/wallet";
import { parsePriceData } from "@pythnetwork/client";
import dotenv from "dotenv";
dotenv.config();

const RPC_ENDPOINT = process.env.SOLANA_CLUSTER_URL || "https://api.devnet.solana.com";
const connection = new Connection(RPC_ENDPOINT, "confirmed");

// Hardcoded Pyth program key for devnet only
const PYTH_devnet_PROGRAM_KEY = new PublicKey("FsJDrmtae3RkHzzcCqcC12zBQGp3G4w5KZXd2N9h9rX");

export async function checkOracleFreshness() {
  const wallet = getWalletFromEnv();
  const { perpMarketIndexes, spotMarketIndexes, oracleInfos } = getMarketsAndOraclesForSubscription("devnet");

  const driftClient = new DriftClient({
    connection,
    wallet,
    env: "devnet",
    perpMarketIndexes,
    spotMarketIndexes,
    oracleInfos,
  });

  await driftClient.subscribe();

  const currentSlot = await connection.getSlot();
  console.log(`Current slot: ${currentSlot}\n`);
  console.log("Pyth program key:", PYTH_devnet_PROGRAM_KEY.toBase58());

  const perpMarkets = driftClient.getPerpMarketAccounts();

  for (const market of perpMarkets) {
    const marketIndex = market.marketIndex;
    const oraclePubkey = market.amm.oracle;

    try {
      const accountInfo = await connection.getAccountInfo(oraclePubkey);
      if (!accountInfo) {
        // console.log(`#${marketIndex} ${oraclePubkey.toBase58()} - Oracle account not found`);
        continue;
      }

      if (!accountInfo.owner.equals(PYTH_devnet_PROGRAM_KEY)) {
        // console.log(`#${marketIndex} ${oraclePubkey.toBase58()} - Not a Pyth account, skipping`);
        continue;
      }

      const priceData = parsePriceData(accountInfo.data);

      // console.log(`#${marketIndex} ${oraclePubkey.toBase58()} - Last publish slot: ${priceData.lastSlot}`);
    } catch (e) {
      console.error(`#${marketIndex} ${oraclePubkey.toBase58()} - ❌ Error reading oracle:`, e);
    }
  }

  await driftClient.unsubscribe();
}

checkOracleFreshness().catch(console.error);
