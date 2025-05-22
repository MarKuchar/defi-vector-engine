// src/depositCollateral.ts
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { DriftClient, getMarketsAndOraclesForSubscription, DriftClientConfig } from '@drift-labs/sdk';
import BN from "bn.js";
import * as dotenv from "dotenv";
import { getWalletFromEnv, signSendConfirm } from './wallet';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { createAssociatedTokenAccountInstruction,  TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";
import { stringify } from "querystring";


dotenv.config();

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const wallet = getWalletFromEnv();
const usdcMint = new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);
const amount = new BN(1_000_000); // 1 USDC with 6 decimals
const spotMarketIndex = 0; // Assuming USDC is at index 0, confirm this from markets

async function main() {
  console.log("RPC Endpoint:", connection.rpcEndpoint);
  console.log("Mint address:", usdcMint.toBase58());
  console.log("Token program ID:", TOKEN_PROGRAM_ID.toBase58());
  console.log("Associated token program ID:", ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());

  const mintInfo = await connection.getAccountInfo(usdcMint);
  if (!mintInfo) {
    console.error("Mint account does not exist on this cluster!");
  }
  console.log(mintInfo);
  const { perpMarketIndexes, spotMarketIndexes, oracleInfos } =
    getMarketsAndOraclesForSubscription('devnet');

  const driftClientConfig: DriftClientConfig = {
    connection,
    wallet,
    env: 'devnet',
    perpMarketIndexes,
    spotMarketIndexes,
    oracleInfos,
  };

  const driftClient = new DriftClient(driftClientConfig);

  console.log("Subscribing to Drift client...");
  await driftClient.subscribe();

  const user = driftClient.getUser();
  const userTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    wallet.publicKey
  );

  console.log(`Using token account: ${userTokenAccount.toBase58()}`);

    const accountInfo = await connection.getAccountInfo(userTokenAccount);

  if (!accountInfo) {
    console.log(`Token account ${userTokenAccount.toBase58()} not found. Creating it...`);

    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,       // payer
        userTokenAccount,       // ATA to create
        wallet.publicKey,       // owner of the ATA
        usdcMint                // token mint
      )
    );

    const ataSig = await signSendConfirm(connection, wallet, tx);
    console.log(`Token account created: ${userTokenAccount.toBase58()}`);
  }

  console.log("Depositing collateral...");
  try {
    const sig = await driftClient.deposit(amount, spotMarketIndex, userTokenAccount);

    console.log("Deposit tx signature:", sig);
  } catch (e) {
    console.error("Error during deposit operation:", e);
  } finally {
    console.log("Unsubscribing from Drift client...");
    await driftClient.unsubscribe();
  }
}

main().catch(console.error);