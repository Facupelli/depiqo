import { AppLogger } from '../logger/app-logger.service';
import { DomainEvent } from '../domain/events/domain-event';
import { DomainEventPublisher } from '../domain/events/domain-event.publisher';
import { PrismaUnitOfWork } from './prisma-unit-of-work';
import { PrismaService } from './prisma.service';

class TestDomainEventPublisher extends DomainEventPublisher {
  publish = jest.fn(async (_events: DomainEvent[]) => undefined);
}

function makeLogger(): AppLogger {
  return {
    error: jest.fn(),
  } as unknown as AppLogger;
}

function makeEvent(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    eventId: 'event-1',
    eventName: 'TestEvent',
    aggregateId: 'aggregate-1',
    aggregateType: 'TestAggregate',
    occurredAt: new Date('2026-03-28T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PrismaUnitOfWork', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('publishes collected events after a successful transaction', async () => {
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
    const publisher = new TestDomainEventPublisher();
    const event = makeEvent();

    publisher.publish.mockImplementation(async (events) => {
      markers.push(`publish:${events[0].eventId}`);
    });

    const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());

    const result = await unitOfWork.runInTransaction(async ({ tx: transaction, events }) => {
      expect(transaction).toBe(tx);
      markers.push('work');
      events.collect([event]);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(publisher.publish).toHaveBeenCalledWith([event]);
    expect(markers).toEqual(['transaction:start', 'work', 'transaction:commit', 'publish:event-1']);
  });

  it('does not publish when the transaction fails', async () => {
    const prisma = {
      client: {
        $transaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => {
          return work({});
        }),
      },
    } as unknown as PrismaService;
    const publisher = new TestDomainEventPublisher();
    const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());

    await expect(
      unitOfWork.runInTransaction(async ({ events }) => {
        events.collect([makeEvent()]);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('swallows publisher failures after commit and keeps the result', async () => {
    const prisma = {
      client: {
        $transaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => {
          return work({});
        }),
      },
    } as unknown as PrismaService;
    const publisher = new TestDomainEventPublisher();

    publisher.publish.mockRejectedValue(new Error('publish failed'));

    const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());
    const result = await unitOfWork.runInTransaction(async ({ events }) => {
      events.collect([makeEvent()]);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });
});
