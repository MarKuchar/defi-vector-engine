export interface CircuitBreaker {
  checkDailyPnL(pnl: number): boolean;
  checkMaxDrawdown(drawdown: number): boolean;
  reset(): void;
}
