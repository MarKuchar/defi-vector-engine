import path from 'path';
import { BacktestEngine, saveBacktestResult } from '../../engines/BacktestEngine';
import { parseStrategyConfig } from '../../strategies/StrategyTypes';
import { BaseStrategy } from '../../strategies/BaseStrategy';
import { createStrategy } from '../../strategies/StrategyFactory';

async function main() {
  const configPath = path.resolve(__dirname, '../../config/strategies/meanReversion.json');
  const strategyConfig = parseStrategyConfig(await import(configPath).then(m => m.default));
  const strategy: BaseStrategy = createStrategy(strategyConfig);

  const backtest = new BacktestEngine(strategyConfig, strategy);
  await backtest.loadHistoricalData(path.resolve(__dirname, '../../data/historical_sol_1m.json'));

  const result = await backtest.run();
  saveBacktestResult(result);
}

main();