import { IntegrationEvent } from './integration-event';

export interface IntegrationEventsCollector {
  collect(events: readonly IntegrationEvent[]): void;
  drain(): IntegrationEvent[];
}
