import { IntegrationEvent } from './integration-event';
import { IntegrationEventsCollector } from './integration-events.collector';

export class InMemoryIntegrationEventsCollector implements IntegrationEventsCollector {
  private readonly events: IntegrationEvent[] = [];

  collect(events: readonly IntegrationEvent[]): void {
    this.events.push(...events);
  }

  drain(): IntegrationEvent[] {
    const drained = [...this.events];
    this.events.length = 0;
    return drained;
  }
}
