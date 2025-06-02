import { CircuitBreaker } from '../interfaces/CircuitBreaker';

interface CircuitBreakerConfig {
  maxDailyLoss?: number;
  maxDrawdown?: number;
}

export class SimpleCircuitBreaker implements CircuitBreaker {
  private maxDailyLoss: number;
  private maxDrawdown: number;

  constructor(config?: CircuitBreakerConfig) {
    this.maxDailyLoss = config?.maxDailyLoss ?? -0.05;
    this.maxDrawdown = config?.maxDrawdown ?? -0.10;
  }

  checkDailyPnL(pnl: number): boolean {
    return pnl > this.maxDailyLoss;
  }

  checkMaxDrawdown(drawdown: number): boolean {
    return drawdown > this.maxDrawdown;
  }

  reset() {
    // Reset daily state (called at midnight)
  }
}
