export class MissingIdempotencyKeyError extends Error {
  readonly code = 'MISSING_IDEMPOTENCY_KEY';

  constructor() {
    super('Idempotency-Key header is required for order creation.');
    this.name = 'MissingIdempotencyKeyError';
  }
}

export class InvalidIdempotencyKeyError extends Error {
  readonly code = 'INVALID_IDEMPOTENCY_KEY';

  constructor() {
    super('Idempotency-Key header must be a valid UUID.');
    this.name = 'InvalidIdempotencyKeyError';
  }
}

export class IdempotencyKeyInProgressError extends Error {
  readonly code = 'IDEMPOTENCY_KEY_IN_PROGRESS';

  constructor() {
    super('An order creation request with this idempotency key is already in progress.');
    this.name = 'IdempotencyKeyInProgressError';
  }
}

export class IdempotencyKeyConflictError extends Error {
  readonly code = 'IDEMPOTENCY_KEY_CONFLICT';

  constructor() {
    super('Idempotency-Key was already used with a different order creation payload.');
    this.name = 'IdempotencyKeyConflictError';
  }
}
