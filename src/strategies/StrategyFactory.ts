import { MeanReversionStrategy } from './specific/MeanReversionStrategy';
import { BaseStrategy } from './BaseStrategy';
import { StrategyConfig } from './StrategyTypes';

export function createStrategy(config: StrategyConfig): BaseStrategy {
  switch (config.strategy) {
    case 'meanReversion':
      return new MeanReversionStrategy(config);
    // case 'momentum':
    //   return new MomentumStrategy(config);
    default:
      throw new Error(`Unknown strategy: ${config.strategy}`);
  }
}
