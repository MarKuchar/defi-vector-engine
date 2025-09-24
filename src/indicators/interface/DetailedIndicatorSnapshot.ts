export interface RSIIndicator {
  value: number | null;
  overbought: boolean;
  oversold: boolean;
}

export interface EMAIndicator {
  short: number | null;
  long: number | null;
  crossover: boolean;
}

export interface BBIndicator {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export interface DetailedIndicatorSnapshot {
  RSI?: RSIIndicator;
  EMA?: EMAIndicator;
  BB?: BBIndicator;
  SMA?: {
    type: string;
    period: number;
    currentValue: number | null;
  };
  // add other indicators as needed
}
