import { Connection, PublicKey } from '@solana/web3.js';
import { getPythProgramKeyForCluster, PythConnection } from '@pythnetwork/client';

async function fetchSolPrice() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Pyth program for Devnet
  const pythProgramKey = getPythProgramKeyForCluster('devnet');

  // Connect to Pyth
  const pythConnection = new PythConnection(connection, pythProgramKey);

  await pythConnection.connect();

  // SOL/USD price account on Devnet
  const solUsdKey = new PublicKey('J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix');

  // Subscribe to price updates
  pythConnection.onPriceChange(solUsdKey, (priceData) => {
    const price = priceData.price;
    const conf = priceData.confidence;
    console.log(`SOL/USD price: $${price} ±${conf}`);
  });
}

fetchSolPrice().catch(console.error);
