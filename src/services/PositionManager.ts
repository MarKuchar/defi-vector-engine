import {
  DriftClient,
  OrderType,
  PositionDirection,
  OptionalOrderParams
} from '@drift-labs/sdk';
import { BN } from 'bn.js';
import { RiskEngine } from '../engines/RiskEngine';

interface OpenPosition {
  market: string;
  size: number;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  orderId?: string;
  timestamp: number;
}

export class PositionManager {
  private openPositions = new Map<string, OpenPosition>();
  private marketSymbolToIndex: Record<string, number> = {
    'SOL-PERP': 0,
    'BTC-PERP': 1,
    'ETH-PERP': 2
  };

  constructor(
    private readonly driftClient: DriftClient,
    private readonly riskEngine: RiskEngine
  ) { }

  async openPosition(
    market: string,
    size: number,
    direction: 'LONG' | 'SHORT',
    options?: {
      slippage?: number;
      reduceOnly?: boolean;
      markPrice?: number;
    }
  ): Promise<boolean> {
    const marketIndex = this.getMarketIndex(market);
    if (marketIndex === undefined) {
      console.error(`Unknown market: ${market}`);
      return false;
    }

    const perpMarket = this.driftClient.getPerpMarketAccount(marketIndex);
    if (!perpMarket) {
      throw new Error(`Perp market not found for marketIndex=${marketIndex}`);
    }
    const orderStepSize = perpMarket.amm.orderStepSize.toNumber();
    let baseAssetAmount = Math.ceil((size * 1e6) / orderStepSize) * orderStepSize;

    if (baseAssetAmount < orderStepSize) {
      console.warn(
        `Computed baseAssetAmount (${baseAssetAmount}) is below order step size (${orderStepSize}). Skipping order.`
      );
      return false;
    }

    try {
      const markPrice = options?.markPrice ?? this.getMarkPrice(marketIndex);
      const slippage = options?.slippage ?? 0.005;

      const orderPrice = direction === 'LONG'
        ? markPrice * (1 + slippage)
        : markPrice * (1 - slippage);

      const orderParams: OptionalOrderParams = {
        marketIndex,
        orderType: OrderType.LIMIT,
        price: new BN(Math.round(orderPrice * 1e6)), // price decimals 6 assumed
        baseAssetAmount: new BN(baseAssetAmount),
        direction: direction === 'LONG' ? PositionDirection.LONG : PositionDirection.SHORT,
        reduceOnly: options?.reduceOnly ?? false,
      };

      if (this.openPositions.has(market)) {
        console.warn(`Position already open for ${market}`);
        return false;
      }

      const txSig = await this.driftClient.placePerpOrder(orderParams);

      this.openPositions.set(market, {
        market,
        size,
        direction,
        entryPrice: orderPrice,
        orderId: txSig,
        timestamp: Date.now(),
      });
      console.log(`Opened ${direction} position on ${market} at ${orderPrice} for size ${size}`);

      return true;
    } catch (err) {
      console.error(`Failed to open ${direction} position on ${market}:`, err);
      return false;
    }
  }

  async closePosition(market: string): Promise<boolean> {
    const position = this.openPositions.get(market);
    if (!position) return false;

    const marketIndex = this.getMarketIndex(market);
    if (marketIndex === undefined) return false;

    try {
      const orderParams: OptionalOrderParams = {
        marketIndex,
        orderType: OrderType.MARKET,
        baseAssetAmount: new BN(position.size * 1e6),
        direction: position.direction === 'LONG'
          ? PositionDirection.SHORT
          : PositionDirection.LONG
      };

      await this.driftClient.placePerpOrder(orderParams);
      this.openPositions.delete(market);
      return true;
    } catch (err) {
      console.error(`Failed to close position on ${market}:`, err);
      return false;
    }
  }

  async cancelOrder(market: string, orderId: number): Promise<string> {
    const marketIndex = this.getMarketIndex(market);
    if (marketIndex === undefined) throw new Error(`Unknown market: ${market}`);

    try {
      const txSig = await this.driftClient.cancelOrder(
        orderId,       // number orderId
        undefined,     // optional TxParams
        marketIndex    // subAccountId (using marketIndex)
      );
      return txSig;
    } catch (err) {
      console.error(`Failed to cancel order ${orderId} on ${market}:`, err);
      throw err;
    }
  }

  private getMarkPrice(marketIndex: number): number {
    const market = this.driftClient.getPerpMarketAccount(marketIndex);
    if (!market) throw new Error(`Market ${marketIndex} not found`);
    return market.amm.lastMarkPriceTwap.toNumber() / 1e6;
  }

  private getMarketIndex(market: string): number | undefined {
    return this.marketSymbolToIndex[market];
  }
}