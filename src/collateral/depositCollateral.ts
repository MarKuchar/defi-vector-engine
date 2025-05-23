import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { DriftClient, getMarketsAndOraclesForSubscription, DriftClientConfig, Wallet } from "@drift-labs/sdk";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import BN from "bn.js";
import dotenv from "dotenv";
import { getAccount } from "@solana/spl-token";

dotenv.config();

const RPC_ENDPOINT = process.env.RPC_ENDPOINT || "https://api.devnet.solana.com";
const usdcMint = new PublicKey(process.env.MINT!);
const PRIVATE_KEY = JSON.parse(process.env.PRIVATE_KEY!); // JSON array string from .env

const connection = new Connection(RPC_ENDPOINT, "confirmed");

async function main() {
  // Get markets and oracles info for devnet
  const { perpMarketIndexes, spotMarketIndexes, oracleInfos } = getMarketsAndOraclesForSubscription("devnet");

  // Create wallet from secret key
  const rawKeypair = Keypair.fromSecretKey(Uint8Array.from(PRIVATE_KEY));
  const wallet = new Wallet(rawKeypair);

  const driftClientConfig: DriftClientConfig = {
    connection,
    wallet,
    env: "devnet",
    perpMarketIndexes,
    spotMarketIndexes,
    oracleInfos,
  };

  const driftClient = new DriftClient(driftClientConfig);
  await driftClient.subscribe();

  // Find the spot market index for USDC
  const spotMarketIndex = spotMarketIndexes.find((index) => {
    const market = driftClient.getSpotMarketAccount(index);
    return market?.mint.equals(usdcMint);
  });

  if (spotMarketIndex === undefined) {
    throw new Error("USDC spot market not found.");
  }

  // Ensure user account is initialized
  let userAccount;
  try {
    userAccount = driftClient.getUserAccount();
  } catch {
    console.log("Initializing user account...");
    await driftClient.initializeUserAccount();
    userAccount = driftClient.getUserAccount();
  }

  // Get user's associated token account for USDC
    const userTokenAccount = await getAssociatedTokenAddress(usdcMint, wallet.publicKey);
  await checkUsdcBalance(userTokenAccount);
  // Amount to deposit: 1 USDC (USDC has 6 decimals)
  const amountToDeposit = new BN(1_000_000);

  // Deposit USDC as collateral
  await driftClient.deposit(amountToDeposit, spotMarketIndex, userTokenAccount);

  console.log("Deposit successful.");

  await driftClient.unsubscribe();
}

async function checkUsdcBalance(pubkey: PublicKey) {
  try {
    const accountInfo = await getAccount(connection, pubkey);
    console.log("USDC token balance:", Number(accountInfo.amount) / 1_000_000); // assuming 6 decimals
  } catch (e) {
    console.error("Failed to fetch USDC token account:", e);
  }
}

main().catch((err) => {
  console.error("Error during deposit operation:", err);
});
