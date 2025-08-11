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
  rsi?: RSIIndicator;
  ema?: EMAIndicator;
  bb?: BBIndicator;
  SMA_50?: number | null;
  // add other indicators as needed
}
