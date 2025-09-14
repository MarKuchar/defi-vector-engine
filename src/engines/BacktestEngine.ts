import fs from 'fs';
import path from 'path';
import { Candle } from '../dataholders/Candle';
import { IndicatorEngine } from './IndicatorEngine';
import { createDefaultIndicators } from '../utils/createDefaultIndicators';
import { BaseStrategy } from '../strategies/BaseStrategy';
import { StrategyConfig } from '../strategies/StrategyTypes';

export interface Trade {
  timestamp: number;
  direction: 'LONG' | 'SHORT' | 'CLOSE';
  price: number;
  size: number;
}

export interface BacktestResult {
  equityCurve: { timestamp: number; equity: number }[];
  trades: Trade[];
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
}

export function saveBacktestResult(result: BacktestResult, filename = 'backtest_sol.json') {
  const filePath = path.resolve(__dirname, '../data', filename);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  console.log(`✅ Backtest saved to ${filePath}`);
}

export class BacktestEngine {
  private candles: Candle[] = [];
  private indicatorEngine: IndicatorEngine;
  private equityCurve: { timestamp: number; equity: number }[] = [];
  private trades: Trade[] = [];

  constructor(private strategyConfig: StrategyConfig, private strategy: BaseStrategy) {
    this.indicatorEngine = new IndicatorEngine(createDefaultIndicators(strategyConfig));
  }

  async loadHistoricalData(filePath: string): Promise<void> {
    const absPath = path.resolve(filePath);
    const raw = await fs.promises.readFile(absPath, 'utf8');
    const json: any[] = JSON.parse(raw);
    this.candles = json.map(c => ({
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      timestamp: c.timestamp,
      timeframe: c.timeframe,
    }));
  }

  private calculateSharpe(equityCurve: number[]): number {
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
    }
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length || 0;
    const std = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length) || 1;
    return (avg / std) * Math.sqrt(252); // annualized Sharpe
  }

  private calculateMaxDrawdown(equityCurve: number[]): number {
    let maxDD = 0;
    let peak = equityCurve[0] || 0;
    for (const equity of equityCurve) {
      if (equity > peak) peak = equity;
      const dd = (peak - equity) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  }

  private calculateWinRate(trades: Trade[]): number {
    const wins = trades.filter(t => t.direction !== 'CLOSE' && t.price > 0).length; // simplified
    return trades.length > 0 ? wins / trades.length : 0;
  }

  async run(): Promise<BacktestResult> {
    let equity = 10000;
    let positionSize = 0;
    let entryPrice = 0;

    let openPosition: { direction: 'LONG' | 'SHORT'; size: number; entryPrice: number } | null = null;

    for (const candle of this.candles) {
      const price = candle.close;
      this.indicatorEngine.update(price);
      if (!this.indicatorEngine.isReady()) continue;

      const detailedIndicators = this.indicatorEngine.getValuesDetailed();
      const signal = this.strategy.generateSignal({
        currentPrice: price,
        closes: [],
        highs: [],
        lows: [],
        volumes: [],
        timestamp: candle.timestamp,
        indicators: detailedIndicators,
      });

      const size = equity * 0.1 / price;

      if (signal.direction === 'LONG') {
        if (!openPosition) {
          openPosition = { direction: 'LONG', size, entryPrice: price };
          this.trades.push({ timestamp: candle.timestamp, direction: 'LONG', price, size });
        }
      } else if (signal.direction === 'SHORT') {
        if (!openPosition) {
          openPosition = { direction: 'SHORT', size, entryPrice: price };
          this.trades.push({ timestamp: candle.timestamp, direction: 'SHORT', price, size });
        }
      } else if (signal.direction === 'CLOSE' && openPosition) {
        let pnl = 0;
        if (openPosition.direction === 'LONG') pnl = (price - openPosition.entryPrice) * openPosition.size;
        if (openPosition.direction === 'SHORT') pnl = (openPosition.entryPrice - price) * openPosition.size;

        equity += pnl;
        this.trades.push({ timestamp: candle.timestamp, direction: 'CLOSE', price, size: openPosition.size });
        openPosition = null;
      }

      this.equityCurve.push({ timestamp: candle.timestamp, equity });
    }


    const sharpe = this.calculateSharpe(this.equityCurve.map(p => p.equity));
    const maxDD = this.calculateMaxDrawdown(this.equityCurve.map(p => p.equity));
    const winRate = this.calculateWinRate(this.trades);

    console.log('📊 Backtest complete');
    console.log(`Sharpe Ratio: ${sharpe.toFixed(3)}`);
    console.log(`Max Drawdown: ${(maxDD * 100).toFixed(2)}%`);
    console.log(`Win Rate: ${(winRate * 100).toFixed(2)}%`);

    return {
      equityCurve: this.equityCurve,
      trades: this.trades,
      sharpeRatio: sharpe,
      maxDrawdown: maxDD,
      winRate,
    };
  }
}
