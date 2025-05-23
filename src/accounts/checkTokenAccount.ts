import {
  Connection,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddress,
  AccountLayout,
} from "@solana/spl-token";
import { getWalletFromEnv, signSendConfirm } from './wallet';

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// 🧠 Replace these values
const TOKEN_ACCOUNT = new PublicKey("EQT1sYqJ4ou2jPA2PzqHBjq4XA1a2iurspWHLMdD3N3A");
const WALLET = getWalletFromEnv();
const MINT = new PublicKey("866cPveLGCHpRy96BFXNBUWsfcgVEn3oopVLwqwLQin7");
const PROGRAM_ID = new PublicKey("FKS9qxTxXHu7K1cBdx8QzCLhSPG64jsCTvQ8fBznCD6z"); // Optional, for PDA check
const PDA_SEEDS = ["example", "seed"]; // Optional, for PDA check

async function validateTokenAccount(tokenAccountPubkey: PublicKey, expectedMint: PublicKey, expectedOwner: PublicKey) {
  const accountInfo = await connection.getAccountInfo(tokenAccountPubkey);
  if (!accountInfo) throw new Error("Token account not found");

  const data = AccountLayout.decode(accountInfo.data);
  const mint = new PublicKey(data.mint);
  const owner = new PublicKey(data.owner);
  const state = data.state;

  console.log("✅ Token account found.");
  console.log("Mint:   ", mint.toBase58());
  console.log("Owner:  ", owner.toBase58());
  console.log("State:  ", state === 1 ? "Initialized" : state === 2 ? "Frozen" : "Uninitialized");

  if (!mint.equals(expectedMint)) {
    throw new Error(`❌ Mint mismatch: expected ${expectedMint.toBase58()}, got ${mint.toBase58()}`);
  }
  if (!owner.equals(expectedOwner)) {
    throw new Error(`❌ Owner mismatch: expected ${expectedOwner.toBase58()}, got ${owner.toBase58()}`);
  }
  if (state !== 1) {
    throw new Error(`❌ Token account is not in Initialized state`);
  }
}

async function checkAssociatedTokenAccount(walletPubkey: PublicKey, mintPubkey: PublicKey, tokenAccountPubkey: PublicKey) {
  const expectedAta = await getAssociatedTokenAddress(mintPubkey, walletPubkey);
  console.log("Expected ATA:       ", expectedAta.toBase58());
  console.log("Provided Token Acc: ", tokenAccountPubkey.toBase58());

  if (!expectedAta.equals(tokenAccountPubkey)) {
    console.warn("⚠️ Token account is NOT the associated token account for wallet and mint.");
  } else {
    console.log("✅ Token account IS the associated token account.");
  }
}

async function printTokenBalance(tokenAccountPubkey: PublicKey) {
  try {
    const account = await getAccount(connection, tokenAccountPubkey);
    console.log("Token Balance:", account.amount.toString());
    console.log("Address:     ", account.address);
  } catch (err) {
    console.error("❌ Failed to get token account info:", err);
  }
}

async function checkPDA(seeds: string[], programId: PublicKey) {
  const seedBuffers = seeds.map((s) => Buffer.from(s));
  const [pda, bump] = await PublicKey.findProgramAddressSync(seedBuffers, programId);
  console.log("Derived PDA:", pda.toBase58(), " (bump =", bump, ")");
  return pda;
}

async function main() {
  console.log("🔍 Starting token account debug...");

  await validateTokenAccount(TOKEN_ACCOUNT, MINT, WALLET.publicKey);
  await checkAssociatedTokenAccount(WALLET.publicKey, MINT, TOKEN_ACCOUNT);
  await printTokenBalance(TOKEN_ACCOUNT);

  if (PDA_SEEDS.length > 0 && PROGRAM_ID) {
    console.log("\n🧠 PDA check:");
    await checkPDA(PDA_SEEDS, PROGRAM_ID);
  }

  console.log("✅ All checks completed.");
}

main().catch((err) => {
  console.error("❌ Error during checks:", err);
});
