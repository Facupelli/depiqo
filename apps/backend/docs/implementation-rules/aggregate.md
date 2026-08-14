# Aggregate Rule

## Use When

Use this rule when modeling a command-side consistency boundary that must enforce business invariants across a root, child entities, and Value Objects.

Use `entity.md` for identity/lifecycle behavior that is not a consistency boundary. Use `value-object.md` for attribute-defined concepts. Avoid aggregate ceremony for simple CRUD or data-entry flows.

## Role

An Aggregate is a consistency boundary for the write side of a domain model. It groups an Aggregate Root, optional child entities, and Value Objects so business invariants remain consistent during every state change.

An Aggregate is not a mere data container or a collection of related nouns. It is a tool for managing write-side consistency and domain complexity.

## Repo Convention

- Aggregates are optimized for writes, not queries.
- External code interacts through the Aggregate Root.
- An Aggregate Root can be a single entity; it does not need child entities unless the invariant requires them.
- Repositories load and save the aggregate as a single unit.
- Aggregate Roots create and own their child entities.
- Aggregate Roots may record Domain Events after meaningful state changes.
- Aggregates do not publish events directly.
- Domain Events are published after persistence through repository/unit-of-work infrastructure.
- Query Handlers normally bypass aggregates and read directly from Prisma.

## Must Do

- Model business rules and state changes, not database relationships.
- Start from workflows and behaviors the business cares about, such as `arrive()`, `pickup()`, or `reserve()`.
- Keep the Aggregate Root as the only mutation entry point.
- Use expressive methods that describe business intent.
- Enforce invariants atomically by the end of each state change and transaction.
- Keep aggregates small and focused on the rules they protect.
- Model threshold/count rules directly instead of loading large collections just to count them.
- Use Value Objects for trivial validation so the Aggregate Root can focus on complex invariants.
- Have the root create internal child entities when the root owns their identity and initial consistency.
- Return `Result` for expected recoverable business failures.
- Record Domain Events only after meaningful state changes.

## Must Not Do

- Do not expose child entities in a way that lets callers bypass root invariants.
- Do not use setter-style methods like `setStatus()` for business transitions.
- Do not model deep object graphs just because database relationships exist.
- Do not load huge collections for threshold, count, or capacity rules.
- Do not create pretend aggregates for simple CRUD or data-entry workflows.
- Do not use aggregates as read models.
- Do not let callers pre-build internal child entities when the root needs to own identity or invariants.
- Do not publish events directly from aggregates.
- Do not split the primary business workflow across Domain Event handlers.

## Decision Guide

Create an Aggregate when:

- A business invariant spans multiple objects and must be transactionally consistent.
- The root must control state changes for child entities or Value Objects.
- The use case has meaningful write-side behavior beyond assigning fields.
- The boundary can stay small enough to load and persist safely.

Avoid an Aggregate when:

- The use case is simple CRUD or data entry.
- Methods only assign fields without enforcing non-trivial business rules.
- A transaction script interacting directly with the database is simpler and clearer.
- The rule can tolerate staleness and is better enforced through an application-layer read model.
- The model is just a mirror of database relationships.

| Concept | Purpose |
| :--- | :--- |
| Entity | An object with stable identity and lifecycle behavior. Owns behavior for its own state. |
| Child Entity | An entity internal to an aggregate, managed and persisted through the root. |
| Aggregate Root | The primary entity that guards the consistency boundary and exposes all behavior. |
| Aggregate | The consistency boundary encompassing the root and its internal components. |

## Minimal Shape

```typescript
import { err, ok, Result } from 'neverthrow';

import { StopCompletedDomainEvent } from './events/stop-completed.domain-event';
import { StopCannotBeCompletedError } from './errors/shipment.errors';
import { StopEntity } from './stop.entity';

type ShipmentStatus = 'PLANNED' | 'IN_TRANSIT' | 'COMPLETED';

interface ShipmentProps {
  tenantId: string;
  status: ShipmentStatus;
  stops: StopEntity[];
}

export class ShipmentAggregate {
  private readonly domainEvents: unknown[] = [];

  private constructor(
    public readonly id: string,
    private readonly props: ShipmentProps,
  ) {}

  static create(props: { tenantId: string; firstStopAddress: string }): ShipmentAggregate {
    const shipment = new ShipmentAggregate(crypto.randomUUID(), {
      tenantId: props.tenantId,
      status: 'PLANNED',
      stops: [],
    });

    shipment.addStop(props.firstStopAddress);

    return shipment;
  }

  static reconstitute(props: ShipmentProps & { id: string }): ShipmentAggregate {
    if (!props.id) {
      throw new Error('Cannot reconstitute ShipmentAggregate without id');
    }

    return new ShipmentAggregate(props.id, {
      tenantId: props.tenantId,
      status: props.status,
      stops: props.stops,
    });
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get stops(): readonly StopEntity[] {
    return [...this.props.stops];
  }

  addStop(address: string): StopEntity {
    const stop = StopEntity.create({
      shipmentId: this.id,
      sequence: this.props.stops.length + 1,
      address,
    });

    this.props.stops.push(stop);

    return stop;
  }

  completeStop(stopId: string): Result<void, StopCannotBeCompletedError> {
    const stop = this.props.stops.find((candidate) => candidate.id === stopId);
    const previousStopsComplete = this.props.stops
      .filter((candidate) => candidate.sequence < stop.sequence)
      .every((candidate) => candidate.isComplete);

    if (!previousStopsComplete) {
      return err(new StopCannotBeCompletedError(this.id, stopId));
    }

    stop.complete();
    this.recordDomainEvent(new StopCompletedDomainEvent(this.id, this.tenantId, stopId));

    return ok(undefined);
  }

  private recordDomainEvent(event: unknown): void {
    this.domainEvents.push(event);
  }
}
```

This example shows the root controlling child creation and enforcing sequencing. Real event collection/publication should follow `domain-event.md` and the local unit-of-work pattern.

## Examples

### Correct: behavior-driven aggregate

A `Shipment` aggregate enforces the order of `Stops` such as Pickup → Arrived → Departed → Delivery. The root handles the sequencing rule.

### Wrong: data-centric aggregate

A `GroupChat` aggregate loads a collection of 100,000 `User` objects just to check if the chat is full.

### Correct: rule-driven aggregate

A `GroupChat` aggregate stores a simple `MemberCount` integer to enforce the capacity invariant efficiently.

### Wrong: useless ceremony

A `Product` aggregate has `setName()` and `setPrice()` methods that do nothing but assign values to properties.

## Related Rules

- `entity.md`
- `value-object.md`
- `domain-event.md`
- `repository.md`
- `mapper.md`
- `application-service.md`
- `domain-service.md`
- `query.md`
