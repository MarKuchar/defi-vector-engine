import logger from "../utils/logger";

interface CircuitBreakerConfig {
  maxDailyLoss?: number;
  maxDrawdown?: number;
}

export class SimpleCircuitBreaker {
  private maxDailyLoss: number;
  private maxDrawdown: number;

  private dailyPnLTripped = false;
  private drawdownTripped = false;


  constructor(config?: CircuitBreakerConfig) {
    this.maxDailyLoss = config?.maxDailyLoss ?? -0.05;
    this.maxDrawdown = config?.maxDrawdown ?? -0.10;
  }

  checkDailyPnL(pnl: number): boolean {
    const tripped = pnl < this.maxDailyLoss;
    if (tripped !== this.dailyPnLTripped) {
      if (tripped) {
        logger.warn(`[Risk] Daily PnL limit breached: ${pnl.toFixed(2)} < ${this.maxDailyLoss}`);
      } else {
        logger.info('[Risk] Daily PnL recovered, circuit breaker reset.');
      }
      this.dailyPnLTripped = tripped;
    }
    return !tripped;
  }

  checkMaxDrawdown(drawdown: number): boolean {
    const tripped = drawdown < this.maxDrawdown;
    if (tripped !== this.drawdownTripped) {
      if (tripped) {
        logger.warn(`[Risk] Max drawdown limit breached: ${drawdown.toFixed(2)} < ${this.maxDrawdown}`);
      } else {
        logger.info('[Risk] Max drawdown recovered, circuit breaker reset.');
      }
      this.drawdownTripped = tripped;
    }
    return !tripped;
  }

  reset() {
    // Reset daily state (called at midnight)
  }
}
