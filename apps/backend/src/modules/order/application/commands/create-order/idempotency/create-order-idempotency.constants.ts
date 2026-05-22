export const CREATE_ORDER_IDEMPOTENCY_HEADER = 'idempotency-key';

export enum CreateOrderIdempotencyStartKind {
  STARTED = 'STARTED',
  COMPLETED_REPLAY = 'COMPLETED_REPLAY',
  IN_PROGRESS = 'IN_PROGRESS',
  CONFLICT = 'CONFLICT',
}

export enum CreateOrderIdempotencyPreflightKind {
  STARTED = 'STARTED',
  REPLAY = 'REPLAY',
  ERROR = 'ERROR',
}

export const CREATE_ORDER_IDEMPOTENCY_PROBLEM = {
  missingKey: {
    title: 'Missing Idempotency Key',
    type: 'errors://missing-idempotency-key',
  },
  invalidKey: {
    title: 'Invalid Idempotency Key',
    type: 'errors://invalid-idempotency-key',
  },
  inProgress: {
    title: 'Idempotency Key In Progress',
    type: 'errors://idempotency-key-in-progress',
  },
  conflict: {
    title: 'Idempotency Key Conflict',
    type: 'errors://idempotency-key-conflict',
  },
} as const;

export const CREATE_ORDER_IDEMPOTENCY_RETRYABLE_PROBLEM_EXTENSION = { retryable: true } as const;

export const CREATE_ORDER_IDEMPOTENCY_CUSTOMER_ID_REQUIRED_MESSAGE =
  'CreateOrderCommand requires customerId for customer order creation idempotency.';
