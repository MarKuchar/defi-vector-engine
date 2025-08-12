import { Indicator } from '../indicators/interface/Indicator';

export class IndicatorEngine {
  private indicators: Record<string, Indicator> = {};

  constructor(indicators: Indicator[]) {
    indicators.forEach(indicator => {
      this.indicators[indicator.name] = indicator;
    });
  }

  update(price: number): void {
    for (const name in this.indicators) {
      this.indicators[name].update(price);
    }
  }

  isReady(): boolean {
    return Object.values(this.indicators).every(indicator => indicator.isReady());
  }

  getValuesDetailed(): Record<string, Record<string, number | null>> {
    const snapshot: Record<string, Record<string, number | null>> = {};
    for (const [name, indicator] of Object.entries(this.indicators)) {
      snapshot[name] = indicator.getSnapshot();
    }
    return snapshot;
  }

  reset(): void {
    Object.values(this.indicators).forEach(indicator => indicator.reset());
  }

  listIndicators(): string[] {
    return Object.keys(this.indicators);
  }
}
