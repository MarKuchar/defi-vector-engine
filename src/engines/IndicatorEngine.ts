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

  getIndicatorValue(name: string): number | null {
    return this.indicators[name]?.getValue() ?? null;
  }

  reset(): void {
    Object.values(this.indicators).forEach(indicator => indicator.reset());
  }

  listIndicators(): string[] {
    return Object.keys(this.indicators);
  }
}
