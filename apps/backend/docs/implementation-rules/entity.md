# Entity Rule

## Use When

Use this rule when adding or changing a domain object with stable identity and lifecycle behavior.

Use `value-object.md` when the concept is defined by its attributes instead of identity. Use `aggregate.md` when the entity is the root consistency boundary for a write model.

## Role

An Entity is a domain object defined primarily by a stable identity that persists throughout its lifecycle. While its attributes may change over time, the entity remains "the same" as long as its unique identifier remains constant.

Entities are responsible for business logic related to their own state and lifecycle transitions.

## Repo Convention

- Entities are domain-layer objects.
- Entities are context-specific, not universal models reused everywhere.
- Use `create()` for new instances.
- Use `reconstitute()` for restoring existing instances from persistence.
- `reconstitute()` does not apply creation-only rules, but it must not create an impossible or corrupted entity.
- Child entities inside aggregates are usually created by the Aggregate Root.
- Mappers convert persistence records into entities through `reconstitute()`.
- Entities are persistence-free, transport-free, and framework-free.

## Must Do

- Compare entities by ID.
- Establish immutable identity at creation or reconstitution.
- Keep required data valid from construction.
- Encapsulate state changes.
- Use expressive methods that name business actions, such as `reserveSeat()`, `cancel()`, or `arrive()`.
- Put entity-owned lifecycle behavior inside the entity.
- Use Value Objects for trivial validation so the entity can focus on identity and lifecycle logic.
- Keep entity logic focused on its own state.
- Return `Result` for expected recoverable business failures.

## Must Not Do

- Do not use empty constructors that allow invalid instances.
- Do not expose public setters for arbitrary mutation.
- Do not model simple CRUD or data-entry objects as entities by default.
- Do not create an anemic model with only getters and setters.
- Do not mirror database tables without domain behavior.
- Do not add ORM decorators, Prisma types, NestJS decorators, logging, or external service calls.
- Do not perform I/O from an entity.
- Do not orchestrate workflows from an entity.
- Do not coordinate logic requiring external data; use a Domain Service, Application Service, or Aggregate Root instead.

## Decision Guide

Create an Entity when:

- The concept has stable identity across time.
- The concept has lifecycle behavior or state transitions.
- Equality depends on identity, not matching attributes.
- The behavior belongs to this object's own state.

Use a Value Object instead when:

- The concept is defined by its attributes.
- Two instances with the same attributes are interchangeable.
- The concept has no lifecycle identity.

Avoid an Entity when:

- The use case is simple CRUD or data entry with no identity-based behavior.
- The object only contains getters and setters.
- The model is just a mirror of a database table.
- The object would carry unrelated data for many workflows.

Split entities by bounded context instead of creating one model to rule them all. A `Guest` entity in a Reservation context may have different behavior and data than a `Guest` entity in a Billing context.

## Minimal Shape

```typescript
import { err, ok, Result } from 'neverthrow';

import { BookingCannotBeCancelledError } from './errors/booking.errors';

interface BookingProps {
  tenantId: string;
  customerId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

export class BookingEntity {
  private constructor(
    public readonly id: string,
    private readonly props: BookingProps,
  ) {}

  static create(props: Omit<BookingProps, 'status'>): BookingEntity {
    return new BookingEntity(crypto.randomUUID(), {
      ...props,
      status: 'PENDING',
    });
  }

  static reconstitute(props: BookingProps & { id: string }): BookingEntity {
    if (!props.id) {
      throw new Error('Cannot reconstitute BookingEntity without id');
    }

    return new BookingEntity(props.id, {
      tenantId: props.tenantId,
      customerId: props.customerId,
      status: props.status,
    });
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get status(): BookingProps['status'] {
    return this.props.status;
  }

  cancel(): Result<void, BookingCannotBeCancelledError> {
    if (this.props.status === 'CANCELLED') {
      return err(new BookingCannotBeCancelledError(this.id));
    }

    this.props.status = 'CANCELLED';

    return ok(undefined);
  }

  equals(other: BookingEntity): boolean {
    return this.id === other.id;
  }
}
```

## Examples

### Correct: expressive business action

```typescript
shipment.completePickup(stopId);
```

### Wrong: data-centric mutation

```typescript
shipment.stops.find((stop) => stop.id === id).status = 'departed';
```

This bypasses rules and exposes internal state.

### Correct: context-specific entity

A `Member` entity in the `Chat` context only tracks `memberId` and `joinDate` to enforce a max-member rule.

### Wrong: one model to rule them all

A `Member` entity carries 50 fields including `bio`, `profilePicture`, and `encryptedPassword` into a simple chat-room logic boundary.

## Related Rules

- `aggregate.md`
- `value-object.md`
- `domain-service.md`
- `mapper.md`
- `repository.md`
- `domain-error.md`
- `application-service.md`
