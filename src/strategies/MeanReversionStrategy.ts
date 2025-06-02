import { SMA, RSI } from 'trading-signals';
import { StrategyConfig, MarketData, TradeSignal } from './StrategyTypes';

export class MeanReversionStrategy {
  private sma: SMA;
  private rsi: RSI;
  private prices: number[] = [];

  constructor(private config: StrategyConfig) {
    // Initialize indicators with config values
    const maPeriod = config.entryRules?.priceAboveMA.period || config.params?.lookbackPeriod || 50;
    const rsiPeriod = config.entryRules?.rsiConditions.period || 14;
    
    this.sma = new SMA(maPeriod);
    this.rsi = new RSI(rsiPeriod);
  }

  update(data: MarketData): void {
    this.prices.push(data.currentPrice);
    this.sma.update(data.currentPrice, false);
    this.rsi.update(data.currentPrice, false);
  }

  generateSignal(data: MarketData): TradeSignal {
    this.update(data);
    
    const currentSMA = this.sma.getResult();
    const currentRSI = this.rsi.getResult();
    const lastPrice = this.prices[this.prices.length - 1];

    // Safely check indicator values
    if (!currentSMA || !currentRSI) {
      return { direction: null, size: 0, reason: 'Indicators not ready' };
    }

    const numericRSI = currentRSI.toNumber();
    const numericSMA = currentSMA.toNumber();

    // Entry conditions
    const oversold = numericRSI < (this.config.entryRules?.rsiConditions.oversold || 30);
    const belowMA = lastPrice < numericSMA * (this.config.entryRules?.priceAboveMA.threshold || 1);

    // Exit conditions
    const takeProfit = numericRSI > 50;
    const stopLoss = lastPrice < numericSMA * 0.95; // 5% below MA

    if (oversold && belowMA) {
      return {
        direction: 'LONG',
        size: this.config.risk.maxPositionSize,
        reason: 'Oversold and below MA'
      };
    } else if (takeProfit || stopLoss) {
      return {
        direction: 'CLOSE',
        size: 0, // Will close entire position
        reason: stopLoss ? 'Stop loss triggered' : 'Take profit reached'
      };
    }

    return { direction: null, size: 0 };
  }
}