import { Indicator } from "./interface/Indicator";
import { SMA } from "./SMA";

export class BollingerBands implements Indicator {
  name = "BollingerBands";
  private period: number;
  private stdDevMultiplier: number;
  private prices: number[] = [];
  private sma: SMA;

  private _upper: number | null = null;
  private _middle: number | null = null;
  private _lower: number | null = null;

  constructor(period: number, stdDevMultiplier = 2) {
    this.period = period;
    this.stdDevMultiplier = stdDevMultiplier;
    this.sma = new SMA(period);
  }

  update(value: number): void {
    this.prices.push(value);
    if (this.prices.length > this.period) {
      this.prices.shift();
    }

    this.sma.update(value);

    if (this.prices.length === this.period) {
      const mean = this.sma.getValue();
      if (mean === null) {
        this._upper = this._middle = this._lower = null;
        return;
      }
      this._middle = mean;

      const variance =
        this.prices.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / this.period;
      const stdDev = Math.sqrt(variance);

      this._upper = mean + this.stdDevMultiplier * stdDev;
      this._lower = mean - this.stdDevMultiplier * stdDev;
    } else {
      this._upper = this._middle = this._lower = null;
    }
  }

  getValue(): number | null {
    // Return middle SMA as the main value or null if not ready
    return this._middle;
  }

  getUpperBand(): number | null {
    return this._upper;
  }

  getLowerBand(): number | null {
    return this._lower;
  }

  reset(): void {
    this.prices = [];
    this.sma.reset();
    this._upper = this._middle = this._lower = null;
  }
}