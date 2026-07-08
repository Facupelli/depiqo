# Domain Service Rule

## Use When

Use this rule when business logic does not naturally belong to a single Entity or Aggregate, especially when it spans multiple aggregate roots or compares domain objects loaded by the application layer.

Use `application-service.md` for orchestration, I/O, transactions, persistence, and external API coordination.

## Role

A Domain Service encapsulates pure business logic that does not naturally belong to one Entity or Aggregate. It is used to coordinate logic across aggregate boundaries, compare multiple aggregate roots, or handle operations that would otherwise force an entity to know about concepts outside its scope.

A Domain Service contains the domain "why" and "how" of a cross-root business rule. It knows nothing about database tables, APIs, transports, or external frameworks.

## Repo Convention

- Domain Services live in the domain layer.
- Domain Services are pure domain constructs.
- Domain Services are stateless.
- Domain Services receive all data through method parameters.
- Application Services load data and pass domain objects into Domain Services.
- Domain Services return calculated values or `Result` values.
- `@Injectable()` is optional only when nearby NestJS wiring benefits from it.
- Direct instantiation is acceptable when simpler.

## Decision Guide

Create a Domain Service when:

- A business rule requires comparing two or more aggregate roots.
- A business rule coordinates multiple domain objects but does not belong to one root's consistency boundary.
- A calculation uses data from multiple domain concepts and should not live on a single entity.
- You need to transform or coordinate domain concepts between bounded contexts or split domain models.

Do not create a Domain Service when:

- The behavior belongs naturally inside an Aggregate Root or Entity.
- The service would only call one method on one entity.
- The service is only a pass-through wrapper.
- The service is used to strip behavior out of entities.
- The logic needs infrastructure access.

### Domain Service vs. Application Service

| Feature | Domain Service | Application Service |
| :--- | :--- | :--- |
| Responsibility | Complex business logic spanning roots or domain concepts. | Orchestration, I/O, transactions, and persistence. |
| State | Stateless. | Stateless, usually. |
| Dependencies | Pure domain objects, entities, and Value Objects. | Repositories, public module APIs, buses, external APIs, Prisma when needed. |
| Database | Never interacts with the database. | Loads and saves aggregates or records. |

## Must Do

- Keep Domain Services stateless.
- Keep Domain Services infrastructure-free.
- Pass all inputs explicitly as method parameters.
- Return results to the caller.
- Return `Result` for recoverable business failures.
- Return direct calculated values for pure successful calculations.
- Let Application Services handle loading, persistence, transactions, and external APIs.
- Keep Domain Services testable without NestJS.

## Must Not Do

- Do not hold mutable instance state.
- Do not inject or call Prisma, repositories, event emitters, queues, HTTP clients, or framework utilities.
- Do not save data.
- Do not orchestrate application workflows.
- Do not make Domain Services CQRS handlers.
- Do not use Domain Services as an anemic-domain escape hatch.
- Do not move aggregate-owned rules out of aggregates.
- Do not add `@Injectable()` purely for convention when direct construction is simpler.

## Minimal Shape

```typescript
import { err, ok, Result } from 'neverthrow';

import { BookingEntity } from './booking.entity';
import { BookingPeriod } from './booking-period.value-object';
import { EquipmentUnavailableError } from './errors/booking.errors';

export class BookingAvailabilityService {
  checkAvailability(
    period: BookingPeriod,
    existingBookings: BookingEntity[],
  ): Result<void, EquipmentUnavailableError> {
    const hasConflict = existingBookings.some((booking) => booking.period.overlaps(period));

    if (hasConflict) {
      return err(new EquipmentUnavailableError());
    }

    return ok(undefined);
  }
}
```

The Application Service loads `existingBookings`, calls the Domain Service, maps expected failures when needed, and persists any changes.

## Examples

### Correct: cross-root coordination

A `BookingAvailabilityService` checks a `Guest`'s history and a `Dinner`'s current capacity to decide if a reservation is allowed.

### Wrong: anemic entity behavior moved into a service

A `ShipmentService` has a `completePickup(shipment)` method that only assigns `shipment.status = 'departed'`.

This logic belongs inside the `Shipment` aggregate.

### Correct: pure domain calculation

A `PricingService` takes a `Product` and a `DiscountCode` Value Object and returns a new `Price` Value Object.

### Wrong: infrastructure leak

A Domain Service uses `PrismaClient` to check if a user exists before performing a calculation.

The Application Service should load the required data and pass domain objects or values into the Domain Service.

## Related Rules

- `application-service.md`
- `aggregate.md`
- `entity.md`
- `value-object.md`
- `domain-error.md`
- `repository.md`
