# Domain Error Rule

## Use When

Use this rule when modeling expected, recoverable business rule violations inside the domain layer.

Use feature/application errors in `<feature>.errors.ts` for HTTP-facing use-case contracts. For HTTP-facing error flow, also read `error-handling-problem-details.md`.

## Role

A Domain Error represents an expected, recoverable business rule violation inside the domain model. It is a normal domain outcome, not an exceptional technical failure.

Expected recoverable Domain Errors are returned with `Result` from `neverthrow`; they are not thrown for expected business failures. Impossible invariant violations, corrupted persisted state, programmer mistakes, and unrecoverable technical failures may still throw/fail fast.

## Decision Guide

### Domain Error vs Application Error

Use Domain Errors for business rules owned by entities, Value Objects, aggregates, or Domain Services.

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

Unexpected technical failures are not Domain Errors. Database failures, missing configuration, programmer mistakes, impossible invariants, corrupted persisted state, and unknown dependency failures should throw/bubble.

## Repo Convention

- Expected recoverable Domain Errors are returned with `Result` from `neverthrow`.
- All domain errors extend the base `DomainError` class.
- Each module may define a module-level base error, such as `BookingError extends DomainError`.
- Specific errors extend the module-level base, such as `EquipmentUnavailableError extends BookingError`.
- File: `[module-name].errors.ts` for module/domain errors.
- Classes use descriptive names such as `EquipmentUnavailableError`, `BookingAlreadyConfirmedError`, or `InsufficientCreditError`.

## Must Do

- Return expected recoverable Domain Errors as `err(new SomeDomainError(...))`.
- Declare possible recoverable domain failures in the `Result` type.
- Include enough context in error messages for debugging, such as relevant IDs or values.
- Treat Domain Error messages as developer/log messages, not automatically client-safe API response text.
- Map known Domain Errors into feature/application errors at HTTP-facing use-case boundaries.
- Preserve the original Domain Error as `cause` when mapping it to a feature/application error.
- Throw/fail fast for impossible invariant violations, corrupted reconstitution data, programmer mistakes, and unrecoverable technical failures.

## Must Not Do

- Do not throw for an expected business failure.
- Do not convert unknown failures into generic expected `Result` errors such as `Unexpected`.
- Do not model database failures, missing configuration, programmer mistakes, impossible invariants, corrupted persisted state, or unknown dependency failures as Domain Errors.
- Do not include HTTP status codes in Domain Errors.
- Do not include Problem Details mappings in Domain Errors.
- Do not include user-facing API messages in Domain Errors.
- Do not log from Domain Errors.
- Do not throw NestJS HTTP exceptions from domain code.

## Minimal Shape

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

The Domain Error is preserved as `cause`; the returned error belongs to the HTTP-facing feature contract.

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

### Correct: HTTP mapping happens outside the domain layer

```typescript
throw toCreateBookingProblem(result.error);
```

The controller maps feature/application errors to `ProblemException`.

### Wrong: HTTP concerns inside a domain error

```typescript
export class EquipmentUnavailableError extends BookingError {
  readonly httpStatus = 409;
}
```

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

## Canonical Example

For the current feature/application error flow, use:

```text
apps/backend/src/modules/pricing/features/calculate-cart-price/calculate-cart-price.errors.ts
apps/backend/src/modules/pricing/features/calculate-cart-price/calculate-cart-price.handler.ts
apps/backend/src/modules/pricing/features/calculate-cart-price/calculate-cart-price.controller.ts
```

## Related Rules

- `error-handling-problem-details.md`
- `application-service.md`
- `controller.md`
- `aggregate.md`
- `entity.md`
- `value-object.md`
- `domain-service.md`
