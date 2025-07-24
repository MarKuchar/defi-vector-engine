import { MarketDataService, MarketDataUpdate } from './services/MarketDataService';
import { VolumeTrackerService } from './services/VolumeTrackerService';
import { EventSubscriberManager } from './services/EventSubscriberManager';
import fs from 'fs/promises';
import path from 'path';
import { parseStrategyConfig } from './utils/parseStrategyConfig';
import { getAccountEquity } from './utils/getAccountEquity'
import { SimpleCircuitBreaker } from './services/SimpleCircuitBreaker';
import { DriftClient } from '@drift-labs/sdk';
import { getCurrentPnl } from './services/PnlService';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { getWalletFromEnv } from './wallet/wallet';
import { MeanReversionStrategy } from './strategies/MeanReversionStrategy';
import { RiskEngine } from './engines/RiskEngine';
import { PositionManager } from './services/PositionManager';
import { DEFAULT_RISK_CONFIG } from './config/RiskConfig';
import { StrategyConfig } from './strategies/StrategyTypes';
import { PriceHistory } from './dataholders/PriceHistory';
import { StrategyEngine } from './engines/StrategyEngine';

async function main() {
  try {
    // Initialize RPC and wallet
    const connection = new Connection(
      process.env.RPC_URL || clusterApiUrl('devnet'),
      'confirmed'
    );
    const wallet = getWalletFromEnv();

    // Load strategy config
    const strategyConfig = await loadStrategyConfig();
    console.log('Strategy Config loaded:', strategyConfig);

    // Initialize Drift client and subscribe
    const driftClient = new DriftClient({
      connection,
      wallet,
      env: 'devnet',
      accountSubscription: {
        type: 'websocket',
        resubTimeoutMs: 30000,
      },
    });
    await driftClient.subscribe();

    // Initialize core services
    const marketDataService = new MarketDataService();
    const volumeTracker = new VolumeTrackerService();
    const eventSubscriberManager = new EventSubscriberManager(driftClient);

    const strategyEngine = new StrategyEngine(strategyConfig);
    const priceHistory = new PriceHistory(strategyConfig.entryRules.priceAboveMA.period);

    const riskEngine = new RiskEngine(driftClient, DEFAULT_RISK_CONFIG);
    const positionManager = new PositionManager(driftClient, riskEngine);
    const circuitBreaker = new SimpleCircuitBreaker(
      strategyConfig.circuitBreaker || { maxDailyLoss: -0.05, maxDrawdown: -0.1 }
    );

    // Pipe MarketDataService price updates
    marketDataService.on('priceUpdate', async (data: MarketDataUpdate) => {
      if (!data.markPrice) return;

      priceHistory.add(data.markPrice);
      const currentPrice = data.markPrice;

      try {
        const currentPnl = await getCurrentPnl(driftClient);
        if (!circuitBreaker.checkDailyPnL(currentPnl)) {
          console.warn('Circuit breaker tripped - trading paused');
          return;
        }

        const shouldBuy = strategyEngine.evaluate(priceHistory, currentPrice);
        if (shouldBuy) {
          const accountEquity = await getAccountEquity(driftClient);
          const maxRiskAmount = accountEquity * strategyConfig.risk.maxPositionSize;
          const size = maxRiskAmount / currentPrice;

          await positionManager.openPosition(strategyConfig.pair, size, 'LONG');
        } else {
          await positionManager.closePosition(strategyConfig.pair);
        }
      } catch (err) {
        console.error('Trade execution error:', err);
      }
    });

    // Listen for volume updates and log or extend here
    volumeTracker.on('volumeUpdate', (update) => {
      console.log(`Rolling 24h Volume: ${update.volume24h.toFixed(2)}`);
    });

    // Listen for errors
    marketDataService.on('error', (err) => {
      console.error('[MarketDataService Error]', err);
    });
    volumeTracker.on('error', (err) => {
      console.error('[VolumeTrackerService Error]', err);
    });

    // Initialize and start services
    await marketDataService.init();

    // Let EventSubscriberManager listen to Drift events and forward
    eventSubscriberManager.start();

    // Route OrderRecord events from EventSubscriberManager to VolumeTrackerService
    eventSubscriberManager.on('OrderRecord', (event) => {
      if (event.marketIndex === marketDataService.marketIndex) {
        const amount = Math.abs(event.baseAssetAmount.toNumber()) / 1e6; // or marketConfig.volumeDivisor
        volumeTracker.addTrade(amount);
      }
    });

    console.log('Trading bot started successfully');

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      await marketDataService.close();
      volumeTracker.close();
      await driftClient.unsubscribe();
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to initialize trading bot:', err);
    process.exit(1);
  }
}

async function loadStrategyConfig(): Promise<StrategyConfig> {
  const strategyName = process.env.STRATEGY_NAME || 'meanReversion';
  const configPath = path.resolve(__dirname, `./config/strategies/${strategyName}.json`);

  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const json = JSON.parse(raw);
    return parseStrategyConfig(json);
  } catch (err) {
    console.error(`Failed to load strategy config from ${configPath}:`, err);
    throw new Error('Invalid strategy configuration');
  }
}

main();