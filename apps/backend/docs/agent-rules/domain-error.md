# Domain Error

## Role

A Domain Error represents an expected, recoverable business rule violation inside the domain model. It is a normal domain outcome, not an exceptional technical failure.

Domain Errors are returned with `Result` from `neverthrow`; they are not thrown for expected business failures.

For HTTP-facing error flow, also read `error-handling-problem-details.md`.

---

## Domain Error vs Application Error

Use Domain Errors for business rules owned by entities, value objects, or domain services.

Examples:

```text
equipment is unavailable for a period
booking cannot be cancelled from its current state
quantity is insufficient
rental period violates a domain policy
```

Use feature/application errors at the HTTP-facing use-case boundary.

A command/query handler may map domain errors into `<feature>.errors.ts` application errors before returning to the controller. The controller then maps those feature errors to Problem Details.

Flow:

```text
domain entity/service returns Result<T, DomainError>
  -> handler maps known DomainError to FeatureError
  -> handler returns Result<T, FeatureError>
  -> controller maps FeatureError to ProblemException
```

Unexpected technical failures are not Domain Errors. Database failures, missing configuration, programmer mistakes, impossible invariants, and unknown dependency failures should throw/bubble.

---

## Rules

### Return, do not throw

- Return Domain Errors as `err(new SomeDomainError(...))`.
- Declare possible domain failures in the `Result` type.
- Never throw for an expected business failure.

### Class hierarchy

- All domain errors extend the base `DomainError` class.
- Each module may define a module-level base error, e.g. `BookingError extends DomainError`.
- Specific errors extend the module-level base, e.g. `EquipmentUnavailableError extends BookingError`.

### Error message

- Include enough context for debugging, such as relevant IDs or values.
- Messages are for developers and logs.
- Messages are not automatically safe API response text.
- Controllers should expose client-safe Problem Details, not raw domain messages by default.

### Naming

- File: `[module-name].errors.ts` for module/domain errors.
- Classes: descriptive names such as `EquipmentUnavailableError`, `BookingAlreadyConfirmedError`, `InsufficientCreditError`.

### What never belongs here

- HTTP status codes.
- Problem Details mappings.
- User-facing API messages.
- Logging calls.
- NestJS HTTP exceptions.

---

## Structure

### Base class

```typescript
// src/core/exceptions/domain.error.ts
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
```

### Module domain errors

```typescript
// modules/booking/domain/errors/booking.errors.ts
import { DomainError } from 'src/core/exceptions/domain.error';

export class BookingError extends DomainError {}

export class EquipmentUnavailableError extends BookingError {
  constructor(equipmentId: string) {
    super(`Equipment ${equipmentId} is not available for the requested period`);
  }
}

export class BookingAlreadyConfirmedError extends BookingError {
  constructor(bookingId: string) {
    super(`Booking ${bookingId} is already confirmed`);
  }
}
```

### Returning a Domain Error

```typescript
import { err, ok, Result } from 'neverthrow';

checkAvailability(
  period: BookingPeriod,
  existingBookings: BookingEntity[],
): Result<void, EquipmentUnavailableError> {
  const hasConflict = existingBookings.some((booking) => booking.period.overlaps(period));

  if (hasConflict) {
    return err(new EquipmentUnavailableError(this.equipmentId));
  }

  return ok(undefined);
}
```

### Mapping a Domain Error at the use-case boundary

```typescript
const availabilityResult = this.bookingAvailability.checkAvailability(command.period, existingBookings);

if (availabilityResult.isErr()) {
  return err(
    createBookingError(
      'booking.equipment_unavailable',
      availabilityResult.error.message,
      availabilityResult.error,
      context,
    ),
  );
}
```

The domain error is preserved as `cause`; the returned error belongs to the HTTP-facing feature contract.

---

## Examples

### Correct: expected business failure returned as Result

```typescript
if (hasConflict) {
  return err(new EquipmentUnavailableError(equipmentId));
}
```

### Wrong: expected business failure thrown as exception

```typescript
if (hasConflict) {
  throw new EquipmentUnavailableError(equipmentId);
}
```

---

### Correct: HTTP mapping happens outside the domain layer

```typescript
// Controller maps feature/application errors to ProblemException.
throw toCreateBookingProblem(result.error);
```

### Wrong: HTTP concerns inside a domain error

```typescript
export class EquipmentUnavailableError extends BookingError {
  readonly httpStatus = 409;
}
```

---

### Correct: error message includes debugging context

```typescript
export class EquipmentUnavailableError extends BookingError {
  constructor(equipmentId: string) {
    super(`Equipment ${equipmentId} is not available for the requested period`);
  }
}
```

### Wrong: vague error message

```typescript
export class EquipmentUnavailableError extends BookingError {
  constructor() {
    super('Equipment not available');
  }
}
```

---

## Canonical HTTP-Facing Example

For the current feature/application error flow, use:

```text
apps/backend/src/modules/pricing/features/calculate-cart-price/calculate-cart-price.errors.ts
apps/backend/src/modules/pricing/features/calculate-cart-price/calculate-cart-price.handler.ts
apps/backend/src/modules/pricing/features/calculate-cart-price/calculate-cart-price.controller.ts
```
