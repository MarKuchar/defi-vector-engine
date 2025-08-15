export class PriceHistory {
  private maxLength: number;
  private prices: number[] = [];

  constructor(maxLength = 200) {
    this.maxLength = maxLength;
  }

  add(price: number) {
    this.prices.push(price);
    if (this.prices.length > this.maxLength) {
      this.prices.shift();
    }
  }

  getMean() {
    const sum = this.prices.reduce((a, b) => a + b, 0);
    return this.prices.length > 0 ? sum / this.prices.length : 0;
  }

  getAll() {
    return this.prices;
  }

  getLastN(n: number): number[] {
    return this.prices.slice(-n);
  }

  get length() {
    return this.prices.length;
  }
}
