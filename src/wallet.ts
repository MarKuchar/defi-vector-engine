import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { IWallet } from '@drift-labs/sdk';
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

export function getWalletFromEnv(): KeypairWallet {
  const secretKeyString = process.env.WALLET_SECRET_KEY;
  if (!secretKeyString) throw new Error('Missing WALLET_SECRET_KEY in env');

  const secretKeyArray = JSON.parse(secretKeyString) as number[];
  const secretKeyUint8 = Uint8Array.from(secretKeyArray);

  const keypair = Keypair.fromSecretKey(secretKeyUint8);
  return new KeypairWallet(keypair);
}