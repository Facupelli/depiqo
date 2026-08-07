import { Module } from '@nestjs/common';

import { EventEmitterIntegrationEventPublisher } from './event-emitter-integration-event.publisher';
import { IntegrationEventPublisher } from './integration-event.publisher';

@Module({
  providers: [
    EventEmitterIntegrationEventPublisher,
    {
      provide: IntegrationEventPublisher,
      useExisting: EventEmitterIntegrationEventPublisher,
    },
  ],
  exports: [IntegrationEventPublisher],
})
export class IntegrationEventsModule {}
