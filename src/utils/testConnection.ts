import { Connection, clusterApiUrl } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl('mainnet-beta'));

async function test() {
  const version = await connection.getVersion();
  console.log("RPC version:", version);
}

test().catch(console.error);
