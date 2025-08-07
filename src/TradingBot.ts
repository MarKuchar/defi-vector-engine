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
      console.log(`Rolling 24h Volume: ${update.volume24h.toFixed(2)}`)
    );

    this.eventSubscriberManager.on('orderAction', record => {
      console.log(`Action: ${record.action} on market ${record.marketIndex}`);
      if (record.marketIndex === this.marketDataService.marketIndex) {
        const amount = parseFloat(record.baseAmount ?? '0');
        this.volumeTracker.addTrade(amount);
      }
    });

    this.eventSubscriberManager.on('liquidation', record => {
      if (record.bankrupt) {
        console.log(`Bankrupt liquidation for ${record.liquidatee}`);
      }
    });

    // Health monitor
    this.healthMonitor = setInterval(() => {
      console.log('Bot Health:', {
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

    console.log('Trading bot started successfully');
  }

  async stop(): Promise<void> {
    if (this.healthMonitor) clearInterval(this.healthMonitor);
    await this.marketDataService.close();
    this.volumeTracker.close();
    await this.driftClient.unsubscribe();
  }

  private async onPriceUpdate(data: MarketDataUpdate): Promise<void> {
    if (!data.markPrice) {
      return;
    }

    try {
      const currentPrice = data.markPrice;
      this.indicatorEngine.update(currentPrice);
      this.priceHistory.add(currentPrice);

      const [currentPnl, equity] = await Promise.all([
        getCurrentPnl(this.driftClient),
        getAccountEquity(this.driftClient),
      ]);

      if (!this.circuitBreaker.checkDailyPnL(currentPnl)) {
        console.warn(`Circuit breaker tripped (PnL: ${currentPnl.toFixed(4)})`);
        return;
      }

      const snapshot = this.indicatorEngine.getValues();

      const signal = this.strategy.generateSignal({
        currentPrice,
        closes: [],
        highs: [],
        lows: [],
        volumes: [],
        timestamp: Date.now(),
        indicators: snapshot
      });

      const size = (equity * (this.strategyConfig.risk?.maxPositionSize ?? 0)) / currentPrice;

      if (process.env.PAPER_TRADING === 'true') {
        console.log(`[PAPER] Would ${signal.direction ?? 'HOLD'} ${size.toFixed(4)} ${this.strategyConfig.pair} at ${currentPrice}`);
        return;
      }

      if (signal.direction === 'LONG') {
        await this.positionManager.openPosition(this.strategyConfig.pair, size, 'LONG');
      } else if (signal.direction === 'CLOSE') {
        await this.positionManager.closePosition(this.strategyConfig.pair);
      }
    } catch (err) {
      console.error('Trade execution error:', err instanceof Error ? err.message : err);
    }
  }
}
