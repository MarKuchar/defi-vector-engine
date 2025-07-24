import { PriceHistory } from '../dataholders/PriceHistory';
import { MeanReversionStrategy } from '../strategies/MeanReversionStrategy';
import { MarketData, TradeSignal } from '../strategies/StrategyTypes';
import { calculateRSI } from '../utils/indicators';
import { StrategyConfig } from '../utils/parseStrategyConfig';

export class StrategyEngine {
  private strategyInstance: any;

  constructor(private readonly config: StrategyConfig) {
    switch (config.strategy) {
      case 'meanReversion':
        this.strategyInstance = new MeanReversionStrategy(config);
        break;
      // case 'momentum':
      //   this.strategyInstance = new MomentumStrategy(config);
      //   break;
      default:
        throw new Error(`Unknown strategy: ${config.strategy}`);
    }
  }

  generateSignal(data: MarketData): TradeSignal {
    return this.strategyInstance.generateSignal(data);
  }

  evaluate(priceHistory: PriceHistory, currentPrice: number): TradeSignal {
    const entryRules = this.config.entryRules;

    if (
      !entryRules ||
      !entryRules.priceAboveMA ||
      !entryRules.rsiConditions
    ) {
      console.warn('Incomplete entry rules configuration');
      return { direction: null, size: 0, reason: 'Missing entry rules' };
    }

    const history = priceHistory.getAll();
    const movingAvg = priceHistory.getMean();
    const rsi = calculateRSI(history, entryRules.rsiConditions.period);

    const aboveMA = currentPrice > movingAvg + entryRules.priceAboveMA.threshold;
    const rsiOversold = rsi < entryRules.rsiConditions.oversold;

    if (aboveMA && rsiOversold) {
      console.log(
        `[SIGNAL] Buy condition met. Price: ${currentPrice}, MA: ${movingAvg}, RSI: ${rsi}`
      );
      const size = this.config.risk?.maxPositionSize ?? 0;
      return { direction: 'LONG', size, reason: 'Buy conditions met' };
    }

    // Add other signal conditions here if needed

    return { direction: null, size: 0, reason: 'No trade signal' };
  }
}
