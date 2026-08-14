import { PinoLogger } from 'nestjs-pino';

import { IntegrationEvent } from '../domain/events/integration-event';
import { IntegrationEventPublisher } from '../domain/events/integration-event.publisher';
import { PrismaUnitOfWork } from './prisma-unit-of-work';
import { PrismaService } from './prisma.service';

class TestIntegrationEventPublisher extends IntegrationEventPublisher {
  publish = jest.fn(async (_events: readonly IntegrationEvent[]) => undefined);
}

function makeLogger(): PinoLogger {
  return {
    error: jest.fn(),
    setContext: jest.fn(),
  } as unknown as PinoLogger;
}

function makeEvent(overrides: Partial<IntegrationEvent> = {}): IntegrationEvent {
  return {
    eventId: 'event-1',
    eventName: 'TestIntegrationEvent',
    aggregateId: 'aggregate-1',
    aggregateType: 'TestAggregate',
    occurredAt: new Date('2026-03-28T00:00:00.000Z'),
    schemaVersion: 1,
    ...overrides,
  };
}

describe('PrismaUnitOfWork', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('publishes collected integration events after a successful transaction', async () => {
    const markers: string[] = [];
    const tx = { label: 'tx' };
    const prisma = {
      client: {
        $transaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => {
          markers.push('transaction:start');
          const result = await work(tx);
          markers.push('transaction:commit');
          return result;
        }),
      },
    } as unknown as PrismaService;
    const publisher = new TestIntegrationEventPublisher();
    const event = makeEvent();

    publisher.publish.mockImplementation(async (events) => {
      markers.push(`publish:${events[0].eventId}`);
    });

    const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());

    const result = await unitOfWork.runInTransaction(async ({ tx: transaction, integrationEvents }) => {
      expect(transaction).toBe(tx);
      markers.push('work');
      integrationEvents.collect([event]);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(publisher.publish).toHaveBeenCalledWith([event]);
    expect(markers).toEqual(['transaction:start', 'work', 'transaction:commit', 'publish:event-1']);
  });

  it('does not publish when the transaction fails', async () => {
    const prisma = {
      client: {
        $transaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
      },
    } as unknown as PrismaService;
    const publisher = new TestIntegrationEventPublisher();
    const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());

    await expect(
      unitOfWork.runInTransaction(async ({ integrationEvents }) => {
        integrationEvents.collect([makeEvent()]);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('swallows publisher failures after commit and keeps the result', async () => {
    const prisma = {
      client: {
        $transaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
      },
    } as unknown as PrismaService;
    const publisher = new TestIntegrationEventPublisher();
    publisher.publish.mockRejectedValue(new Error('publish failed'));

    const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());
    const result = await unitOfWork.runInTransaction(async ({ integrationEvents }) => {
      integrationEvents.collect([makeEvent()]);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });
});
