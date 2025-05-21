import {
  Connection,
  PublicKey,
  Keypair,
  sendAndConfirmTransaction,
  Transaction,
  clusterApiUrl,
  Commitment,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const CLUSTER = "devnet";
const COMMITMENT: Commitment = (process.env.COMMITMENT as Commitment) || "confirmed";
const WALLET_PATH = process.env.WALLET_PATH || "devnet-keypair.json";
const MINT = new PublicKey(process.env.MINT!); // Make sure .env has this

const connection = new Connection(clusterApiUrl(CLUSTER), COMMITMENT);
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8")))
);

console.log(`Using cluster: ${CLUSTER}, commitment: ${COMMITMENT}`);
console.log(`Using wallet: ${payer.publicKey.toBase58()}`);

async function createAtaIfNeeded(mint: PublicKey, owner: PublicKey) {
  console.log("Validating mint for cluster...");

  try {
    const mintAccount = await connection.getAccountInfo(mint);
    if (!mintAccount) {
      throw new Error(`Mint ${mint.toBase58()} is NOT valid for cluster ${CLUSTER}`);
    }
  } catch (e) {
    throw new Error(`Mint ${mint.toBase58()} is NOT valid for cluster ${CLUSTER}`);
  }

  console.log("Getting associated token address...");
  const ata = await getAssociatedTokenAddress(mint, owner);

  console.log(`Associated Token Account: ${ata.toBase58()}`);

  try {
    await getAccount(connection, ata);
    console.log("ATA already exists.");
    return ata;
  } catch {
    console.log("ATA does not exist. Creating...");
  }

  const ix = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    ata,
    owner,
    mint
  );

  console.log("Created ATA creation instruction:", ix);

  const tx = new Transaction().add(ix);

  try {
    console.log("Sending transaction to create ATA...");
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log("ATA created. Signature:", sig);
  } catch (e: any) {
    console.error("Error during ATA creation:", e);
    throw e;
  }

  return ata;
}

async function main() {
  const ata = await createAtaIfNeeded(MINT, payer.publicKey);

  // Placeholder: add funding or deposit logic here
  console.log("Now you can fund or deposit to:", ata.toBase58());
}

main().catch((err) => {
  console.error("Script failed:", err);
});
