import { Connection, PublicKey } from "@solana/web3.js";
import { AccountLayout } from "@solana/spl-token";

async function debugTokenAccount(connection: Connection, tokenAccountPubkey: PublicKey) {
  const tokenAccountData = await connection.getAccountInfo(tokenAccountPubkey);
  if (!tokenAccountData) {
    console.log("Token account not found");
    return;
  }
  console.log("Token account data length:", tokenAccountData.data.length);

  // Decode token account layout
  const decoded = AccountLayout.decode(tokenAccountData.data);

  // amount is a Buffer of length 8 starting at decoded.amount
  const amount = decoded.amount; // amount is Buffer
  console.log(decoded.amount.toString()); // This is a bigint


  console.log("Token amount (raw):", amount.toString());
}

(async () => {
  const connection = new Connection("https://api.devnet.solana.com");
  const tokenAccountPubkey = new PublicKey("EQT1sYqJ4ou2jPA2PzqHBjq4XA1a2iurspWHLMdD3N3A");

  await debugTokenAccount(connection, tokenAccountPubkey);
})();
