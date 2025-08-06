import { BollingerBands } from '../indicators/BollingerBands';
import { RSI } from '../indicators/RSI';
import { SMA } from '../indicators/SMA';
import { EMA } from '../indicators/EMA';
import { Indicator } from '../indicators/interface/Indicator';
import { StrategyConfig } from '../strategies/StrategyTypes';

export function createDefaultIndicators(config: StrategyConfig): Indicator[] {
  return [
    new SMA(config.entryRules.priceAboveMA.period),
    new EMA(14),
    new RSI(14),
    new BollingerBands(20),
  ];
}
