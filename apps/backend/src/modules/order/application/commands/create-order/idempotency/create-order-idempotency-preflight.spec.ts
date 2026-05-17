import { FulfillmentMethod } from '@repo/types';
import { ok } from 'neverthrow';

import { CreateOrderCommand } from '../create-order.command';
import {
  CREATE_ORDER_IDEMPOTENCY_CUSTOMER_ID_REQUIRED_MESSAGE,
  CreateOrderIdempotencyPreflightKind,
  CreateOrderIdempotencyStartKind,
} from './create-order-idempotency.constants';
import { CreateOrderIdempotencyPreflight } from './create-order-idempotency-preflight';
import { CreateOrderIdempotencyService } from './create-order-idempotency.service';
import { createOrderRequestHash } from './create-order-request-fingerprint';
import {
  IdempotencyKeyConflictError,
  IdempotencyKeyInProgressError,
  InvalidIdempotencyKeyError,
  MissingIdempotencyKeyError,
} from '../create-order.types';

function makeCommand(overrides: Partial<ConstructorParameters<typeof CreateOrderCommand>[0]> = {}): CreateOrderCommand {
  return new CreateOrderCommand({
    tenantId: 'tenant-1',
    locationId: 'location-1',
    customerId: 'customer-1',
    pickupDate: '2026-03-30',
    returnDate: '2026-03-31',
    pickupTime: 600,
    returnTime: 900,
    items: [{ type: 'PRODUCT', productTypeId: 'product-1', quantity: 1 }],
    currency: 'ARS',
    insuranceSelected: false,
    fulfillmentMethod: FulfillmentMethod.PICKUP,
    idempotencyKey: '123e4567-e89b-42d3-a456-426614174000',
    ...overrides,
  });
}

describe('CreateOrderIdempotencyPreflight', () => {
  function makePreflight() {
    const idempotency = {
      start: jest.fn(),
    } as unknown as jest.Mocked<CreateOrderIdempotencyService>;

    return {
      preflight: new CreateOrderIdempotencyPreflight(idempotency),
      idempotency,
    };
  }

  it('returns an error when the idempotency key is missing', async () => {
    const { preflight, idempotency } = makePreflight();

    const result = await preflight.run(makeCommand({ idempotencyKey: undefined }));

    expect(result.kind).toBe(CreateOrderIdempotencyPreflightKind.ERROR);
    expect(result.kind === CreateOrderIdempotencyPreflightKind.ERROR ? result.error : undefined).toBeInstanceOf(
      MissingIdempotencyKeyError,
    );
    expect(idempotency.start).not.toHaveBeenCalled();
  });

  it('returns an error when the idempotency key is invalid', async () => {
    const { preflight, idempotency } = makePreflight();

    const result = await preflight.run(makeCommand({ idempotencyKey: 'not-a-uuid' }));

    expect(result.kind).toBe(CreateOrderIdempotencyPreflightKind.ERROR);
    expect(result.kind === CreateOrderIdempotencyPreflightKind.ERROR ? result.error : undefined).toBeInstanceOf(
      InvalidIdempotencyKeyError,
    );
    expect(idempotency.start).not.toHaveBeenCalled();
  });

  it('throws when customer id is missing', async () => {
    const { preflight, idempotency } = makePreflight();

    await expect(preflight.run(makeCommand({ customerId: undefined }))).rejects.toThrow(
      CREATE_ORDER_IDEMPOTENCY_CUSTOMER_ID_REQUIRED_MESSAGE,
    );
    expect(idempotency.start).not.toHaveBeenCalled();
  });

  it('returns started when the idempotency service starts a new record', async () => {
    const { preflight, idempotency } = makePreflight();
    const command = makeCommand();
    idempotency.start.mockResolvedValue(
      ok({ kind: CreateOrderIdempotencyStartKind.STARTED, recordId: 'idempotency-record-1' }),
    );

    const result = await preflight.run(command);

    expect(result).toEqual({
      kind: CreateOrderIdempotencyPreflightKind.STARTED,
      recordId: 'idempotency-record-1',
    });
    expect(idempotency.start).toHaveBeenCalledWith({
      tenantId: command.tenantId,
      customerId: command.customerId,
      idempotencyKey: command.idempotencyKey,
      requestHash: createOrderRequestHash(command),
    });
  });

  it('returns replay when the idempotency service finds a completed record', async () => {
    const { preflight, idempotency } = makePreflight();
    idempotency.start.mockResolvedValue(
      ok({ kind: CreateOrderIdempotencyStartKind.COMPLETED_REPLAY, orderId: 'order-1' }),
    );

    const result = await preflight.run(makeCommand());

    expect(result).toEqual({ kind: CreateOrderIdempotencyPreflightKind.REPLAY, orderId: 'order-1' });
  });

  it('returns an in-progress error when the idempotency service finds an in-progress record', async () => {
    const { preflight, idempotency } = makePreflight();
    idempotency.start.mockResolvedValue(ok({ kind: CreateOrderIdempotencyStartKind.IN_PROGRESS }));

    const result = await preflight.run(makeCommand());

    expect(result.kind).toBe(CreateOrderIdempotencyPreflightKind.ERROR);
    expect(result.kind === CreateOrderIdempotencyPreflightKind.ERROR ? result.error : undefined).toBeInstanceOf(
      IdempotencyKeyInProgressError,
    );
  });

  it('returns a conflict error when the idempotency service detects a hash conflict', async () => {
    const { preflight, idempotency } = makePreflight();
    idempotency.start.mockResolvedValue(ok({ kind: CreateOrderIdempotencyStartKind.CONFLICT }));

    const result = await preflight.run(makeCommand());

    expect(result.kind).toBe(CreateOrderIdempotencyPreflightKind.ERROR);
    expect(result.kind === CreateOrderIdempotencyPreflightKind.ERROR ? result.error : undefined).toBeInstanceOf(
      IdempotencyKeyConflictError,
    );
  });
});
