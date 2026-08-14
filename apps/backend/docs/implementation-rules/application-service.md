# Application Service / Command Handler Rule

## Use When

Use this rule when adding or changing a command-side use case handler/application service.

Use `query.md` for read-only Query Handlers.

## Role

An Application Service orchestrates one command-side use case. It loads aggregates, calls domain logic/services, coordinates public module APIs when needed, persists changes, and returns an outcome.

It does not contain business rules. Its job is workflow orchestration.

For HTTP-facing error flow, follow `error-handling-problem-details.md`.

## Repo Convention

- Command-side use cases are usually implemented as NestJS `@CommandHandler`s.
- Handlers implement `ICommandHandler<TCommand, TResult>`.
- `execute()` returns `Promise<Result<T, FeatureError>>` for expected HTTP-facing failures.
- `execute()` may return `Promise<T>` when there is no meaningful recoverable failure.
- Application Services orchestrate `load -> act -> persist -> return`.
- Application Services own transaction boundaries.
- Use the project unit-of-work abstraction when event collection/publication is involved.
- Repositories or surrounding infrastructure handle aggregate persistence and Domain Event dispatch timing.
- Provider-owned synchronous public capabilities, Integration Events, or consumer-owned projections are the only boundaries for cross-module collaboration. Choose according to `docs/architecture/overview.md`.
- Private same-module application helper/orchestration services are allowed when they keep a workflow readable and are not exposed as independent use cases.
- Inject `PrismaService` directly for command-supporting reads such as existence, uniqueness, impact, affected-ID, count, or projection queries when the current module owns the accessed models (see `repository.md` for the repository-vs-direct-Prisma distinction).
- Use repositories only to load aggregates/entities for behavior and persist them (see `repository.md`).

## Must Do

- Keep the service readable as a workflow: `load -> act -> persist -> return`.
- Load aggregates through repositories.
- Put aggregate-specific rules in entities, aggregates, and Value Objects.
- Put rules spanning multiple aggregates in Domain Services.
- Use another module's provider-owned, cohesive synchronous public capability when this use case needs its authoritative answer or operation before it can complete. A CQRS command or query is valid across modules only when deliberately published as that capability.
- Return `err(featureError(...))` for expected failures.
- Return `Result<T, FeatureError>` for expected HTTP-facing failures.
- Map known domain errors into feature/application errors before returning from HTTP-facing use cases.
- Map known public dependency errors into feature/application errors before returning from HTTP-facing use cases.
- Preserve original domain/dependency errors as `cause`.
- Include safe context where useful.
- Let infrastructure exceptions, programmer mistakes, and unknown failures propagate.
- Use `prisma.$transaction()` or the project unit-of-work abstraction when multiple writes must succeed or fail together.
- Keep transaction boundaries in the Application Service, even when repositories perform the actual persistence work inside that transaction.
- Pass the active transaction client to normal repository methods (see `repository.md` for the canonical transaction pattern).
- Verify model ownership before every direct Prisma call (see `docs/architecture/overview.md` for cross-module access rules).

## Must Not Do

- Do not put business rules in Application Services.
- Do not put HTTP or presentation decisions here.
- Do not throw Nest HTTP exceptions from Application Services.
- Do not inject CQRS handlers into other CQRS handlers.
- Do not import private internals from another module.
- Do not query or mutate another module's owned Prisma models, including from a transaction callback (see `docs/architecture/overview.md`).
- Do not add repository methods for read models or supporting reads that do not reconstitute an aggregate/entity for behavior (see `repository.md`).
- Do not create repository method variants with transaction suffixes (see `repository.md` for the canonical transaction pattern).
- Do not return raw Prisma records.
- Do not create a generic `UnexpectedError` result just to avoid throwing.
- Do not wrap unknown infrastructure failures as expected errors.
- Do not pretend an unrecognized dependency/domain error is an expected application outcome.
- Do not split the core workflow across event handlers.
- Do not dispatch Domain Events manually unless nearby infrastructure explicitly uses that pattern.

## Minimal Shape

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { CreateBookingCommand } from './create-booking.command';
import { CreateBookingError, createBookingError } from './create-booking.errors';
import { BookingEntity } from '../../domain/booking.entity';
import { EquipmentUnavailableError } from '../../domain/errors/booking.errors';
import { BookingAvailabilityService } from '../../domain/booking-availability.service';
import { BookingRepository } from '../../infrastructure/booking.repository';

type CreateBookingResult = Result<{ id: string }, CreateBookingError>;

@CommandHandler(CreateBookingCommand)
export class CreateBookingService implements ICommandHandler<CreateBookingCommand, CreateBookingResult> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingRepository: BookingRepository,
    private readonly bookingAvailability: BookingAvailabilityService,
  ) {}

  async execute(command: CreateBookingCommand): Promise<CreateBookingResult> {
    const context = {
      useCase: 'CreateBooking',
      tenantId: command.tenantId,
      equipmentId: command.equipmentId,
      customerId: command.customerId,
    };

    // Booking is owned by this module. This supporting read does not load an
    // aggregate for behavior, so it belongs directly in Prisma, not a repository.
    const occupiedPeriods = await this.prisma.booking.findMany({
      where: {
        tenantId: command.tenantId,
        equipmentId: command.equipmentId,
        status: { not: 'CANCELLED' },
      },
      select: { periodStart: true, periodEnd: true },
    });

    const availabilityResult = this.bookingAvailability.checkAvailability(command.period, occupiedPeriods);
    if (availabilityResult.isErr()) {
      return err(this.mapAvailabilityError(availabilityResult.error, context));
    }

    const booking = BookingEntity.create({
      tenantId: command.tenantId,
      equipmentId: command.equipmentId,
      customerId: command.customerId,
      period: command.period,
    });

    await this.bookingRepository.save(booking);

    return ok({ id: booking.id });
  }

  private mapAvailabilityError(
    error: EquipmentUnavailableError,
    context: Record<string, unknown>,
  ): CreateBookingError {
    return createBookingError('booking.equipment_unavailable', error.message, error, context);
  }
}
```

## Examples

### Correct: domain rule enforced inside entity/service, application service coordinates

```typescript
const availabilityResult = this.bookingAvailability.checkAvailability(command.period, occupiedPeriods);
if (availabilityResult.isErr()) {
  return err(this.mapAvailabilityError(availabilityResult.error, context));
}
```

### Wrong: domain rule implemented inside the application service

```typescript
if (booking.status !== 'PENDING') {
  return err(createBookingError('booking.cannot_confirm', 'Booking cannot be confirmed.'));
}

booking.props.status = 'CONFIRMED';
```

### Correct: expected failure returned as Result

```typescript
return err(createBookingError('booking.equipment_unavailable', error.message, error, context));
```

### Wrong: throwing an HTTP exception from the service

```typescript
throw new ConflictException('Equipment not available');
```

### Correct: unknown infrastructure failures propagate

```typescript
await this.bookingRepository.save(booking);
```

If the database is unavailable, let the exception bubble to `ProblemDetailsFilter`.

### Wrong: wrapping unknown failures as expected errors

```typescript
try {
  await this.bookingRepository.save(booking);
} catch (error) {
  return err(createBookingError('booking.save_failed', 'Booking could not be saved.', error, context));
}
```

### Correct: wrapping multi-record writes in a transaction

```typescript
await this.prisma.$transaction(async (tx) => {
  const duplicate = await tx.booking.findFirst({
    where: { tenantId: booking.tenantId, externalReference: booking.externalReference },
    select: { id: true },
  });

  if (duplicate) return;

  await this.bookingRepository.save(booking, tx);
  await tx.bookingAuditEntry.create({ data: { bookingId: booking.id, action: 'CREATED' } });
});
```

The direct Prisma calls above are valid only if the current module owns both models (see `docs/architecture/overview.md` for cross-module access rules). For the canonical transaction and repository pattern, see `repository.md`.

## Canonical Example

For a current implemented `Result<T, FeatureError>` flow, use:

```text
apps/backend/src/modules/pricing/features/calculate-cart-price/calculate-cart-price.handler.ts
apps/backend/src/modules/pricing/features/calculate-cart-price/calculate-cart-price.errors.ts
```

## Related Rules

- `command.md`
- `controller.md`
- `repository.md`
- `aggregate.md`
- `entity.md`
- `value-object.md`
- `domain-service.md`
- `domain-error.md`
- `domain-event.md`
- `integration-event.md`
- `error-handling-problem-details.md`
