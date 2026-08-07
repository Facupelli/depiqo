import { IntegrationEvent } from './integration-event';

export abstract class IntegrationEventPublisher {
  abstract publish(events: readonly IntegrationEvent[]): Promise<void>;
}
