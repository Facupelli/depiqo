# Integration Event Rule

## Use When

Use this rule when a committed business fact must be visible outside the producing bounded context/module.

Use an Integration Event for completed facts that may be reacted to independently by:

- another bounded context/module
- a background worker
- notification, email, WhatsApp, or SMS flows
- external systems such as Docuseal or payment providers
- queues or message brokers
- webhooks
- future microservices
- any must-not-couple async side effect

Do not use an Integration Event as asynchronous request/response or command chaining when the initiating use case needs an authoritative answer or operation before it can complete. Use the owning module's synchronous public capability instead. See `apps/backend/docs/architecture/overview.md` for the canonical collaboration decision.

Use `domain-event.md` for private same-module domain facts.

## Role

An Integration Event is an immutable public record of a completed business fact that can be propagated outside the producing bounded context.

Integration Events are boundary contracts for independent reactions by other modules/bounded contexts, async workers, notification flows, external systems, queues, webhooks, or future microservices. They do not carry a request for another module to complete the producer's primary workflow.

Use this concept even in the current modular monolith. The physical transport can start simple, but the semantic boundary must be explicit.

## Repo Convention

- Integration Events live under `src/modules/<module>/public-api/events/<fact>.integration-event.ts`.
- Event class name: `<Fact>IntegrationEvent`.
- Use past-tense business facts and include `IntegrationEvent` in the class name.
- Export the event through the producing module's public surface.
- Consumers import Integration Events only from public module contracts.
- Include `eventId`, `schemaVersion`, `tenantId` when tenant-scoped, `occurredAt`, relevant aggregate/resource IDs, and minimal consumer-needed payload.
- Store only JSON-safe primitive payloads for outbox serialization.
- Prefer outbox-backed delivery when delivery must not be lost.

## Must Do

- Publish committed business facts, not technical implementation details.
- Publish only after the producing transaction has successfully committed.
- Keep payloads small, explicit, and stable.
- Version public contracts deliberately.
- Include `tenantId` when the fact is tenant-scoped.
- Make consumers idempotency-ready.
- Have consumers treat Integration Events as external input, even if they run in the same Nest process today.
- Have consumers use public APIs/facades if they need additional state.
- Use outbox-backed delivery for workers, external systems, notification channels, future service boundaries, and any must-not-lose flow.

## Must Not Do

- Do not expose private aggregate structure, internal entity graphs, Prisma records, or transport-specific objects.
- Do not include full domain entities in payloads.
- Do not include secrets, tokens, payment data, sensitive documents, large request bodies, or data copied only because it was convenient.
- Do not consume another module's private Domain Event.
- Do not import from another module's private `domain/events` path.
- Do not use Integration Events to hide the main workflow, as asynchronous request/response, or as command chaining when the initiating use case requires the result.
- Do not publish technical or persistence facts such as `RowInsertedIntegrationEvent` or `PrismaModelUpdatedIntegrationEvent`.
- Do not assume exactly-once delivery.
- Do not use an in-process event as durable integration messaging when losing the message is not acceptable.

## Decision Guide

Use this distinction even while the app is a modular monolith:

```text
Domain Event      = private/internal fact inside one bounded context.
Integration Event = public committed fact for another bounded context,
                    worker, external system, notification flow, or future service.
```

A module must not consume another module's private Domain Event. If another bounded context needs to react, the producing module publishes an Integration Event through its public contract.

A Domain Event may cause an Integration Event to be recorded after the domain transaction succeeds.

Good Integration Event names:

```text
RentalConfirmedIntegrationEvent
RentalCancelledIntegrationEvent
ContractSignedIntegrationEvent
SigningInvitationRequestedIntegrationEvent
AssetAvailableForRentalIntegrationEvent
CustomerCreatedIntegrationEvent
```

Avoid technical or persistence names:

```text
RowInsertedIntegrationEvent
PrismaModelUpdatedIntegrationEvent
SendEmailRequestedDomainEvent
```

`SigningInvitationRequestedIntegrationEvent` is acceptable when the committed public fact is specifically that a signing invitation has been requested from a signing/notification boundary.

## Runtime Flow

Recommended outbox flow:

```text
Application service starts transaction
  -> aggregate changes state and records Domain Event(s)
  -> repository persists aggregate
  -> integration event is recorded in outbox as part of the same transaction
Transaction commits
  -> outbox dispatcher publishes to in-process consumer, queue, worker, webhook, etc.
```

For early modular-monolith flows, in-process dispatch may be acceptable only when losing the message is operationally tolerable. If a consumer is a worker, external provider, notification channel, or future service boundary, prefer outbox-backed delivery.

Integration Events must not hide the main workflow.

Good:

```text
ConfirmRentalHandler commits rental confirmation
  -> RentalConfirmedIntegrationEvent is recorded after commit
  -> Notifications consumes it and sends email
```

Bad:

```text
ConfirmRentalHandler publishes event
  -> another module decides whether confirmation is allowed
  -> another handler changes rental state
```

## Minimal Shape

```typescript
import { randomUUID } from 'node:crypto';

export class RentalConfirmedIntegrationEvent {
  readonly eventId: string;
  readonly schemaVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
    public readonly customerId: string,
    occurredAt?: Date,
    eventId?: string,
  ) {
    this.eventId = eventId ?? randomUUID();
    this.occurredAt = occurredAt ?? new Date();
  }
}
```

For outbox serialization, store only JSON-safe primitive payloads.

## Examples

### Asset Inventory boundary example

An event produced by `asset-inventory` and consumed by `rental-commitment` is not a private Domain Event for `rental-commitment`.

If `rental-commitment` reacts to a new rentable asset, model the public fact explicitly:

```text
AssetAvailableForRentalIntegrationEvent
```

This is usually better than:

```text
AssetCreatedIntegrationEvent
```

because the consuming context likely does not care that an asset row was created. It cares that an asset is available to satisfy rental demand.

### Notification boundary example

Inside `rental-commitment`, this can be a private Domain Event:

```text
RentalOrderCreatedDomainEvent
```

But a `notifications` module should not consume that private event directly.

Clean flow:

```text
CreateRentalOrderCommandHandler
  -> creates rental order
  -> Rental aggregate records RentalOrderCreatedDomainEvent
  -> application persists rental order
  -> integration event is recorded after/with commit
  -> RentalOrderCreatedIntegrationEvent is dispatched
  -> Notifications consumes Integration Event and sends email
```

The rental domain does not know email exists. The notifications module does not depend on rental's private domain event class.

### Correct: public fact with minimal payload

```typescript
export class ContractSignedIntegrationEvent {
  readonly eventId: string;
  readonly schemaVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly tenantId: string,
    public readonly contractId: string,
    public readonly rentalId: string,
    public readonly signedByActorId: string,
    occurredAt?: Date,
    eventId?: string,
  ) {
    this.eventId = eventId ?? randomUUID();
    this.occurredAt = occurredAt ?? new Date();
  }
}
```

### Wrong: leaks private aggregate structure

```typescript
export class RentalConfirmedIntegrationEvent {
  constructor(public readonly rental: RentalAggregate) {}
}
```

### Wrong: consumer imports private domain event from another module

```typescript
import { RentalConfirmedDomainEvent } from 'src/modules/rental-commitment/domain/events/rental-confirmed.domain-event';
```

### Correct: consumer imports public integration event

```typescript
import { RentalConfirmedIntegrationEvent } from 'src/modules/rental-commitment/public-api/events/rental-confirmed.integration-event';
```

## Related Rules

- `domain-event.md`
- `application-service.md`
- `aggregate.md`
- `repository.md`
- `controller.md`
- `error-handling-problem-details.md`
