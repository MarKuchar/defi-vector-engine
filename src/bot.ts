import { MarketDataService, MarketDataUpdate } from './services/MarketDataService';
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
import { RiskConfig } from './types/RiskConfig';

// Initialize connections
const connection = new Connection(
  process.env.RPC_URL || clusterApiUrl('devnet'), 
  'confirmed'
);
const wallet = getWalletFromEnv();

async function main() {
  try {
    // Load configurations
    const strategyConfig = await loadStrategyConfig();
    const riskConfig = await loadRiskConfig();
    console.log('Strategy Config loaded:', strategyConfig);

    // Initialize services
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

    const marketDataService = new MarketDataService();
    const strategy = new MeanReversionStrategy(strategyConfig);
    const riskEngine = new RiskEngine(driftClient, riskConfig);
    const positionManager = new PositionManager(driftClient, riskEngine);
    const circuitBreaker = new SimpleCircuitBreaker(
      strategyConfig.circuitBreaker || { maxDailyLoss: -0.05, maxDrawdown: -0.1 }
    );

    // Set up event handlers
    marketDataService.on('error', (err) => {
      console.error('[MarketDataService Error]', err);
    });

    marketDataService.onUpdate(async (data: MarketDataUpdate) => {
      try {
        // Check circuit breakers first
        const currentPnl = await getCurrentPnl(driftClient);
        if (!circuitBreaker.checkDailyPnL(currentPnl)) {
          console.warn('Circuit breaker tripped - trading paused');
          return;
        }

        // Generate trading signal
        const signal = strategy.generateSignal({
          currentPrice: data.markPrice || 0,
          closes: [], // Populate if needed
          highs: [],
          lows: [],
          volumes: [],
          timestamp: Date.now()
        });

        if (!signal.direction) return;

        // Execute trade with risk checks
        if (signal.direction === 'LONG') {
          await positionManager.openPosition(
            strategyConfig.pair,
            signal.size,
            'LONG'
          );
        } else if (signal.direction === 'CLOSE') {
          await positionManager.closePosition(strategyConfig.pair);
        }
      } catch (err) {
        console.error('Trade execution error:', err);
      }
    });

    // Initialize and run
    await marketDataService.init();
    console.log('Trading bot started successfully');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      await marketDataService.close();
      await driftClient.unsubscribe();
      process.exit(0);
    });

  } catch (err) {
    console.error('Failed to initialize trading bot:', err);
    process.exit(1);
  }
}

async function loadStrategyConfig() {
  const strategyName = process.env.STRATEGY_NAME || 'meanReversion';
  const raw = await fs.readFile(
    path.resolve(__dirname, `./config/strategies/${strategyName}.json`),
    'utf8'
  );
  return parseStrategyConfig(JSON.parse(raw));
}

async function loadRiskConfig(): Promise<RiskConfig> {
  try {
    const raw = await fs.readFile(
      path.resolve(__dirname, './config/risk/default.json'),
      'utf8'
    );
    return JSON.parse(raw);
  } catch {
    console.log('Using default risk configuration');
    return {
      maxPositionSize: 0.1,
      maxLeverage: 3,
      dailyLossLimit: 0.05,
      minEquityRatio: 0.1,
      maintenanceMarginBuffer: 0.05,
      minLiquidity: 10000,
      cooldownAfterLoss: 0
    };
  }
}

main();