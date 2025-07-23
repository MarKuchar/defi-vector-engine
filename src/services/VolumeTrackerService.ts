import EventEmitter from 'events';

export interface VolumeUpdate {
  volume24h: number;
  timestamp: number;
}

export class VolumeTrackerService extends EventEmitter {
  private rollingVolume = 0;
  private tradeHistory: { timestamp: number; amount: number }[] = [];
  private cleanupInterval!: NodeJS.Timeout;

  constructor() {
    super();
    this.setupCleanup();
  }

  public addTrade(amount: number) {
    const now = Date.now();
    this.tradeHistory.push({ timestamp: now, amount });
    this.rollingVolume += amount;

    this.emit('volumeUpdate', {
      volume24h: this.rollingVolume,
      timestamp: now,
    });
  }

  private setupCleanup() {
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      // Remove old trades and adjust rollingVolume
      let volumeRemoved = 0;
      this.tradeHistory = this.tradeHistory.filter((trade) => {
        if (trade.timestamp < cutoff) {
          volumeRemoved += trade.amount;
          return false;
        }
        return true;
      });
      if (volumeRemoved > 0) {
        this.rollingVolume -= volumeRemoved;
        this.emit('volumeUpdate', {
          volume24h: this.rollingVolume,
          timestamp: Date.now(),
        });
      }
    }, 5 * 60 * 1000); // every 5 minutes
  }

  public close() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
