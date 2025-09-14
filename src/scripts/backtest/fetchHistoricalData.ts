import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { Candle } from '../../dataholders/Candle';  // update path if needed

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

  const data = (await res.json()) as any[];  // type assertion

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
    // e.g. – fetch last 1000 1-hour candles
    const candles = await fetchBinanceSOL('1h', 1000);

    const outPath = path.resolve(__dirname, '../../data/historical_sol.json');
    await fs.writeFile(outPath, JSON.stringify(candles, null, 2));
    console.log(`✅ Saved ${candles.length} SOL candles to ${outPath}`);
  } catch (err) {
    console.error('❌ Fetch failed:', err);
  }
}

main();
