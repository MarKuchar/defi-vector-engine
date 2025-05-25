import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import * as dotenv from "dotenv";

dotenv.config();

async function mintExistingUSDC() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!))
  );

  const USDC_MINT = new PublicKey("Es9vMFrzaCER7UJyFtr6fTcR3o79HfVPWJ5yoEUhU4b");

  console.log("Using wallet:", payer.publicKey.toBase58());

  // Get or create associated token account for USDC
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    USDC_MINT,
    payer.publicKey
  );

  console.log("Token account:", tokenAccount.address.toBase58());

  // Before minting, confirm the token account exists by fetching its info:
  const accountInfo = await connection.getAccountInfo(tokenAccount.address);
  if (!accountInfo) {
    throw new Error("Associated token account was not created or found on-chain.");
  }

  // Mint 10 USDC tokens (remember 6 decimals)
  await mintTo(
    connection,
    payer,
    USDC_MINT,
    tokenAccount.address,
    payer,
    10_000_000
  );

  console.log("Minted 10 USDC tokens to your account");
}

mintExistingUSDC().catch((err) => {
  console.error("Error minting to USDC:", err);
});
