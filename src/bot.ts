import path from 'path';
import fs from 'fs/promises';
import { parseStrategyConfig, StrategyConfig } from './strategies/StrategyTypes';
import { TradingBot } from './TradingBot';

async function loadStrategyConfig(): Promise<StrategyConfig> {
  const strategyName = process.env.STRATEGY_NAME || 'meanReversion';
  const configPath = path.resolve(__dirname, `./config/strategies/${strategyName}.json`);
  const raw = await fs.readFile(configPath, 'utf8');
  return parseStrategyConfig(JSON.parse(raw));
}

(async () => {
  try {
    const strategyConfig = await loadStrategyConfig();
    console.log('Strategy Config loaded:', strategyConfig);

    const bot = new TradingBot(strategyConfig);
    await bot.start();

    process.on('SIGINT', async () => {
      console.log('Shutting down gracefully...');
      await bot.stop();
      process.exit(0);
    });
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();