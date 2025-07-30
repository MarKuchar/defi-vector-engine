import { MeanReversionStrategy } from './specific/MeanReversionStrategy';
import { StrategyConfig } from '../utils/parseStrategyConfig';
import { BaseStrategy } from './BaseStrategy';

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
