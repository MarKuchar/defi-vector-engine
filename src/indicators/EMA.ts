import { Indicator } from "./interface/Indicator";

export class EMA implements Indicator {
  name = "EMA";
  private period: number;
  private multiplier: number;
  private ema: number | null = null;

  constructor(period: number) {
    this.period = period;
    this.multiplier = 2 / (period + 1);
  }

  update(value: number): void {
    if (this.ema === null) {
      this.ema = value; // Initialize EMA with first value
    } else {
      this.ema = (value - this.ema) * this.multiplier + this.ema;
    }
  }

  getValue(): number | null {
    return this.ema;
  }

  reset(): void {
    this.ema = null;
  }
}