# Application Service

## Role

An Application Service orchestrates the steps required to fulfill a single command-side use case. It is the entry point for a command into the application core.

It does not contain business logic. Its job is to load aggregates, invoke domain logic, persist results, and return an outcome. Think of it as a workflow script that coordinates entities, repositories, and Domain Services.

One Application Service per state-changing use case.

---

## Rules

### Orchestration only

- Do not put business rules or domain decisions inside an Application Service.
- If a rule belongs to one aggregate, put it in the entity.
- If a rule spans multiple aggregates, put it in a Domain Service.
- The service should read like a workflow: load -> act -> persist -> return.

### Dependencies

- Inject repositories for aggregate persistence.
- Inject Domain Services when the use case coordinates domain logic across aggregates.
- Inject `PrismaService` directly only when the command-side use case genuinely needs direct persistence access beyond repository responsibilities.
- Do not inject other Application Services.
- Do not import private internals from another module. Use that module's public facade or the CQRS bus.

### Commands and return values

- The service is also the NestJS `@CommandHandler` for its command.
- It implements `ICommandHandler<TCommand, TResult>`.
- `execute()` returns `Promise<Result<T, E>>` for use cases that may fail with a known Domain Error, or `Promise<T>` if no meaningful recoverable failure exists.
- Do not return raw Prisma records.

### Error handling

- Return Domain Errors or module application errors as `err(error)`.
- Do not throw for expected business failures.
- Let infrastructure exceptions propagate.
- Do not throw HTTP exceptions here.
- For HTTP-facing v2 use cases, follow `problem-details.md`: map known domain/public-module failures into module application errors, then let controllers convert them to Problem Details.

### Domain Events

- Domain Events recorded on aggregates are dispatched after persistence succeeds.
- Do not dispatch events manually from the Application Service.
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
import { BookingEntity } from '../../domain/booking.entity';
import { EquipmentUnavailableError } from '../../domain/errors/booking.errors';
import { BookingAvailabilityService } from '../../domain/booking-availability.service';
import { BookingRepository } from '../../infrastructure/booking.repository';

type CreateBookingResult = Result<{ id: string }, EquipmentUnavailableError>;

@CommandHandler(CreateBookingCommand)
export class CreateBookingService implements ICommandHandler<CreateBookingCommand, CreateBookingResult> {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly bookingAvailability: BookingAvailabilityService,
  ) {}

  async execute(command: CreateBookingCommand): Promise<CreateBookingResult> {
    const existingBookings = await this.bookingRepository.findActiveForEquipment(command.tenantId, command.equipmentId);

    const availabilityResult = this.bookingAvailability.checkAvailability(command.period, existingBookings);
    if (availabilityResult.isErr()) {
      return err(availabilityResult.error);
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
}
```

---

## Examples

### Correct: domain rule enforced inside the entity, service just coordinates

```typescript
booking.confirm();
await this.bookingRepository.save(booking);
return ok(undefined);
```

### Wrong: domain rule enforced inside the service

```typescript
if (booking.status !== 'PENDING') {
  return err(new BookingCannotBeConfirmedError(booking.id));
}

booking.props.status = 'CONFIRMED';
```

---

### Correct: returning a Domain Error without throwing

```typescript
if (availabilityResult.isErr()) {
  return err(availabilityResult.error);
}
```

### Wrong: throwing an HTTP exception from the service

```typescript
throw new ConflictException('Equipment not available');
```

---

### Correct: wrapping multi-record writes in a transaction

```typescript
await this.prisma.$transaction(async (tx) => {
  await this.bookingRepository.saveWithinTransaction(booking, tx);
  await tx.equipmentAvailability.update({ ... });
});
```
