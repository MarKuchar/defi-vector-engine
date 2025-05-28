import {
  DriftClient,
  DriftEnv,
  DriftClientConfig,
  PerpMarketAccount,
  OraclePriceData,
  OracleSource,
  Wallet
} from '@drift-labs/sdk';
import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import EventEmitter from 'events';
import { marketConfig } from '../config/marketConfig';
import dotenv from 'dotenv';
import { getWalletFromEnv } from '../wallet/wallet';

// Load environment variables
dotenv.config();

// Extended environment variables typing
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      RPC_URL?: string;
      OWNER_PUBLIC_KEY: string;
      ORACLE_PUBKEY?: string;
      DRIFT_ENV?: string;
      MARKET_INDEX?: string; // Optional market index override
    }
  }
}

export interface MarketDataUpdate {
  markPrice?: number;
  fundingRate?: number;
  oraclePrice?: number;
  timestamp?: number;
}

export class MarketDataService extends EventEmitter {
  private driftClient!: DriftClient;
  private isSubscribed = false;
  private marketIndex: number;

  // Bound event handlers for proper cleanup
  private handlePerpMarketUpdate = (market: PerpMarketAccount) => {
    if (market.marketIndex === this.marketIndex) {
      const update: MarketDataUpdate = {
        timestamp: Date.now()
      };

      if (marketConfig.indicators.trackMarkPrice) {
        update.markPrice = parseFloat((market.amm.lastMarkPriceTwap.toNumber() / 1e6).toFixed(6));
      }

      if (marketConfig.indicators.trackFundingRate) {
        update.fundingRate = parseFloat((market.amm.lastFundingRate.toNumber() / 1e4).toFixed(8));
      }

      if (Object.keys(update).length > 1) { // More than just timestamp
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
      this.emit('update', {
        oraclePrice: parseFloat((data.price.toNumber() / 1e6).toFixed(6)),
        timestamp: Date.now()
      });
    }
  };

  constructor(
    perpMarketIndexes: number[] = [0], // Default SOL-PERP
    private spotMarketIndexes: number[] = [0, 1] // Default USDC and SOL spot
  ) {
    super();
    this.marketIndex = process.env.MARKET_INDEX ? 
      parseInt(process.env.MARKET_INDEX) : 
      perpMarketIndexes[0];
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

      console.log(`MarketDataService initialized for market index ${this.marketIndex}`);
    } catch (err) {
      console.error('Failed to initialize MarketDataService:', err);
      this.emit('error', err);
      throw err;
    }
  }

  private setupEventListeners() {
    this.driftClient.eventEmitter.on('perpMarketAccountUpdate', this.handlePerpMarketUpdate);
    this.driftClient.eventEmitter.on('oraclePriceUpdate', this.handleOraclePriceUpdate);
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
        console.log('MarketDataService successfully closed');
      } catch (err) {
        console.error('Error closing MarketDataService:', err);
        this.emit('error', err);
      }
    }
  }

  public onUpdate(callback: (data: MarketDataUpdate) => void): void {
    this.on('update', callback);
  }

  public onError(callback: (error: Error) => void): void {
    this.on('error', callback);
  }
}