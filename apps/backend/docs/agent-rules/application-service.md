# Application Service / Command Handler

## Role

An Application Service orchestrates one command-side use case. It loads aggregates, calls domain logic/services, coordinates public module APIs when needed, persists changes, and returns an outcome.

It does not contain business rules. Its job is workflow orchestration.

For HTTP-facing error flow, follow `error-handling-problem-details.md`.

---

## Rules

### Orchestration only

- Keep the service readable as a workflow: load -> act -> persist -> return.
- Put aggregate-specific rules in entities/value objects.
- Put rules spanning multiple aggregates in Domain Services.
- Do not put HTTP or presentation decisions here.

### Dependencies

- Inject repositories for aggregate persistence.
- Inject Domain Services for domain calculations/policies.
- Inject `PrismaService` directly only when the command-side use case genuinely needs direct persistence access beyond repository responsibilities.
- Do not inject other Application Services.
- Do not import private internals from another module. Use that module's public API/facade or the CQRS bus.

### Commands and return values

- The service is usually the NestJS `@CommandHandler` for its command.
- It implements `ICommandHandler<TCommand, TResult>`.
- `execute()` returns `Promise<Result<T, FeatureError>>` for expected failures.
- `execute()` may return `Promise<T>` when there is no meaningful recoverable failure.
- Do not return raw Prisma records.

### Error handling

Expected failures return `err(error)`.

For HTTP-facing use cases:

- Define feature/application errors in `<feature>.errors.ts`.
- Return `Result<T, FeatureError>` for expected failures.
- Map known domain errors into feature/application errors before returning.
- Map known public dependency errors into feature/application errors before returning.
- Preserve original domain/dependency errors as `cause`.
- Include safe context where useful.
- Let infrastructure exceptions and unknown failures propagate.
- Do not throw Nest HTTP exceptions here.
- Do not create a generic `UnexpectedError` result just to avoid throwing.

Domain errors are still valid inside domain entities/services. The application service decides whether to propagate them directly for internal callers or translate them into feature/application errors for HTTP-facing use cases.

### Domain Events

- Domain Events recorded on aggregates are dispatched after persistence succeeds.
- Do not dispatch events manually from the Application Service unless nearby infrastructure explicitly uses that pattern.
- Repositories or surrounding infrastructure are responsible for dispatching recorded events after a successful write.

### Transactions

- When a use case modifies multiple records that must succeed or fail together, use `prisma.$transaction()`.
- Keep transaction boundaries in the Application Service, even when repositories perform the actual persistence work inside that transaction.

---

## Structure

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

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

    const existingBookings = await this.bookingRepository.findActiveForEquipment(
      command.tenantId,
      command.equipmentId,
    );

    const availabilityResult = this.bookingAvailability.checkAvailability(command.period, existingBookings);
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

---

## Examples

### Correct: domain rule enforced inside entity/service, application service coordinates

```typescript
const availabilityResult = this.bookingAvailability.checkAvailability(command.period, existingBookings);
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

---

### Correct: expected failure returned as Result

```typescript
return err(createBookingError('booking.equipment_unavailable', error.message, error, context));
```

### Wrong: throwing an HTTP exception from the service

```typescript
throw new ConflictException('Equipment not available');
```

---

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

---

### Correct: wrapping multi-record writes in a transaction

```typescript
await this.prisma.$transaction(async (tx) => {
  await this.bookingRepository.saveWithinTransaction(booking, tx);
  await tx.equipmentAvailability.update({ ... });
});
```

---

## Canonical Example

For a current implemented `Result<T, FeatureError>` flow, use:

```text
apps/backend/src/modules/pricing/features/calculate-cart-price/calculate-cart-price.handler.ts
apps/backend/src/modules/pricing/features/calculate-cart-price/calculate-cart-price.errors.ts
```
