import { Injectable } from '@nestjs/common';

import { CreateOrderCommand } from '../create-order.command';
import {
  CREATE_ORDER_IDEMPOTENCY_CUSTOMER_ID_REQUIRED_MESSAGE,
  CreateOrderIdempotencyPreflightKind,
  CreateOrderIdempotencyStartKind,
} from './create-order-idempotency.constants';
import { CreateOrderIdempotencyService } from './create-order-idempotency.service';
import { createOrderRequestHash } from './create-order-request-fingerprint';
import { CustomerCreateOrderError } from '../create-order.types';
import {
  IdempotencyKeyConflictError,
  IdempotencyKeyInProgressError,
  InvalidIdempotencyKeyError,
  MissingIdempotencyKeyError,
} from './create-order-idempotency.errors';

export type CreateOrderIdempotencyPreflightResult =
  | { kind: CreateOrderIdempotencyPreflightKind.STARTED; recordId: string }
  | { kind: CreateOrderIdempotencyPreflightKind.REPLAY; orderId: string }
  | { kind: CreateOrderIdempotencyPreflightKind.ERROR; error: CustomerCreateOrderError };

@Injectable()
export class CreateOrderIdempotencyPreflight {
  constructor(private readonly idempotency: CreateOrderIdempotencyService) {}

  async run(command: CreateOrderCommand): Promise<CreateOrderIdempotencyPreflightResult> {
    if (!command.idempotencyKey) {
      return { kind: CreateOrderIdempotencyPreflightKind.ERROR, error: new MissingIdempotencyKeyError() };
    }

    if (!isUuid(command.idempotencyKey)) {
      return { kind: CreateOrderIdempotencyPreflightKind.ERROR, error: new InvalidIdempotencyKeyError() };
    }

    if (!command.customerId) {
      throw new Error(CREATE_ORDER_IDEMPOTENCY_CUSTOMER_ID_REQUIRED_MESSAGE);
    }

    const startResult = await this.idempotency.start({
      tenantId: command.tenantId,
      customerId: command.customerId,
      idempotencyKey: command.idempotencyKey,
      requestHash: createOrderRequestHash(command),
    });

    const state = startResult._unsafeUnwrap();

    if (state.kind === CreateOrderIdempotencyStartKind.COMPLETED_REPLAY) {
      return { kind: CreateOrderIdempotencyPreflightKind.REPLAY, orderId: state.orderId };
    }

    if (state.kind === CreateOrderIdempotencyStartKind.IN_PROGRESS) {
      return { kind: CreateOrderIdempotencyPreflightKind.ERROR, error: new IdempotencyKeyInProgressError() };
    }

    if (state.kind === CreateOrderIdempotencyStartKind.CONFLICT) {
      return { kind: CreateOrderIdempotencyPreflightKind.ERROR, error: new IdempotencyKeyConflictError() };
    }

    return { kind: CreateOrderIdempotencyPreflightKind.STARTED, recordId: state.recordId };
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
