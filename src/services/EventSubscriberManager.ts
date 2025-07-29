import { 
  DriftClient, 
  EventSubscriber, 
  EventType,
  OrderActionRecord,
  LiquidationRecord,
  FundingPaymentRecord
} from '@drift-labs/sdk';
import { EventEmitter } from 'events';

export class EventSubscriberManager extends EventEmitter {
  private eventSubscriber!: EventSubscriber;

  constructor(private driftClient: DriftClient) {
    super();
  }

  async start() {
    if (this.eventSubscriber) {
      await this.eventSubscriber.unsubscribe();
    }

    this.eventSubscriber = new EventSubscriber(
      this.driftClient.connection,
      this.driftClient.program,
      {
        eventTypes: [
          'OrderActionRecord',
          'LiquidationRecord',
          'FundingPaymentRecord'
        ] as EventType[],
        logProviderConfig: { type: 'websocket' },
      }
    );

    await this.eventSubscriber.subscribe();

    const emitter = this.eventSubscriber.eventEmitter as unknown as EventEmitter;
    
    emitter.on('OrderActionRecord', (record: OrderActionRecord) => {
      const safeRecord = {
        timestamp: record.ts.toNumber(),
        action: record.action,
        marketIndex: record.marketIndex,
        filler: record.filler?.toString(),
        taker: record.taker?.toString(),
        baseAmount: record.baseAssetAmountFilled?.toString(),
        quoteAmount: record.quoteAssetAmountFilled?.toString()
      };
      this.emit('orderAction', safeRecord);
    });

    emitter.on('LiquidationRecord', (record: LiquidationRecord) => {
      const safeRecord = {
        timestamp: record.ts.toNumber(),
        liquidatee: record.user.toString(),
        liquidator: record.liquidator.toString(),
        marketIndex: record.liquidatePerp?.marketIndex,
        bankrupt: record.bankrupt
      };
      this.emit('liquidation', safeRecord);
    });

    emitter.on('FundingPaymentRecord', (record: FundingPaymentRecord) => {
      const safeRecord = {
        timestamp: record.ts.toNumber(),
        marketIndex: record.marketIndex,
        payment: record.fundingPayment.toString(),
        user: record.user.toString()
      };
      this.emit('fundingPayment', safeRecord);
    });

    emitter.on('error', (err: Error) => {
      this.emit('error', err);
    });
  }

  async stop() {
    if (this.eventSubscriber) {
      await this.eventSubscriber.unsubscribe();
    }
  }
}