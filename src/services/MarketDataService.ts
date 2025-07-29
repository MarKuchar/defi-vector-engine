import {
  DriftClient,
  DriftEnv,
  DriftClientConfig,
  PerpMarketAccount,
  OraclePriceData,
  OracleSource,
  EventSubscriber,
} from '@drift-labs/sdk';
import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import EventEmitter from 'events';
import { marketConfig } from '../config/MarketConfig';
import dotenv from 'dotenv';
import { getWalletFromEnv } from '../wallet/wallet';
import { Candle } from '../dataholders/Candle';

dotenv.config();

export interface MarketDataUpdate {
  markPrice?: number;
  fundingRate?: number;
  openInterest?: number;
  timestamp: number;
}

export interface OracleUpdate {
  publicKey: PublicKey;
  oracleSource: OracleSource;
  data: OraclePriceData;
}

export class MarketDataService extends EventEmitter {
  private candles: Map<string, Candle[]> = new Map();
  private currentMinuteCandle: Partial<Candle> = {};

  private driftClient!: DriftClient;
  private eventSubscriber!: EventSubscriber;
  private isSubscribed = false;
  public marketIndex: number;
  public lastUpdateTime = Date.now();
  private updateCount = 0;
  private logLevel: 'error' | 'warn' | 'info' | 'debug';
  private healthCheckInterval!: NodeJS.Timeout;

  constructor(
    perpMarketIndexes: number[] = [0],
    private spotMarketIndexes: number[] = [0, 1]
  ) {
    super();
    this.marketIndex = process.env.MARKET_INDEX
      ? parseInt(process.env.MARKET_INDEX)
      : perpMarketIndexes[0];
    this.logLevel = (process.env.LOG_LEVEL as any) || 'info';
    this.setupHealthCheck();
  }

  public async init(): Promise<void> {
    try {
      if (this.isSubscribed) {
        await this.close();
      }

      const connection = new Connection(
        process.env.RPC_URL || clusterApiUrl('devnet'),
        'confirmed'
      );
      const wallet = getWalletFromEnv();

      const driftConfig: DriftClientConfig = {
        connection,
        wallet,
        env: (process.env.DRIFT_ENV as DriftEnv) || 'devnet',
        accountSubscription: {
          type: 'websocket',
          resubTimeoutMs: 30000,
        },
        perpMarketIndexes: [this.marketIndex],
        spotMarketIndexes: this.spotMarketIndexes,
        oracleInfos: [
          {
            publicKey: new PublicKey(
              process.env.ORACLE_PUBKEY || 'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix'
            ),
            source: OracleSource.PYTH,
          },
        ],
      };

      this.driftClient = new DriftClient(driftConfig);
      await this.driftClient.subscribe();
      this.isSubscribed = true;

      this.setupEventListeners();

      this.log('info', `MarketDataService initialized for market index ${this.marketIndex}`);
    } catch (err) {
      this.log('error', 'Failed to initialize MarketDataService', err);
      this.emit('error', err);
      throw err;
    }
  }

  public getCandles(timeframe: string, limit = 200): Candle[] {
    return this.candles.get(timeframe)?.slice(-limit) || [];
  }

  private updateCandles(price: number, timestamp: number) {
    const minute = Math.floor(timestamp / 60000) * 60000;

    if (!this.currentMinuteCandle.timestamp) {
      // Initialize new candle
      this.currentMinuteCandle = {
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
        timestamp: minute,
        timeframe: '1m'
      };
    } else if (timestamp >= minute + 60000) {
      // Finalize current candle
      this.saveCandle(this.currentMinuteCandle as Candle);

      // Start new candle
      this.currentMinuteCandle = {
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
        timestamp: minute,
        timeframe: '1m'
      };
    } else {
      // Update current candle
      this.currentMinuteCandle.high = Math.max(this.currentMinuteCandle.high || 0, price);
      this.currentMinuteCandle.low = Math.min(this.currentMinuteCandle.low || Infinity, price);
      this.currentMinuteCandle.close = price;
    }
  }

  private saveCandle(candle: Candle) {
    const timeframe = candle.timeframe;
    if (!this.candles.has(timeframe)) {
      this.candles.set(timeframe, []);
    }

    const candles = this.candles.get(timeframe)!;
    candles.push(candle);

    // Keep only last 200 candles per timeframe
    if (candles.length > 200) {
      candles.shift();
    }
  }

  private setupEventListeners() {
    this.driftClient.eventEmitter.on('perpMarketAccountUpdate', this.handlePerpMarketUpdate);
    this.driftClient.eventEmitter.on('oraclePriceUpdate', this.handleOraclePriceUpdate);
    this.driftClient.eventEmitter.on('error', (err) => {
      this.log('error', 'Drift client error', err);
      this.emit('error', err);
    });
  }

  private handlePerpMarketUpdate = (market: PerpMarketAccount) => {
    if (market.marketIndex === this.marketIndex) {
      const now = Date.now();
      const price = market.amm.lastMarkPriceTwap.toNumber() / 1e6;
      const update: MarketDataUpdate = {
        timestamp: now,
        markPrice: price,
        fundingRate: market.amm.lastFundingRate.toNumber() / 1e6,
        openInterest: market.amm.maxOpenInterest.toNumber() / 1e6,
      };

      this.updateCount++;
      this.lastUpdateTime = now;

      this.updateCandles(price, now);

      this.emit('priceUpdate', update);
    }
  };

  private handleOraclePriceUpdate = (
    publicKey: PublicKey,
    oracleSource: OracleSource,
    data: OraclePriceData
  ) => {
    this.emit('oracleUpdate', { publicKey, oracleSource, data });
  };

  private setupHealthCheck() {
    if (process.env.NODE_ENV !== 'test') {
      this.healthCheckInterval = setInterval(() => {
        if (Date.now() - this.lastUpdateTime > marketConfig.maxDataAgeMs) {
          if (this.updateCount > 0) {
            this.log(
              'warn',
              `Stale data - last update ${(Date.now() - this.lastUpdateTime) / 1000}s ago`
            );
            this.reconnect();
          }
        }
      }, 5000);
    }
  }

  private async reconnect() {
    this.log('warn', 'Attempting reconnect...');
    try {
      await this.close();
      await this.init();
      this.log('info', 'Reconnect successful');
    } catch (err) {
      this.log('error', 'Reconnect failed', err);
    }
  }

  public async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.isSubscribed) {
      try {
        this.driftClient.eventEmitter.off('perpMarketAccountUpdate', this.handlePerpMarketUpdate);
        this.driftClient.eventEmitter.off('oraclePriceUpdate', this.handleOraclePriceUpdate);
        await this.driftClient.unsubscribe();
        this.isSubscribed = false;
        this.log('info', 'MarketDataService successfully closed');
      } catch (err) {
        this.log('error', 'Error closing MarketDataService', err);
        this.emit('error', err);
      }
    }
  }

  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string, error?: any) {
    if (
      level === 'error' ||
      level === 'warn' ||
      (level === 'info' && this.logLevel !== 'error' && this.logLevel !== 'warn') ||
      (level === 'debug' && this.logLevel === 'debug')
    ) {
      console[level](`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`);
      if (error) {
        console[level](error);
      }
    }
  }
}
