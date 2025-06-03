import {
  DriftClient,
  DriftEnv,
  DriftClientConfig,
  PerpMarketAccount,
  OraclePriceData,
  OracleSource,
} from '@drift-labs/sdk';
import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import EventEmitter from 'events';
import { marketConfig } from '../config/marketConfig';
import dotenv from 'dotenv';
import { getWalletFromEnv } from '../wallet/wallet';

dotenv.config();

export interface MarketDataUpdate {
  markPrice?: number;
  fundingRate?: number;
  oraclePrice?: number;
  volume?: number;
  openInterest?: number;
  dailyChangePercent?: number;
  timestamp: number;
}

export class MarketDataService extends EventEmitter {
  private driftClient!: DriftClient;
  private isSubscribed = false;
  private marketIndex: number;
  private lastUpdateTime = 0;
  private updateCount = 0;
  private logLevel: 'error' | 'warn' | 'info' | 'debug';

  constructor(
    perpMarketIndexes: number[] = [0], // Default SOL-PERP
    private spotMarketIndexes: number[] = [0, 1] // Default USDC and SOL spot
  ) {
    super();
    this.marketIndex = process.env.MARKET_INDEX ?
      parseInt(process.env.MARKET_INDEX) :
      perpMarketIndexes[0];
    this.logLevel = (process.env.LOG_LEVEL as any) || 'info';
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
        oracleInfos: [{
          publicKey: new PublicKey(
            process.env.ORACLE_PUBKEY || 'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix'
          ),
          source: OracleSource.PYTH,
        }],
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

  private handlePerpMarketUpdate = (market: PerpMarketAccount) => {
    if (market.marketIndex === this.marketIndex) {
      const now = Date.now();
      const update: MarketDataUpdate = {
        timestamp: now
      };

      // Price Data
      if (marketConfig.indicators.trackMarkPrice) {
        update.markPrice = parseFloat((market.amm.lastMarkPriceTwap.toNumber() / 1e6).toFixed(6));
      }

      // Funding Rate
      if (marketConfig.indicators.trackFundingRate) {
        const fundingRate = market.amm.lastFundingRate.toNumber() / 1e9; // Proper scaling
        update.fundingRate = parseFloat((fundingRate * 100).toFixed(4)); // Convert to percentage
      }


      // Volume (using base asset amount)
      if (marketConfig.indicators.trackVolume) {
        update.volume = parseFloat((
          market.amm.baseAssetAmountWithUnsettledLp.abs().toNumber() / 1e6
        ).toFixed(marketConfig.volumePrecision));
      }

      // Open Interest (using maxOpenInterest)
      if (marketConfig.indicators.trackOpenInterest) {
        update.openInterest = parseFloat((
          market.amm.maxOpenInterest.toNumber() / 1e6
        ).toFixed(marketConfig.volumePrecision));
      }

      this.updateCount++;
      this.lastUpdateTime = now;

      console.debug('Raw AMM values:', {
        funding: market.amm.lastFundingRate.toNumber(),
        volume: market.amm.baseAssetAmountWithUnsettledLp.toNumber()
      });

      if (Object.keys(update).length > 1) {
        this.logMarketData(update);
        this.emit('update', update);
      }
    }
  };

  private handleOraclePriceUpdate = (
    publicKey: PublicKey,
    oracleSource: OracleSource,
    data: OraclePriceData
  ) => {
    if (marketConfig.indicators.trackOraclePrice) {
      const update: MarketDataUpdate = {
        oraclePrice: parseFloat((data.price.toNumber() / 1e6).toFixed(6)),
        timestamp: Date.now()
      };
      this.log('debug', 'Oracle price update', update);
      this.emit('update', update);
    }
  };

  private setupEventListeners() {
    this.driftClient.eventEmitter.on('perpMarketAccountUpdate', this.handlePerpMarketUpdate);
    this.driftClient.eventEmitter.on('oraclePriceUpdate', this.handleOraclePriceUpdate);
    this.driftClient.eventEmitter.on('error', (err) => {
      this.log('error', 'Drift client error', err);
      this.emit('error', err);
    });
  }

  private removeEventListeners() {
    if (this.driftClient) {
      this.driftClient.eventEmitter.off('perpMarketAccountUpdate', this.handlePerpMarketUpdate);
      this.driftClient.eventEmitter.off('oraclePriceUpdate', this.handleOraclePriceUpdate);
    }
  }

  public async close(): Promise<void> {
    if (this.isSubscribed) {
      try {
        this.removeEventListeners();
        await this.driftClient.unsubscribe();
        this.isSubscribed = false;
        this.log('info', 'MarketDataService successfully closed');
      } catch (err) {
        this.log('error', 'Error closing MarketDataService', err);
        this.emit('error', err);
      }
    }
  }

  private logMarketData(data: MarketDataUpdate): void {
    const logParts = [
      `[${new Date(data.timestamp).toISOString()}]`,
      `Market: ${this.marketIndex}`
    ];

    if (data.markPrice !== undefined) {
      logParts.push(`Mark: ${data.markPrice.toFixed(4)}`);
    }
    if (data.oraclePrice !== undefined) {
      logParts.push(`Oracle: ${data.oraclePrice.toFixed(4)}`);
    }
    if (data.volume !== undefined) {
      logParts.push(`Vol: ${data.volume.toFixed(2)}`);
    }
    if (data.fundingRate !== undefined) {
      logParts.push(`Funding: ${(data.fundingRate * 100).toFixed(4)}%`);
    }

    this.log('info', logParts.join(' '));
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

  public onUpdate(callback: (data: MarketDataUpdate) => void): void {
    this.on('update', callback);
  }

  public onError(callback: (error: Error) => void): void {
    this.on('error', callback);
  }

  public getStatus() {
    return {
      isSubscribed: this.isSubscribed,
      marketIndex: this.marketIndex,
      lastUpdateTime: this.lastUpdateTime,
      updateCount: this.updateCount
    };
  }
}