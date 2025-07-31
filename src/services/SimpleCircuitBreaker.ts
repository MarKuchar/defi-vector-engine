interface CircuitBreakerConfig {
  maxDailyLoss?: number;
  maxDrawdown?: number;
}

export class SimpleCircuitBreaker {
  private maxDailyLoss: number;
  private maxDrawdown: number;

  constructor(config?: CircuitBreakerConfig) {
    this.maxDailyLoss = config?.maxDailyLoss ?? -0.05;
    this.maxDrawdown = config?.maxDrawdown ?? -0.10;
  }

  checkDailyPnL(pnl: number): boolean {
    const tripped = pnl < this.maxDailyLoss;
    if (tripped) {
      console.warn(`[Risk] Daily PnL limit breached: ${pnl.toFixed(2)} < ${this.maxDailyLoss}`);
    }
    return !tripped;
  }

  checkMaxDrawdown(drawdown: number): boolean {
    const tripped = drawdown < this.maxDrawdown;
    if (tripped) {
      console.warn(`[Risk] Max drawdown limit breached: ${drawdown.toFixed(2)} < ${this.maxDrawdown}`);
    }
    return !tripped;
  }

  reset() {
    // Reset daily state (called at midnight)
  }
}
