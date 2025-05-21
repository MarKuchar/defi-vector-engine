import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import * as fs from "fs";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";


// Load keypair from config path
function loadKeypair(): Keypair {
  const homedir = require("os").homedir();
  const path = `${homedir}/.config/solana/id.json`;
  const secret = JSON.parse(fs.readFileSync(path, "utf8"));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const payer = loadKeypair();

  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Payer SOL balance: ${balance / 1e9} SOL`);

  if (balance < 0.001 * 1e9) {
    throw new Error("❌ Insufficient funds in payer account to create ATA");
  }

  // Example: Devnet USDC mint (Devnet only)
  const usdcMint = new PublicKey("BQYBLrJtEwhKLGkigJDm5c9j9VaKK9XWvKbUj9uUbYEP"); // Use actual devnet USDC mint
  const ata = await getAssociatedTokenAddress(usdcMint, payer.publicKey);

  try {
    await getAccount(connection, ata);
    console.log("✅ ATA already exists:", ata.toBase58());
  } catch (e) {
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata,
        payer.publicKey,
        usdcMint
      )
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log("✅ ATA created:", ata.toBase58());
    console.log("📦 Transaction:", sig);
  }

}

main().catch((err) => {
  console.error("❌ Error occurred:", err);
});
