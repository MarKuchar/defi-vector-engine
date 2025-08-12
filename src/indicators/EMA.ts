import { Indicator } from "./interface/Indicator";

export class EMA implements Indicator {
  name = "EMA";
  private period: number;
  private multiplier: number;
  private ema: number | null = null;
  private valuesCount = 0;

  constructor(period: number) {
    this.period = period;
    this.multiplier = 2 / (period + 1);
  }

  update(value: number): void {
    this.valuesCount++;
    if (this.ema === null) {
      this.ema = value;
    } else {
      this.ema = (value - this.ema) * this.multiplier + this.ema;
    }
  }

  isReady(): boolean {
    return this.valuesCount >= this.period;
  }

  getSnapshot(): { currentValue: number | null } {
    return { currentValue: this.ema };
  }

  reset(): void {
    this.ema = null;
    this.valuesCount = 0;
  }
}