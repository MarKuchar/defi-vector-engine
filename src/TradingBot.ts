import { MarketDataService, MarketDataUpdate } from './services/MarketDataService';
import { VolumeTrackerService } from './services/VolumeTrackerService';
import { EventSubscriberManager } from './services/EventSubscriberManager';
import { getAccountEquity } from './utils/getAccountEquity';
import { SimpleCircuitBreaker } from './services/SimpleCircuitBreaker';
import { getCurrentPnl } from './services/PnlService';
import { DriftClient } from '@drift-labs/sdk';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { getWalletFromEnv } from './wallet/wallet';
import { RiskEngine } from './engines/RiskEngine';
import { PositionManager } from './services/PositionManager';
import { DEFAULT_RISK_CONFIG } from './config/RiskConfig';
import { StrategyConfig } from './strategies/StrategyTypes';
import { PriceHistory } from './dataholders/PriceHistory';
import { BaseStrategy } from './strategies/BaseStrategy';
import { IndicatorEngine } from './engines/IndicatorEngine';
import { createDefaultIndicators } from './utils/createDefaultIndicators';
import { createStrategy } from './strategies/StrategyFactory';
import logger from './utils/logger';

export class TradingBot {
  private connection = new Connection(
    process.env.RPC_URL || clusterApiUrl('devnet'),
    'confirmed'
  );
  private wallet = getWalletFromEnv();
  private driftClient: DriftClient;

  private marketDataService = new MarketDataService();
  private volumeTracker = new VolumeTrackerService();
  private eventSubscriberManager: EventSubscriberManager;

  private strategy: BaseStrategy;
  private priceHistory: PriceHistory;
  private circuitBreaker: SimpleCircuitBreaker;
  private indicatorEngine: IndicatorEngine;
  private riskEngine: RiskEngine;
  private positionManager: PositionManager;

  private healthMonitor?: NodeJS.Timeout;

  private hasLoggedWarmup = false;

  constructor(private strategyConfig: StrategyConfig) {
    this.driftClient = new DriftClient({
      connection: this.connection,
      wallet: this.wallet,
      env: 'devnet',
      accountSubscription: { type: 'websocket', resubTimeoutMs: 30000 },
    });

    this.eventSubscriberManager = new EventSubscriberManager(this.driftClient);

    this.strategy = createStrategy(strategyConfig);
    this.priceHistory = new PriceHistory(strategyConfig.entryRules.priceAboveMA.period);
    this.circuitBreaker = new SimpleCircuitBreaker(
      strategyConfig.circuitBreaker ?? { maxDailyLoss: -0.05, maxDrawdown: -0.1 }
    );
    this.indicatorEngine = new IndicatorEngine(createDefaultIndicators(strategyConfig));
    this.riskEngine = new RiskEngine(this.driftClient, DEFAULT_RISK_CONFIG);
    this.positionManager = new PositionManager(this.driftClient, this.riskEngine);
  }

  async start(): Promise<void> {
    // Subscribe drift client and market data
    await this.driftClient.subscribe();
    await this.marketDataService.init();
    await this.eventSubscriberManager.start();

    // Hook event handlers
    this.marketDataService.on('priceUpdate', this.onPriceUpdate.bind(this));
    this.volumeTracker.on('volumeUpdate', update =>
      logger.info(`Rolling 24h Volume: ${update.volume24h.toFixed(2)}`)
    );

    this.eventSubscriberManager.on('orderAction', record => {
      logger.info(`Action: ${record.action} on market ${record.marketIndex}`);
      if (record.marketIndex === this.marketDataService.marketIndex) {
        const amount = parseFloat(record.baseAmount ?? '0');
        this.volumeTracker.addTrade(amount);
      }
    });

    this.eventSubscriberManager.on('liquidation', record => {
      if (record.bankrupt) {
        logger.info(`Bankrupt liquidation for ${record.liquidatee}`);
      }
    });

    // Health monitor
    this.healthMonitor = setInterval(() => {
      logger.info('Bot Health:', {
        uptime: process.uptime(),
        lastPriceUpdate: this.marketDataService.lastUpdateTime,
        openPositions: this.positionManager.getAllPositions().map(p => ({
          market: p.market,
          size: p.size,
          direction: p.direction,
        })),
        memory: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB`,
      });
    }, 300000);

    logger.info('Trading bot started successfully');
  }

  async stop(): Promise<void> {
    if (this.healthMonitor) clearInterval(this.healthMonitor);
    await this.marketDataService.close();
    this.volumeTracker.close();
    await this.driftClient.unsubscribe();
  }

  private async onPriceUpdate(data: MarketDataUpdate): Promise<void> {
    if (!data.markPrice) {
      logger.warn('Price update received without markPrice, skipping...');
      return;
    }

    try {
      const currentPrice = data.markPrice;
      this.indicatorEngine.update(currentPrice);
      this.priceHistory.add(currentPrice);
      logger.debug(`PriceHistory (last 5): ${this.priceHistory.getLastN(5).join(', ')}`);

      // WARMUP 
      if (!this.indicatorEngine.isReady()) {
        if (!this.hasLoggedWarmup) {
          logger.info('Waiting for indicators to warm up before generating signals...');
          this.hasLoggedWarmup = true;
        }
        return;
      }
      this.hasLoggedWarmup = false;

      const [currentPnl, equity] = await Promise.all([
        getCurrentPnl(this.driftClient),
        getAccountEquity(this.driftClient),
      ]);

      const detailedIndicators = this.indicatorEngine.getValuesDetailed();

      // logger.info(`[PRICE UPDATE] ${JSON.stringify({ currentPrice, pnl: currentPnl.toFixed(6), equity: equity.toFixed(6), priceHistoryLength: this.priceHistory.length, indicators: detailedIndicators })}`);

      if (!this.circuitBreaker.checkDailyPnL(currentPnl)) {
        logger.warn(`Circuit breaker tripped (PnL: ${currentPnl.toFixed(6)}) — skipping trade`);
        return;
      }

      const signal = this.strategy.generateSignal({
        currentPrice,
        closes: [],
        highs: [],
        lows: [],
        volumes: [],
        timestamp: Date.now(),
        indicators: detailedIndicators,
      });

      logger.info('Generated Signal:', signal);

      const size = (equity * (this.strategyConfig.risk?.maxPositionSize ?? 0)) / currentPrice;

      if (process.env.PAPER_TRADING === 'true') {
        logger.info(`[PAPER] Would ${signal.direction ?? 'HOLD'} ${size.toFixed(4)} ${this.strategyConfig.pair} at ${currentPrice}`);
        return;
      }

      if (signal.direction === 'LONG') {
        logger.info(`Opening LONG position: size=${size.toFixed(4)} at price=${currentPrice}`);
        await this.positionManager.openPosition(this.strategyConfig.pair, size, 'LONG');
      } else if (signal.direction === 'CLOSE') {
        logger.info('Closing position');
        await this.positionManager.closePosition(this.strategyConfig.pair);
      } else {
        logger.debug('No trading action taken');
      }
    } catch (err) {
      logger.error('Trade execution error:', err instanceof Error ? err.message : err);
    }
  }
}
