import 'dotenv/config';
import { Connection, clusterApiUrl, Keypair, Transaction, PublicKey } from '@solana/web3.js';
import {
  DriftClient,
  getMarketsAndOraclesForSubscription,
  IWallet,
  DriftClientConfig,
} from '@drift-labs/sdk';

class KeypairWallet implements IWallet {
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

function getWalletFromEnv(): KeypairWallet {
  const secretKeyString = process.env.WALLET_SECRET_KEY;
  if (!secretKeyString) throw new Error('Missing WALLET_SECRET_KEY in env');

  const secretKeyArray = JSON.parse(secretKeyString) as number[];
  const secretKeyUint8 = Uint8Array.from(secretKeyArray);

  const keypair = Keypair.fromSecretKey(secretKeyUint8);
  return new KeypairWallet(keypair);
}

async function initializeUserAccount() {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const wallet = getWalletFromEnv();

  console.log('Wallet Public Key:', wallet.publicKey.toBase58());

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

  await driftClient.subscribe();

  try {
    console.log('Initializing user account if needed...');
    await driftClient.initializeUserAccount();
    console.log('User account initialized (or already exists).');
  } catch (err) {
    console.error('Error initializing user account:', err);
  }

  await driftClient.unsubscribe();
}

(async () => {
  try {
    await initializeUserAccount();
  } catch (e) {
    console.error('Error:', e);
  }
})();
