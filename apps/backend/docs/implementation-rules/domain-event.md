# Domain Event and Event Handler Rule

## Use When

Use this rule when adding or changing an internal same-module domain fact or a handler reacting to one after a domain state change.

Use `integration-event.md` when the fact crosses a module/bounded-context boundary, async worker, notification flow, external system, queue, webhook, or future service boundary.

## Role

A Domain Event is an immutable record that a meaningful business fact happened inside one bounded context/module.

A Domain Event Handler reacts to that fact inside the same module after the original state change has been persisted. Handlers are for consequences such as local audit records, timeline entries, internal projections, or local policies. They are not the primary workflow.

Domain Events are internal domain facts. They are private by default, not generic pub/sub messages, not transport contracts, and not a way to hide the main business workflow.

## Repo Convention

- Domain Events are private to their module by default.
- Private Domain Events live under `src/modules/<module>/domain/events/<fact>.domain-event.ts`.
- Event class name: `<Fact>DomainEvent`.
- Handler file: `<reaction>-when-<fact>.event-handler.ts`.
- Handler class name: `<Reaction>When<Fact>EventHandler`.
- Aggregate Roots record Domain Events after meaningful state changes.
- Aggregates do not publish Domain Events directly.
- Domain Events are published only after successful persistence.
- `PrismaUnitOfWork` is the standard publication path for collected Domain Events on the command side.
- Same-module handlers use `@OnEvent(...)`.
- If a fact must cross a module boundary, translate it into an Integration Event exposed through the producing module's public contract.

## Must Do

- Use plain immutable classes with `readonly` properties.
- Name events as past-tense business facts, such as `RentalConfirmedDomainEvent`.
- Describe meaningful business facts, not technical persistence actions.
- Carry IDs and simple values, not full entities, aggregates, or Prisma records.
- Include `tenantId` when the concept is tenant-scoped.
- Prefer outbox-ready metadata: `eventId`, `eventName`, `aggregateId`, `aggregateType`, and `occurredAt`.
- Include the fields required by `src/core/domain/events/domain-event` when implementing the project `DomainEvent` interface.
- Record events after the aggregate state change succeeds.
- Publish events only after successful persistence.
- Keep the primary business transaction explicit in the Application Service/orchestrator.
- Keep handlers inside the same bounded context/module.
- Use one handler per reaction.
- Make handlers resilient and idempotency-ready.
- Catch and log operational handler failures.

## Must Not Do

- Do not use Domain Events as cross-module contracts.
- Do not import another module's private Domain Event classes from `domain/events` or other private folders.
- Do not use events to hide the main workflow of a use case.
- Do not use events for steps that must happen inside the same transaction for correctness.
- Do not publish events directly from aggregates.
- Do not manually publish Domain Events from Application Services unless a nearby established infrastructure pattern explicitly requires it.
- Do not put full entities, aggregates, Prisma records, or transport objects in event payloads.
- Do not use Domain Events for durable external delivery.
- Do not treat in-process dispatch as durable or exactly-once.
- Do not use technical names such as `RowInserted`, `PrismaModelUpdated`, or `AssetTableChanged`.
- Do not model technical requests such as `SendEmailRequested` as Domain Events.

## Runtime Flow

Application services/orchestrators own the primary business transaction.

Preferred flow:

```text
Command/Application Service
  -> validate
  -> load aggregates
  -> call domain behavior
  -> aggregate records Domain Event after state change
  -> persist transaction
  -> collect Domain Events
  -> publish same-module consequences after commit
```

Avoid this flow:

```text
Command -> Event -> Event -> Event -> state transition
```

Summary:

```text
The command handler decides the core business transaction.
Domain Events describe internal domain facts.
Integration Events publish committed facts across boundaries.
Event handlers handle consequences, not the main workflow.
```

Failure semantics:

- If persistence fails, no Domain Event is published.
- If publish fails after commit, the original state change remains committed.
- If a handler fails, the original write remains committed.
- Handler failures are operational failures and must be logged.
- In-process Domain Events are non-durable in this default pattern.

## Minimal Shape

### Event object

```typescript
import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

export class RentalConfirmedDomainEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventName = RentalConfirmedDomainEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'Rental';
  readonly occurredAt: Date;

  constructor(
    public readonly rentalId: string,
    public readonly tenantId: string,
    public readonly customerId: string,
    occurredAt?: Date,
    eventId?: string,
  ) {
    this.eventId = eventId ?? randomUUID();
    this.aggregateId = rentalId;
    this.occurredAt = occurredAt ?? new Date();
  }
}
```

### Event handler

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { RentalConfirmedDomainEvent } from '../../domain/events/rental-confirmed.domain-event';

@Injectable()
export class CreateTimelineEntryWhenRentalConfirmedEventHandler {
  private readonly logger = new Logger(CreateTimelineEntryWhenRentalConfirmedEventHandler.name);

  @OnEvent(RentalConfirmedDomainEvent.name)
  async handle(event: RentalConfirmedDomainEvent): Promise<void> {
    try {
      // Coordinate same-module consequence only.
      // Do not hide the ConfirmRental workflow here.
    } catch (error) {
      this.logger.error(`Failed to handle RentalConfirmedDomainEvent for ${event.rentalId}`, error);
    }
  }
}
```

### Publication flow

```typescript
await this.unitOfWork.runInTransaction(async ({ tx, events }) => {
  const rental = await this.rentalRepository.load(command.rentalId, command.tenantId, tx);

  rental.confirm();

  await this.rentalRepository.save(rental, tx);
  events.collectFrom(rental);
});
```

The transaction commits first. The collected Domain Events are published only after that commit succeeds.

## Examples

### Correct: aggregate records event after state change

```typescript
confirm(): Result<void, RentalError> {
  if (this.props.status !== 'PENDING') {
    return err(new RentalCannotBeConfirmedError(this.id));
  }

  this.props.status = 'CONFIRMED';
  this.recordDomainEvent(new RentalConfirmedDomainEvent(this.id, this.tenantId, this.customerId));

  return ok(undefined);
}
```

### Correct: same-module handler handles a consequence

```typescript
@OnEvent(RentalConfirmedDomainEvent.name)
async handle(event: RentalConfirmedDomainEvent): Promise<void> {
  await this.timelineWriter.recordRentalConfirmed(event.tenantId, event.rentalId, event.occurredAt);
}
```

### Wrong: cross-module import from private domain path

```typescript
import { RentalConfirmedDomainEvent } from 'src/modules/rental-commitment/domain/events/rental-confirmed.domain-event';
```

Use `RentalConfirmedIntegrationEvent` from the producing module's public contract instead.

### Wrong: manual publish from an application service

```typescript
rental.confirm();
await this.rentalRepository.save(rental);
this.eventEmitter.emit(RentalConfirmedDomainEvent.name, new RentalConfirmedDomainEvent(...));
```

### Wrong: event hides primary workflow

```text
ConfirmRentalCommand
  -> RentalConfirmedDomainEvent
  -> CreateContractHandler
  -> ContractCreatedDomainEvent
  -> PrepareSigningHandler
  -> SigningPreparedDomainEvent
  -> SendInvitationHandler
```

Use an explicit application service/orchestrator for this workflow.

## Related Rules

- `integration-event.md`
- `aggregate.md`
- `application-service.md`
- `repository.md`
- `domain-error.md`
- `error-handling-problem-details.md`
