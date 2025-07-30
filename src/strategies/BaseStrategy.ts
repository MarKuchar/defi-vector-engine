import type { MarketData, TradeSignal } from './StrategyTypes';

export interface BaseStrategy {
  update(data: MarketData): void;
  generateSignal(data: MarketData): TradeSignal;
}