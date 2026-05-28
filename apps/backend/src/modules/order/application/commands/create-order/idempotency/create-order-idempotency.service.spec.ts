import { Prisma, OrderCreateIdempotencyStatus } from 'src/generated/prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';
import { CreateOrderIdempotencyStartKind } from './create-order-idempotency.constants';
import { CreateOrderIdempotencyService } from './create-order-idempotency.service';

function makeUniqueConstraintError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: {},
  });
}

describe('CreateOrderIdempotencyService', () => {
  const params = {
    tenantId: 'tenant-1',
    customerId: 'customer-1',
    idempotencyKey: '123e4567-e89b-42d3-a456-426614174000',
    requestHash: 'request-hash-1',
  };

  function makeService() {
    const orderCreateIdempotencyKey = {
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    };

    const prisma = {
      client: { orderCreateIdempotencyKey },
    } as unknown as PrismaService;

    return {
      service: new CreateOrderIdempotencyService(prisma),
      orderCreateIdempotencyKey,
    };
  }

  it('starts a new idempotency key', async () => {
    const { service, orderCreateIdempotencyKey } = makeService();
    orderCreateIdempotencyKey.create.mockResolvedValue({ id: 'record-1' });

    const result = await service.start(params);

    expect(result._unsafeUnwrap()).toEqual({ kind: CreateOrderIdempotencyStartKind.STARTED, recordId: 'record-1' });
    expect(orderCreateIdempotencyKey.create).toHaveBeenCalledWith({
      data: {
        tenantId: params.tenantId,
        customerId: params.customerId,
        idempotencyKey: params.idempotencyKey,
        requestHash: params.requestHash,
        status: OrderCreateIdempotencyStatus.IN_PROGRESS,
      },
      select: { id: true },
    });
  });

  it('returns completed replay for a completed record with the same hash', async () => {
    const { service, orderCreateIdempotencyKey } = makeService();
    orderCreateIdempotencyKey.create.mockRejectedValue(makeUniqueConstraintError());
    orderCreateIdempotencyKey.findFirst.mockResolvedValue({
      id: 'record-1',
      requestHash: params.requestHash,
      status: OrderCreateIdempotencyStatus.COMPLETED,
      orderId: 'order-1',
      createdAt: new Date(),
    });

    const result = await service.start(params);

    expect(result._unsafeUnwrap()).toEqual({
      kind: CreateOrderIdempotencyStartKind.COMPLETED_REPLAY,
      orderId: 'order-1',
    });
  });

  it('returns conflict for a completed record with a different hash', async () => {
    const { service, orderCreateIdempotencyKey } = makeService();
    orderCreateIdempotencyKey.create.mockRejectedValue(makeUniqueConstraintError());
    orderCreateIdempotencyKey.findFirst.mockResolvedValue({
      id: 'record-1',
      requestHash: 'different-hash',
      status: OrderCreateIdempotencyStatus.COMPLETED,
      orderId: 'order-1',
      createdAt: new Date(),
    });

    const result = await service.start(params);

    expect(result._unsafeUnwrap()).toEqual({ kind: CreateOrderIdempotencyStartKind.CONFLICT });
  });

  it('returns in progress for a fresh in-progress record with the same hash', async () => {
    const { service, orderCreateIdempotencyKey } = makeService();
    orderCreateIdempotencyKey.create.mockRejectedValue(makeUniqueConstraintError());
    orderCreateIdempotencyKey.findFirst.mockResolvedValue({
      id: 'record-1',
      requestHash: params.requestHash,
      status: OrderCreateIdempotencyStatus.IN_PROGRESS,
      orderId: null,
      createdAt: new Date(),
    });

    const result = await service.start(params);

    expect(result._unsafeUnwrap()).toEqual({ kind: CreateOrderIdempotencyStartKind.IN_PROGRESS });
  });

  it('returns conflict for an in-progress record with a different hash', async () => {
    const { service, orderCreateIdempotencyKey } = makeService();
    orderCreateIdempotencyKey.create.mockRejectedValue(makeUniqueConstraintError());
    orderCreateIdempotencyKey.findFirst.mockResolvedValue({
      id: 'record-1',
      requestHash: 'different-hash',
      status: OrderCreateIdempotencyStatus.IN_PROGRESS,
      orderId: null,
      createdAt: new Date(),
    });

    const result = await service.start(params);

    expect(result._unsafeUnwrap()).toEqual({ kind: CreateOrderIdempotencyStartKind.CONFLICT });
  });

  it('reclaims stale in-progress records', async () => {
    const { service, orderCreateIdempotencyKey } = makeService();
    orderCreateIdempotencyKey.create
      .mockRejectedValueOnce(makeUniqueConstraintError())
      .mockResolvedValueOnce({ id: 'record-2' });
    orderCreateIdempotencyKey.findFirst.mockResolvedValue({
      id: 'record-1',
      requestHash: params.requestHash,
      status: OrderCreateIdempotencyStatus.IN_PROGRESS,
      orderId: null,
      createdAt: new Date(Date.now() - 11 * 60 * 1000),
    });

    const result = await service.start(params);

    expect(orderCreateIdempotencyKey.deleteMany).toHaveBeenCalledWith({
      where: { id: 'record-1', status: OrderCreateIdempotencyStatus.IN_PROGRESS },
    });
    expect(result._unsafeUnwrap()).toEqual({ kind: CreateOrderIdempotencyStartKind.STARTED, recordId: 'record-2' });
  });

  it('rethrows non-unique create errors', async () => {
    const { service, orderCreateIdempotencyKey } = makeService();
    const error = new Error('database unavailable');
    orderCreateIdempotencyKey.create.mockRejectedValue(error);

    await expect(service.start(params)).rejects.toBe(error);
  });

  it('throws when unique conflict occurs but no existing record is found', async () => {
    const { service, orderCreateIdempotencyKey } = makeService();
    orderCreateIdempotencyKey.create.mockRejectedValue(makeUniqueConstraintError());
    orderCreateIdempotencyKey.findFirst.mockResolvedValue(null);

    await expect(service.start(params)).rejects.toThrow('unique conflict occurred, but no existing record was found');
  });

  it('throws when a completed record is missing an order id', async () => {
    const { service, orderCreateIdempotencyKey } = makeService();
    orderCreateIdempotencyKey.create.mockRejectedValue(makeUniqueConstraintError());
    orderCreateIdempotencyKey.findFirst.mockResolvedValue({
      id: 'record-1',
      requestHash: params.requestHash,
      status: OrderCreateIdempotencyStatus.COMPLETED,
      orderId: null,
      createdAt: new Date(),
    });

    await expect(service.start(params)).rejects.toThrow(
      'Completed order create idempotency key is missing an order id',
    );
  });

  it('marks a record completed', async () => {
    const { service, orderCreateIdempotencyKey } = makeService();
    const tx = { orderCreateIdempotencyKey } as never;
    orderCreateIdempotencyKey.updateMany.mockResolvedValue({ count: 1 });

    await service.complete('record-1', 'order-1', tx);

    expect(orderCreateIdempotencyKey.updateMany).toHaveBeenCalledWith({
      where: { id: 'record-1' },
      data: {
        status: OrderCreateIdempotencyStatus.COMPLETED,
        orderId: 'order-1',
        completedAt: expect.any(Date),
      },
    });
  });

  it('throws when completing a record does not update exactly one row', async () => {
    const { service, orderCreateIdempotencyKey } = makeService();
    orderCreateIdempotencyKey.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.complete('record-1', 'order-1')).rejects.toThrow(
      'Expected to complete one order create idempotency record, updated 0.',
    );
  });

  it('releases a record', async () => {
    const { service, orderCreateIdempotencyKey } = makeService();

    await service.release('record-1');

    expect(orderCreateIdempotencyKey.deleteMany).toHaveBeenCalledWith({ where: { id: 'record-1' } });
  });
});
