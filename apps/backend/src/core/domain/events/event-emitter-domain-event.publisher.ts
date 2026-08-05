import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LogContext } from 'src/core/logger/log-context';

import { DomainEvent } from './domain-event';
import { DomainEventPublisher } from './domain-event.publisher';

@Injectable()
export class EventEmitterDomainEventPublisher extends DomainEventPublisher {
  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.eventEmitter.emitAsync(event.eventName, event);
        LogContext.increment('domainEventsPublished');

        const existingNames = LogContext.get('domainEventNames');
        const domainEventNames = Array.isArray(existingNames) ? existingNames : [];
        LogContext.set('domainEventNames', [...domainEventNames, event.eventName]);
      } catch (error) {
        LogContext.increment('domainEventPublishFailures');

        throw error;
      }
    }
  }
}
