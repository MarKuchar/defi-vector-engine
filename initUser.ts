import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { DriftClient, getUserAccountPublicKey } from "@drift-labs/sdk";
import fs from "fs";

const SOLANA_CLUSTER_URL = "https://api.devnet.solana.com";
const DRIFT_PROGRAM_ID = new PublicKey("4ckmDgGzLYLyL3Xx3UczZzZbcfwgpSLyXz5jf2oF2LVv");
const WALLET_PATH = "/Users/martycook/.config/solana/id.json";

const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8")));
const keypair = Keypair.fromSecretKey(secretKey);

function keypairToWallet(keypair: Keypair) {
  return {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: Transaction) => {
      tx.partialSign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: Transaction[]) => {
      txs.forEach(tx => tx.partialSign(keypair));
      return txs;
    },
  };
}

async function main() {
  const connection = new Connection(SOLANA_CLUSTER_URL, "confirmed");

  const wallet = keypairToWallet(keypair);

  const driftClient = new DriftClient({
    connection,
    wallet,
    programID: DRIFT_PROGRAM_ID,
    opts: { commitment: "confirmed" },
  });

  console.log("Subscribing to Drift client...");
  await driftClient.subscribe();

  // Wait for subscription data to be ready (adjust delay if needed)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const userAccountPublicKey = await getUserAccountPublicKey(wallet.publicKey, DRIFT_PROGRAM_ID);
  console.log("User Account PDA:", userAccountPublicKey.toBase58());

  const accountInfo = await connection.getAccountInfo(userAccountPublicKey);

  if (accountInfo === null) {
    console.log("User account does not exist. Initializing...");

    await driftClient.initializeUserAccount();

    console.log("User account initialized!");
  } else {
    console.log("User account already exists.");
  }
}



main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
