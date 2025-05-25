import {
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  AccountLayout,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import dotenv from "dotenv";
import * as fs from "fs";
import { getWalletFromEnv } from "../wallet/wallet";

dotenv.config();

const RPC_ENDPOINT = process.env.RPC_ENDPOINT || "https://api.devnet.solana.com";
const MINT = new PublicKey(process.env.MINT!);
const connection = new Connection(RPC_ENDPOINT, "confirmed");
const WALLET = getWalletFromEnv();

async function ensureCollateralAccount(): Promise<PublicKey> {
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(process.env.WALLET_PATH!, "utf-8")))
  );

  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    MINT,
    WALLET.publicKey,
    false,
    "confirmed",
    { skipPreflight: false, commitment: "confirmed" }
  );

  const tokenAccount = ata.address;
  console.log("✅ Collateral ATA ready:", tokenAccount.toBase58());

  // Validate token account
  const accountInfo = await connection.getAccountInfo(tokenAccount);
  if (!accountInfo) throw new Error("❌ Token account not found.");

  if (accountInfo.data.length !== AccountLayout.span) {
    throw new Error(`❌ Account data length mismatch: expected ${AccountLayout.span}, got ${accountInfo.data.length}`);
  }

  const data = AccountLayout.decode(accountInfo.data);
  const mint = new PublicKey(data.mint);
  const owner = new PublicKey(data.owner);
  const state = data.state;

  if (!mint.equals(MINT)) {
    throw new Error(`❌ Mint mismatch: expected ${MINT.toBase58()}, got ${mint.toBase58()}`);
  }
  if (!owner.equals(WALLET.publicKey)) {
    throw new Error(`❌ Owner mismatch: expected ${WALLET.publicKey.toBase58()}, got ${owner.toBase58()}`);
  }
  if (state !== 1) {
    throw new Error(`❌ Token account is not in Initialized state`);
  }

  const account = await getAccount(connection, tokenAccount);
  console.log("Token Balance:", account.amount.toString());

  return tokenAccount;
}

async function main() {
  try {
    console.log("🔍 Ensuring collateral account...");
    const ata = await ensureCollateralAccount();
    console.log("✅ Collateral account check complete:", ata.toBase58());
  } catch (err) {
    console.error("❌ Error ensuring collateral account:", err);
  }
}

main();
