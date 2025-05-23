import { Connection, Transaction, Keypair, PublicKey } from "@solana/web3.js";
import { IWallet } from '@drift-labs/sdk';
import fs from 'fs';
import 'dotenv/config';

export class KeypairWallet implements IWallet {
  constructor(private keypair: Keypair) {}

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    const anyTx = tx as any;

    if ('partialSign' in anyTx) {
      anyTx.partialSign(this.keypair);
    } else if ('sign' in anyTx) {
      anyTx.sign([this.keypair]);
    } else {
      throw new Error('Unknown transaction type');
    }
    return tx;
  }

  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    for (const tx of txs) {
      await this.signTransaction(tx);
    }
    return txs;
  }
}

export async function signSendConfirm(
  connection: Connection,
  wallet: IWallet,
  tx: Transaction
): Promise<string> {
  // 1) Fee payer + blockhash
  tx.feePayer = wallet.publicKey;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  // 2) Sign
  const signedTx = await wallet.signTransaction(tx);

  // 3) Send
  const raw = signedTx.serialize();
  const sig = await connection.sendRawTransaction(raw);

  // 4) Confirm
  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  return sig;
}

export function getWalletFromEnv(): KeypairWallet {
  const secretKeyString = fs.readFileSync(process.env.WALLET_PATH!, 'utf-8');
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const keypair = Keypair.fromSecretKey(secretKey);
  return new KeypairWallet(keypair);
}