import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LogContext } from 'src/core/logger/log-context';

import { IntegrationEvent } from './integration-event';
import { IntegrationEventPublisher } from './integration-event.publisher';

@Injectable()
export class EventEmitterIntegrationEventPublisher extends IntegrationEventPublisher {
  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  async publish(events: readonly IntegrationEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.eventEmitter.emitAsync(event.eventName, event);
        LogContext.increment('integrationEventsPublished');

        const existingNames = LogContext.get('integrationEventNames');
        const integrationEventNames = Array.isArray(existingNames) ? existingNames : [];
        LogContext.set('integrationEventNames', [...integrationEventNames, event.eventName]);
      } catch (error) {
        LogContext.increment('integrationEventPublishFailures');

        throw error;
      }
    }
  }
}
