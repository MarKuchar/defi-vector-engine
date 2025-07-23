import { DriftClient, EventSubscriber, EventType } from '@drift-labs/sdk';
import EventEmitter from 'events';

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
        eventTypes: ['OrderRecord', 'OrderActionRecord', 'SettlePnlRecord'] as EventType[],
        logProviderConfig: { type: 'websocket' },
      }
    );

    await this.eventSubscriber.subscribe();

    this.eventSubscriber.eventEmitter.on('newEvent', (event) => {
      if (event.eventType) {
        this.emit(event.eventType, event);
      }
    });

    (this.eventSubscriber.eventEmitter as EventEmitter).on('error', (err) => {
      this.emit('error', err);
    });
  }

  async stop() {
    if (this.eventSubscriber) {
      await this.eventSubscriber.unsubscribe();
    }
  }
}
