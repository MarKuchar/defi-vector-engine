import { Indicator } from "./interface/Indicator";

export class SMA implements Indicator {
  name = "SMA";
  private period: number;
  private values: number[] = [];
  private sum = 0;

  constructor(period: number) {
    this.period = period;
  }

  update(value: number): void {
    this.values.push(value);
    this.sum += value;
    if (this.values.length > this.period) {
      this.sum -= this.values.shift()!;
    }
  }

  getValue(): number | null {
    if (this.values.length < this.period) {
      return null;
    }
    return this.sum / this.period;
  }

  reset(): void {
    this.values = [];
    this.sum = 0;
  }
}