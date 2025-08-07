import { SMA, RSI } from 'trading-signals';
import { BaseStrategy } from '../BaseStrategy';
import type { StrategyConfig, MarketData, TradeSignal } from '../StrategyTypes';
import logger from '../../utils/logger';

export class MeanReversionStrategy implements BaseStrategy {
  private sma: SMA;
  private rsi: RSI;
  private prices: number[] = [];

  constructor(private config: StrategyConfig) {
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

    const { indicators, currentPrice: price } = data;
    const sma = indicators?.['SMA_50'];
    const rsi = indicators?.['RSI_14'];

    if (sma == null || rsi == null) {
      logger.warn('Indicators missing in generateSignal', { sma, rsi });
      return {
        direction: null,
        size: 0,
        reason: 'Missing indicator data',
      };
    }

    const oversold = rsi < (this.config.entryRules?.rsiConditions.oversold ?? 30);
    const belowMA = price < sma * (this.config.entryRules?.priceAboveMA.threshold ?? 1);

    const stopLoss = price < sma * 0.95;
    const takeProfit = rsi > 50;

    logger.debug('Signal computation:', {
      price,
      sma,
      rsi,
      oversold,
      belowMA,
      stopLoss,
      takeProfit,
    });

    if (oversold && belowMA) {
      logger.info('[Signal] Entering LONG: Oversold and price below MA');
      return {
        direction: 'LONG',
        size: this.config.risk.maxPositionSize,
        reason: 'Oversold and below MA',
      };
    }

    if (takeProfit || stopLoss) {
      const reason = stopLoss ? 'Stop loss triggered' : 'Take profit reached';
      logger.info(`[Signal] Exiting: ${reason}`);
      return { direction: 'CLOSE', size: 0, reason };
    }

    return { direction: null, size: 0, reason: 'No trade signal' };
  }
}
