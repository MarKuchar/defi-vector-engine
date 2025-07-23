import { MarketDataService, MarketDataUpdate } from './services/MarketDataService';
import { VolumeTrackerService } from './services/VolumeTrackerService';
import { EventSubscriberManager } from './services/EventSubscriberManager';
import fs from 'fs/promises';
import path from 'path';
import { parseStrategyConfig } from './utils/parseStrategyConfig';
import { SimpleCircuitBreaker } from './services/SimpleCircuitBreaker';
import { DriftClient } from '@drift-labs/sdk';
import { getCurrentPnl } from './services/PnlService';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { getWalletFromEnv } from './wallet/wallet';
import { MeanReversionStrategy } from './strategies/MeanReversionStrategy';
import { RiskEngine } from './services/RiskEngine';
import { PositionManager } from './services/PositionManager';
import { DEFAULT_RISK_CONFIG } from './types/RiskConfig';
import { StrategyConfig } from './strategies/StrategyTypes';
import { PriceHistory } from './dataholders/PriceHistory';

async function main() {
  try {
    // Initialize RPC and wallet
    const connection = new Connection(
      process.env.RPC_URL || clusterApiUrl('devnet'),
      'confirmed'
    );
    const wallet = getWalletFromEnv();

    const priceHistory = new PriceHistory(200);

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

    // Initialize strategy, risk, position management, circuit breaker
    const strategy = new MeanReversionStrategy(strategyConfig);
    const riskEngine = new RiskEngine(driftClient, DEFAULT_RISK_CONFIG);
    const positionManager = new PositionManager(driftClient, riskEngine);
    const circuitBreaker = new SimpleCircuitBreaker(
      strategyConfig.circuitBreaker || { maxDailyLoss: -0.05, maxDrawdown: -0.1 }
    );

    // Pipe MarketDataService price updates
    marketDataService.on('priceUpdate', async (data: MarketDataUpdate) => {
      console.log('[DEBUG] Received price update:', data);

      if (data.markPrice !== undefined) {
        priceHistory.add(data.markPrice);
      }

      try {
        const currentPnl = await getCurrentPnl(driftClient);
        if (!circuitBreaker.checkDailyPnL(currentPnl)) {
          console.warn('Circuit breaker tripped - trading paused');
          return;
        }

        const signal = strategy.generateSignal({
          currentPrice: data.markPrice || 0,
          closes: [],
          highs: [],
          lows: [],
          volumes: [],
          timestamp: data.timestamp,
        });

        if (!signal.direction) return;

        if (signal.direction === 'LONG') {
          await positionManager.openPosition(strategyConfig.pair, signal.size, 'LONG');
        } else if (signal.direction === 'CLOSE') {
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