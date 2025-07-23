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

  getAll() {
    return this.prices;
  }
}
