import 'dotenv/config';
import { Connection, clusterApiUrl, Keypair, Transaction, PublicKey } from '@solana/web3.js';
import { DriftClient, getMarketsAndOraclesForSubscription, IWallet, DriftClientConfig, DriftEnv } from '@drift-labs/sdk';

class KeypairWallet implements IWallet {
  constructor(private keypair: Keypair) {}

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    tx.partialSign(this.keypair);
    return tx;
  }

  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    for (const tx of txs) {
      tx.partialSign(this.keypair);
    }
    return txs;
  }
}

function getWalletFromEnv(): KeypairWallet {
  const secretKeyString = process.env.WALLET_SECRET_KEY;
  if (!secretKeyString) throw new Error('Missing WALLET_SECRET_KEY in env');

  const secretKeyArray = JSON.parse(secretKeyString) as number[];
  const secretKeyUint8 = Uint8Array.from(secretKeyArray);

  const keypair = Keypair.fromSecretKey(secretKeyUint8);
  return new KeypairWallet(keypair);
}

async function checkBalance() {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const wallet = getWalletFromEnv();

  console.log('Wallet Public Key:', wallet.publicKey.toBase58());

  const { perpMarketIndexes, spotMarketIndexes, oracleInfos } = getMarketsAndOraclesForSubscription(DriftEnv.DEVNET);

  const driftClientConfig: DriftClientConfig = {
    connection,
    wallet,
    env: 'devnet',
    perpMarketIndexes,
    spotMarketIndexes,
    oracleInfos,
  };

  const driftClient = new DriftClient(driftClientConfig);
  await driftClient.subscribe();

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet balance: ${balance / 1e9} SOL`);

  await driftClient.unsubscribe();
}

(async () => {
  try {
    await checkBalance();
  } catch (e) {
    console.error('Error:', e);
  }
})();
