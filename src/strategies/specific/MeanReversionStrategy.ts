import { SMA, RSI } from 'trading-signals';
import { BaseStrategy } from '../BaseStrategy';
import type { StrategyConfig, MarketData, TradeSignal } from '../StrategyTypes';
import { isOversold, isBelowMA, bollingerTouch, emaCrossed } from '../../utils/indicatorChecks';
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

    const rsi = indicators?.rsi?.value ?? null;
    const sma = indicators?.SMA_50 ?? null;
    const emaFast = indicators?.ema?.short ?? null;
    const emaSlow = indicators?.ema?.long ?? null;
    const bbUpper = indicators?.bb?.upper ?? null;
    const bbLower = indicators?.bb?.lower ?? null;

    if (sma === null || rsi === null) {
      // logger.warn('Missing SMA or RSI in generateSignal', { sma, rsi });
      return { direction: null, size: 0, reason: 'Missing indicator data' };
    }

    const oversold = isOversold(rsi);
    const belowMA = isBelowMA(price, sma);

    let emaSignal: 'bullish' | 'bearish' | null = null;
    if (emaFast !== null && emaSlow !== null) {
      emaSignal = emaCrossed(emaFast, emaSlow);
    }

    let bbTouch: 'upper' | 'lower' | null = null;
    if (bbUpper !== null && bbLower !== null) {
      bbTouch = bollingerTouch(price, bbUpper, bbLower);
    }

    if (oversold && belowMA) {
      logger.info('[Signal] Entering LONG: Oversold & below SMA');
      return { direction: 'LONG', size: this.config.risk.maxPositionSize, reason: 'Oversold & below SMA' };
    }

    if (emaSignal === 'bearish' || bbTouch === 'upper') {
      logger.info('[Signal] Entering SHORT: EMA bearish or BB upper touch');
      return { direction: 'SHORT', size: this.config.risk.maxPositionSize, reason: 'EMA bearish or BB upper touch' };
    }

    logger.debug('Signal computation', {
      price, sma, rsi, oversold, belowMA, emaFast, emaSlow, emaSignal, bbUpper, bbLower, bbTouch,
    });

    return { direction: null, size: 0, reason: 'No trade signal' };
  }
}
