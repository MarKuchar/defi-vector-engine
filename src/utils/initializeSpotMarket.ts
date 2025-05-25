import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { DriftClient, DriftClientConfig, Wallet } from "@drift-labs/sdk";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import dotenv from "dotenv";

dotenv.config();

const RPC_ENDPOINT = process.env.RPC_ENDPOINT || "https://api.devnet.solana.com";
const PRIVATE_KEY = JSON.parse(process.env.PRIVATE_KEY!);
const MINT = new PublicKey(process.env.MINT!);

async function main() {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  const rawKeypair = Keypair.fromSecretKey(Uint8Array.from(PRIVATE_KEY));
  const wallet = new Wallet(rawKeypair);

  const driftClientConfig: DriftClientConfig = {
    connection,
    wallet,
    env: "devnet",
  };

  const driftClient = new DriftClient(driftClientConfig);
  await driftClient.subscribe();

  // Get the associated token address for your wallet
  const userTokenAccount = await getAssociatedTokenAddress(MINT, wallet.publicKey);

  // Initialize the spot market
  const spotMarketIndex = await driftClient.initializeSpotMarket(
    MINT,
    userTokenAccount
  );

  console.log("Spot market initialized with index:", spotMarketIndex);

  await driftClient.unsubscribe();
}

main().catch((err) => {
  console.error("Error initializing spot market:", err);
  process.exit(1);
});
