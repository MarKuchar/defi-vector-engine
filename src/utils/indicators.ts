export function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 0;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length - 1; i++) {
    const change = prices[i + 1] - prices[i];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change; // negative loss → positive value
    }
  }

  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}
