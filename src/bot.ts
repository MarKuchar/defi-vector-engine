import { MarketDataService, MarketDataUpdate } from './services/MarketDataService';

async function main() {
  const marketDataService = new MarketDataService();

  marketDataService.on('error', (err) => {
    console.error('[MarketDataService Error]', err);
  });

  marketDataService.onUpdate((data: MarketDataUpdate) => {
    console.log('[MarketData Update]', data);
    // Here you can add your bot logic reacting to market data updates
    // e.g., analyze mark price, funding rate, or oracle price
  });

  try {
    await marketDataService.init();
    console.log('MarketDataService initialized and subscribed');

    // Keep the process alive or run your bot logic here
  } catch (err) {
    console.error('Failed to start MarketDataService:', err);
  }

  // Optional: handle shutdown signals to gracefully close subscription
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, closing MarketDataService...');
    await marketDataService.close();
    process.exit(0);
  });
}

main();
