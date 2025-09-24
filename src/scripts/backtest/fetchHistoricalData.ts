import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { Candle } from '../../dataholders/Candle';

// Fetch SOL/USDT klines from Binance
async function fetchBinanceSOL(
  interval: string = '1h',
  limit: number = 1000,
  startTime?: number,
  endTime?: number
): Promise<Candle[]> {
  const symbol = 'SOLUSDT';
  const baseUrl = 'https://api.binance.com/api/v3/klines';
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: limit.toString(),
  });
  if (startTime) {
    params.append('startTime', startTime.toString());
  } 
  if (endTime) {
    params.append('endTime', endTime.toString());
  }

  const url = `${baseUrl}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error fetching SOL klines: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as any[];

  const candles: Candle[] = data.map((d: any[]): Candle => ({
    timestamp: d[0],
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5]),
    timeframe: interval,
  }));

  return candles;
}

async function main() {
  try {
    const interval = '1m'; 
    const limit = 5000; // Corrected to comply with Binance API limits (max 1000 candles per request)

    const candles = await fetchBinanceSOL(interval, limit);

    const outPath = path.resolve(__dirname, `../../data/historical_sol_${interval}.json`);
    await fs.writeFile(outPath, JSON.stringify(candles, null, 2));
    console.log(`✅ Saved ${candles.length} SOL candles to ${outPath}`);
  } catch (err) {
    console.error('❌ Fetch failed:', err);
  }
}

main();