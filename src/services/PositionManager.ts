import { DriftClient, OrderType, PositionDirection } from '@drift-labs/sdk';
import { BN } from 'bn.js';
import { RiskEngine } from './RiskEngine';

interface Position {
  market: string;
  size: number;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
}

export class PositionManager {
  private openPositions = new Map<string, Position>();

  constructor(
    private driftClient: DriftClient,
    private riskEngine: RiskEngine
  ) {}

  async openPosition(
    market: string,
    size: number,
    direction: 'LONG' | 'SHORT'
  ): Promise<boolean> {
      const canOpen = await this.riskEngine.canOpenPosition(market, size);
      if (!canOpen) {
        console.warn(`Risk check failed for ${market} ${direction} position`);
        return false;
      }

    try {
      const txSig = await this.driftClient.placePerpOrder({
        marketIndex: this.getMarketIndex(market),
        orderType: OrderType.MARKET,
        baseAssetAmount: new BN(size),
        direction: direction === 'LONG' 
          ? PositionDirection.LONG 
          : PositionDirection.SHORT,
      });

      const position: Position = {
        market,
        size,
        direction,
        entryPrice: await this.getMarketPrice(market)
      };

      this.openPositions.set(market, position);
      return true;
    } catch (err) {
      console.error('Failed to open position:', err);
      return false;
    }
  }

  async closePosition(market: string): Promise<boolean> {
    const position = this.openPositions.get(market);
    if (!position) return false;

    try {
      const txSig = await this.driftClient.placePerpOrder({
        marketIndex: this.getMarketIndex(market),
        orderType: OrderType.MARKET,
        baseAssetAmount: new BN(position.size),
        direction: position.direction === 'LONG'
          ? PositionDirection.SHORT
          : PositionDirection.LONG,
      });

      this.openPositions.delete(market);
      return true;
    } catch (err) {
      console.error('Failed to close position:', err);
      return false;
    }
  }

  private getMarketIndex(market: string): number {
    // Map market symbols to indexes
    const markets: Record<string, number> = {
      'SOL-PERP': 0,
      'BTC-PERP': 1,
      // Add other markets
    };
    return markets[market] ?? 0;
  }

private async getMarketPrice(market: string): Promise<number> {
  const index = this.getMarketIndex(market);
  
  try {
    const marketAccount = this.driftClient.getPerpMarketAccount(index);
    if (!marketAccount) {
      throw new Error(`Market account not found for ${market}`);
    }
    
    const oraclePriceData = this.driftClient.getOracleDataForPerpMarket(index);
    return oraclePriceData.price.toNumber() / 1e6;
    
  } catch (err) {
    console.error(`Failed to get price for ${market}:`, err);
    throw err;
  }
}
}