import { Candle } from "./Candle";
import { PriceHistory } from "./PriceHistory";

export class MarketHistory {
  closes = new PriceHistory(200);
  highs = new PriceHistory(200);
  lows = new PriceHistory(200);
  volumes = new PriceHistory(200);

  update(candle: Candle) {
    this.closes.add(candle.close);
    this.highs.add(candle.high);
    this.lows.add(candle.low);
    this.volumes.add(candle.volume);
  }

  getSnapshot() {
    return {
      closes: this.closes.getAll(),
      highs: this.highs.getAll(),
      lows: this.lows.getAll(),
      volumes: this.volumes.getAll(),
    };
  }
}
