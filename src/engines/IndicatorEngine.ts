import { BollingerBands } from '../indicators/BollingerBands';
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

  getValues(): Record<string, number | null> {
    const snapshot: Record<string, number | null> = {};
    for (const name in this.indicators) {
      snapshot[name] = this.indicators[name].getValue();
    }
    return snapshot;
  }

  getValuesDetailed(): Record<string, any> {
    const bbIndicator = this.indicators['BollingerBands'];
    let upper;
    let lower;
    if (bbIndicator && 'getUpperBand' in bbIndicator) {
      upper = (bbIndicator as BollingerBands).getUpperBand();
      lower = (bbIndicator as BollingerBands).getLowerBand();
    }

    return {
      rsi: {
        value: this.indicators['RSI']?.getValue(),
        overbought: (this.indicators['RSI']?.getValue() ?? 0) > 70,
        oversold: (this.indicators['RSI']?.getValue() ?? 0) < 30,
      },
      ema: {
        short: this.indicators['EMA_12']?.getValue(),
        long: this.indicators['EMA_26']?.getValue(),
        crossover: (this.indicators['EMA_12']?.getValue() ?? 0) > (this.indicators['EMA_26']?.getValue() ?? 0),
      },
      bb: {
        upper: upper,
        middle: this.indicators['BollingerBands']?.getValue(),
        lower: lower,
      },
      // Add other indicators here as needed
    };
  }

  reset(): void {
    Object.values(this.indicators).forEach(indicator => indicator.reset());
  }

  listIndicators(): string[] {
    return Object.keys(this.indicators);
  }
}
