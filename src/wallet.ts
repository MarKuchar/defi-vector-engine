import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

/**
 * Minimal wallet wrapper for Solana Keypair
 */
export class KeypairWallet {
  constructor(private keypair: Keypair) {}

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    tx.partialSign(this.keypair);
    return tx;
  }

  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return txs.map((tx) => {
      tx.partialSign(this.keypair);
      return tx;
    });
  }
}
