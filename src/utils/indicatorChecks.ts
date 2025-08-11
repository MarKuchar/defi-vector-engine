export function isOversold(rsi: number, threshold = 30): boolean {
  return rsi < threshold;
}

export function isBelowMA(price: number, sma: number, threshold = 1): boolean {
  return price < sma * threshold;
}

export function emaCrossed(fastEMA: number, slowEMA: number): 'bullish' | 'bearish' | null {
  if (fastEMA > slowEMA) {
    return 'bullish';
  }

  if (fastEMA < slowEMA) {
    return 'bearish';
  }
  return null;
}

export function bollingerTouch(price: number, upper: number, lower: number) {
  if (price > upper) {
    return 'upper';
  }
  if (price < lower) {
    return 'lower';
  }
  return null;
}
