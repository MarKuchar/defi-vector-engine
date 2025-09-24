import fs from 'fs';
import path from 'path';
import { Candle } from '../dataholders/Candle';
import { IndicatorEngine } from './IndicatorEngine';
import { createDefaultIndicators } from '../utils/createDefaultIndicators';
import { BaseStrategy } from '../strategies/BaseStrategy';
import { StrategyConfig } from '../strategies/StrategyTypes';
import logger from '../utils/logger'; // Import logger for better debugging

export interface Trade {
  timestamp: number;
  direction: 'LONG' | 'SHORT' | 'CLOSE';
  price: number;
  size: number;
  fee: number;
  pnl?: number;
}

export interface BacktestResult {
  initialCapital: number;
  finalCapital: number;
  equityCurve: { timestamp: number; equity: number }[];
  trades: Trade[];
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalFees: number;
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

  private initialCapital: number = 10000;
  private feeRate: number = 0.001;
  private slippagePct: number = 0.0005;

  private hasLoggedWarmup = false;

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
    logger.info(`✅ Loaded ${this.candles.length} historical candles.`);
  }

  private calculateSharpe(equityCurve: number[]): number {
    if (equityCurve.length < 2) return 0;
    
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const dailyReturn = (equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1];
      returns.push(dailyReturn);
    }
    
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    
    return stdDev !== 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
  }

  private calculateMaxDrawdown(equityCurve: number[]): number {
    if (equityCurve.length === 0) return 0;
    
    let maxDD = 0;
    let peak = equityCurve[0];
    
    for (const equity of equityCurve) {
      if (equity > peak) peak = equity;
      const dd = (peak - equity) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    
    return maxDD;
  }

  private calculateWinRate(trades: Trade[]): number {
    const profitableTrades = trades.filter(t => t.pnl && t.pnl > 0).length;
    const closedTrades = trades.filter(t => t.direction === 'CLOSE').length;
    
    return closedTrades > 0 ? profitableTrades / closedTrades : 0;
  }

  private calculateProfitFactor(trades: Trade[]): number {
    let totalProfit = 0;
    let totalLoss = 0;

    trades.forEach(trade => {
      if (trade.pnl) {
        if (trade.pnl > 0) {
          totalProfit += trade.pnl;
        } else {
          totalLoss += Math.abs(trade.pnl);
        }
      }
    });

    return totalLoss !== 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
  }

  private calculateTradePnL(entryTrade: Trade, exitTrade: Trade): number {
    if (!entryTrade || !exitTrade) return 0;

    let pnl = 0;
    if (entryTrade.direction === 'LONG') {
      pnl = (exitTrade.price - entryTrade.price) * entryTrade.size;
    } else if (entryTrade.direction === 'SHORT') {
      pnl = (entryTrade.price - exitTrade.price) * entryTrade.size;
    }

    pnl -= entryTrade.fee;
    pnl -= exitTrade.fee;

    return pnl;
  }

  async run(initialCapital: number = 10000): Promise<BacktestResult> {
    if (this.candles.length === 0) {
      throw new Error('No historical data loaded. Call loadHistoricalData() first.');
    }

    this.initialCapital = initialCapital;
    let cash = initialCapital;
    this.equityCurve = [];
    this.trades = [];

    let openPosition: { 
      entryTrade: Trade; 
      direction: 'LONG' | 'SHORT'; 
      size: number; 
      entryPrice: number;
    } | null = null;

    logger.info('🏁 Starting backtest...');

    for (const [index, candle] of this.candles.entries()) {
      const price = candle.close;
      
      this.indicatorEngine.update(price);
      
      const currentEquity: number = openPosition ? this.calculateCurrentEquity(cash, openPosition, price) : cash;
      this.equityCurve.push({ timestamp: candle.timestamp, equity: currentEquity });

      // SIMULATE LIVE BOT WARMUP
      if (!this.indicatorEngine.isReady()) {
        if (!this.hasLoggedWarmup) {
          logger.info('Waiting for indicators to warm up...');
          this.hasLoggedWarmup = true;
        }
        continue;
      }
      this.hasLoggedWarmup = false;

      const detailedIndicators = this.indicatorEngine.getValuesDetailed();
      
      // LOGIC MATCHING THE LIVE BOT'S onPriceUpdate
      const signal = this.strategy.generateSignal({
        currentPrice: price,
        // These are intentionally empty arrays to match the live bot's implementation
        closes: [],
        highs: [],
        lows: [],
        volumes: [],
        timestamp: candle.timestamp,
        indicators: detailedIndicators,
      });

      logger.debug(`Candle #${index} | Price: ${price.toFixed(4)} | Signal: ${signal.direction}`);

      if (signal.direction === 'LONG' && !openPosition) {
        const positionSize: number = currentEquity * this.strategyConfig.risk.maxPositionSize;
        const size = positionSize / price;
        const executedPrice = price * (1 + this.slippagePct);
        const fee = size * executedPrice * this.feeRate;
        
        if (cash >= fee) {
          cash -= fee;
          const entryTrade: Trade = { timestamp: candle.timestamp, direction: 'LONG', price: executedPrice, size, fee };
          openPosition = { entryTrade, direction: 'LONG', size, entryPrice: executedPrice };
          this.trades.push(entryTrade);
          logger.info(`[TRADE] OPEN LONG at $${executedPrice.toFixed(2)} | Size: ${size.toFixed(4)}`);
        }

      } else if (signal.direction === 'SHORT' && !openPosition) {
        const positionSize: number = currentEquity * this.strategyConfig.risk.maxPositionSize;
        const size = positionSize / price;
        const executedPrice = price * (1 - this.slippagePct);
        const fee = size * executedPrice * this.feeRate;
        
        if (cash >= fee) {
          cash -= fee;
          const entryTrade: Trade = { timestamp: candle.timestamp, direction: 'SHORT', price: executedPrice, size, fee };
          openPosition = { entryTrade, direction: 'SHORT', size, entryPrice: executedPrice };
          this.trades.push(entryTrade);
          logger.info(`[TRADE] OPEN SHORT at $${executedPrice.toFixed(2)} | Size: ${size.toFixed(4)}`);
        }

      } else if (signal.direction === 'CLOSE' && openPosition) {
        const executedPrice = openPosition.direction === 'LONG' ? price * (1 - this.slippagePct) : price * (1 + this.slippagePct);
        const fee = openPosition.size * executedPrice * this.feeRate;
        
        if (cash >= fee) {
          cash -= fee;
          const exitTrade: Trade = { timestamp: candle.timestamp, direction: 'CLOSE', price: executedPrice, size: openPosition.size, fee };
          const pnl = this.calculateTradePnL(openPosition.entryTrade, exitTrade);
          exitTrade.pnl = pnl;
          
          cash += pnl + (openPosition.entryTrade.price * openPosition.size);
          this.trades.push(exitTrade);
          openPosition = null;
          logger.info(`[TRADE] CLOSED for PnL: $${pnl.toFixed(2)} | New Cash: $${cash.toFixed(2)}`);
        }
      }
    }

    // Close any open position at the end of the backtest
    if (openPosition && this.candles.length > 0) {
      const lastCandle = this.candles[this.candles.length - 1];
      const exitPrice = lastCandle.close;
      
      const exitTrade: Trade = { timestamp: lastCandle.timestamp, direction: 'CLOSE', price: exitPrice, size: openPosition.size, fee: 0 };
      const pnl = this.calculateTradePnL(openPosition.entryTrade, exitTrade);
      exitTrade.pnl = pnl;
      cash += pnl + (openPosition.entryTrade.price * openPosition.size);
      this.trades.push(exitTrade);
      
      const finalEquity = cash;
      this.equityCurve.push({ timestamp: lastCandle.timestamp, equity: finalEquity });
    }

    const equityValues = this.equityCurve.map(p => p.equity);
    const sharpe = this.calculateSharpe(equityValues);
    const maxDD = this.calculateMaxDrawdown(equityValues);
    const winRate = this.calculateWinRate(this.trades);
    const profitFactor = this.calculateProfitFactor(this.trades);
    const totalFees = this.trades.reduce((sum, trade) => sum + trade.fee, 0);
    const finalCapital = equityValues[equityValues.length - 1] || initialCapital;

    logger.info('📊 Backtest Complete');
    logger.info(`Initial Capital: $${initialCapital.toFixed(2)}`);
    logger.info(`Final Capital: $${finalCapital.toFixed(2)}`);
    logger.info(`Return: ${((finalCapital / initialCapital - 1) * 100).toFixed(2)}%`);
    logger.info(`Sharpe Ratio: ${sharpe.toFixed(3)}`);
    logger.info(`Max Drawdown: ${(maxDD * 100).toFixed(2)}%`);
    logger.info(`Win Rate: ${(winRate * 100).toFixed(2)}%`);
    logger.info(`Profit Factor: ${profitFactor.toFixed(2)}`);
    logger.info(`Total Fees: $${totalFees.toFixed(2)}`);
    logger.info(`Total Trades: ${this.trades.filter(t => t.direction === 'CLOSE').length}`);

    return { initialCapital, finalCapital, equityCurve: this.equityCurve, trades: this.trades, sharpeRatio: sharpe, maxDrawdown: maxDD, winRate, profitFactor, totalFees };
  }

  private calculateCurrentEquity(cash: number, position: any, currentPrice: number): number {
    let unrealizedPnl = 0;
    
    if (position.direction === 'LONG') {
      unrealizedPnl = (currentPrice - position.entryPrice) * position.size;
    } else if (position.direction === 'SHORT') {
      unrealizedPnl = (position.entryPrice - currentPrice) * position.size;
    }
    
    return cash + unrealizedPnl;
  }
}