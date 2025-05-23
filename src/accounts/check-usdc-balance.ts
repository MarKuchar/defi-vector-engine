import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
dotenv.config();

const usdcAtaAddress = process.env.USDC_ATA_ADDRESS!;


const connection = new Connection(process.env.SOLANA_CLUSTER_URL!, 'confirmed');
const usdcAtaPubkey = new PublicKey(usdcAtaAddress);

async function checkUsdcBalance() {
  const balance = await connection.getTokenAccountBalance(usdcAtaPubkey);
  console.log('USDC balance:', balance.value.uiAmountString);
}

checkUsdcBalance();
