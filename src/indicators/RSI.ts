import { Indicator } from "./interface/Indicator";

export class RSI implements Indicator {
  name = "RSI";
  private period: number;
  private gains: number[] = [];
  private losses: number[] = [];
  private avgGain: number | null = null;
  private avgLoss: number | null = null;
  private prevValue: number | null = null;
  private currentRSI: number | null = null;

  constructor(period: number) {
    this.period = period;
  }

  update(value: number): void {
    if (this.prevValue === null) {
      this.prevValue = value;
      return;
    }

    const change = value - this.prevValue;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (this.gains.length < this.period) {
      this.gains.push(gain);
      this.losses.push(loss);
      if (this.gains.length === this.period) {
        this.avgGain = this.gains.reduce((a, b) => a + b, 0) / this.period;
        this.avgLoss = this.losses.reduce((a, b) => a + b, 0) / this.period;
        this.calculateRSI();
      }
    } else {
      // Wilder's smoothing
      this.avgGain = ((this.avgGain ?? 0) * (this.period - 1) + gain) / this.period;
      this.avgLoss = ((this.avgLoss ?? 0) * (this.period - 1) + loss) / this.period;
      this.calculateRSI();
    }

    this.prevValue = value;
  }

  private calculateRSI(): void {
    if (this.avgLoss === 0) {
      this.currentRSI = 100;
      return;
    }
    if (this.avgGain === 0) {
      this.currentRSI = 0;
      return;
    }
    const rs = (this.avgGain ?? 0) / (this.avgLoss ?? 1);
    this.currentRSI = 100 - 100 / (1 + rs);
  }

  getValue(): number | null {
    return this.currentRSI;
  }

  reset(): void {
    this.gains = [];
    this.losses = [];
    this.avgGain = null;
    this.avgLoss = null;
    this.prevValue = null;
    this.currentRSI = null;
  }
}