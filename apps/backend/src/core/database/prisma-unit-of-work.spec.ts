import { err, ok } from 'neverthrow';
import { PinoLogger } from 'nestjs-pino';

import { IntegrationEvent } from '../domain/events/integration-event';
import { IntegrationEventPublisher } from '../domain/events/integration-event.publisher';
import { NestedResultAwareTransactionError, PrismaUnitOfWork } from './prisma-unit-of-work';
import { PrismaService } from './prisma.service';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

/**
 * Test double that mimics Prisma transaction semantics:
 * the work callback runs against a fresh tx client and a rejected
 * callback means the transaction rolled back.
 */
function makePrisma() {
  let transactionsOpened = 0;

  const prisma = {
    client: {
      $transaction: jest.fn(async (work: (tx: object) => Promise<unknown>) => {
        transactionsOpened += 1;
        const tx = { id: transactionsOpened };
        return work(tx);
      }),
    },
  } as unknown as PrismaService;

  return {
    prisma,
    transactionCalls: () => prisma.client.$transaction as jest.Mock,
    transactionsOpened: () => transactionsOpened,
  };
}

describe('PrismaUnitOfWork', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('standalone transaction', () => {
    it('publishes collected integration events after a successful transaction', async () => {
      const markers: string[] = [];
      const { prisma, transactionsOpened } = makePrisma();
      const publisher = new TestIntegrationEventPublisher();
      const event = makeEvent();

      publisher.publish.mockImplementation(async (events) => {
        markers.push(`publish:${events[0].eventId}`);
      });

      const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());

      const result = await unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        expect((tx as { id: number }).id).toBe(1);
        markers.push('work');
        integrationEvents.collect([event]);
        return 'ok';
      });

      expect(result).toBe('ok');
      expect(transactionsOpened()).toBe(1);
      expect(publisher.publish).toHaveBeenCalledWith([event]);
      expect(markers).toEqual(['work', 'publish:event-1']);
    });

    it('does not publish when the transaction fails', async () => {
      const { prisma } = makePrisma();
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
      const { prisma } = makePrisma();
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

  describe('nested REQUIRED propagation', () => {
    it('joins the existing transaction instead of opening a new one', async () => {
      const { prisma, transactionsOpened } = makePrisma();
      const publisher = new TestIntegrationEventPublisher();
      const event = makeEvent();

      const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());

      await unitOfWork.runInTransaction(async (outer) => {
        await unitOfWork.runInTransaction(async (inner) => {
          expect(inner.tx).toBe(outer.tx);
          expect(inner.integrationEvents).toBe(outer.integrationEvents);
          inner.integrationEvents.collect([event]);
        });

        expect(publisher.publish).not.toHaveBeenCalled();
      });

      expect(transactionsOpened()).toBe(1);
      expect(publisher.publish).toHaveBeenCalledTimes(1);
      expect(publisher.publish).toHaveBeenCalledWith([event]);
    });

    it('rolls back the whole outer transaction when nested work throws', async () => {
      const { prisma, transactionsOpened } = makePrisma();
      const publisher = new TestIntegrationEventPublisher();
      const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());
      const failure = new Error('inner failure');

      await expect(
        unitOfWork.runInTransaction(async (outer) => {
          outer.integrationEvents.collect([makeEvent({ eventId: 'outer-event' })]);

          await unitOfWork.runInTransaction(async (inner) => {
            inner.integrationEvents.collect([makeEvent({ eventId: 'inner-event' })]);
            throw failure;
          });
        }),
      ).rejects.toBe(failure);

      expect(transactionsOpened()).toBe(1);
      expect(publisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('runResultInTransaction', () => {
    it('commits, publishes after commit, and returns the original Ok', async () => {
      const markers: string[] = [];
      const { prisma, transactionsOpened } = makePrisma();
      const publisher = new TestIntegrationEventPublisher();
      const event = makeEvent();

      publisher.publish.mockImplementation(async () => {
        markers.push('publish');
      });

      const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());

      const result = await unitOfWork.runResultInTransaction(async ({ integrationEvents }) => {
        integrationEvents.collect([event]);
        markers.push('work');
        return ok('value');
      });

      expect(result).toEqual(ok('value'));
      expect(transactionsOpened()).toBe(1);
      expect(publisher.publish).toHaveBeenCalledWith([event]);
      expect(markers).toEqual(['work', 'publish']);
    });

    it('performs an actual Prisma rollback on Err, publishes nothing, and returns the original Err', async () => {
      const markers: string[] = [];
      const rollbackMarker = 'rollback';

      const prisma = {
        client: {
          $transaction: jest.fn(async (work: (tx: object) => Promise<unknown>) => {
            try {
              const value = await work({});
              markers.push('commit');
              return value;
            } catch (error) {
              // A rejected callback means Prisma rolls the transaction back.
              markers.push(rollbackMarker);
              throw error;
            }
          }),
        },
      } as unknown as PrismaService;

      const publisher = new TestIntegrationEventPublisher();
      const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());
      const applicationError = { code: 'E_APPLICATION' };

      const result = await unitOfWork.runResultInTransaction<string, { code: string }>(
        async ({ integrationEvents }) => {
          integrationEvents.collect([makeEvent()]);
          return err(applicationError);
        },
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe(applicationError);
      }
      expect(markers).toEqual([rollbackMarker]);
      expect(publisher.publish).not.toHaveBeenCalled();
    });

    it('rolls back and rethrows the original exception', async () => {
      const markers: string[] = [];

      const prisma = {
        client: {
          $transaction: jest.fn(async (work: (tx: object) => Promise<unknown>) => {
            try {
              const value = await work({});
              markers.push('commit');
              return value;
            } catch (error) {
              markers.push('rollback');
              throw error;
            }
          }),
        },
      } as unknown as PrismaService;

      const publisher = new TestIntegrationEventPublisher();
      const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());
      const infrastructureFailure = new Error('infrastructure failed');

      await expect(
        unitOfWork.runResultInTransaction(async () => {
          throw infrastructureFailure;
        }),
      ).rejects.toBe(infrastructureFailure);

      expect(markers).toEqual(['rollback']);
      expect(publisher.publish).not.toHaveBeenCalled();
    });

    it('rejects nested use before invoking its callback, propagates through the outer work, and rolls back the outer transaction', async () => {
      const { prisma, transactionsOpened } = makePrisma();
      const publisher = new TestIntegrationEventPublisher();
      const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());
      const nestedWork = jest.fn();

      await expect(
        unitOfWork.runInTransaction(async (outer) => {
          outer.integrationEvents.collect([makeEvent()]);

          await unitOfWork.runResultInTransaction(nestedWork);
        }),
      ).rejects.toThrow(NestedResultAwareTransactionError);

      expect(nestedWork).not.toHaveBeenCalled();
      expect(transactionsOpened()).toBe(1);
      expect(publisher.publish).not.toHaveBeenCalled();
    });

    it('rejects direct nested use without invoking its callback', async () => {
      const { prisma, transactionsOpened } = makePrisma();
      const publisher = new TestIntegrationEventPublisher();
      const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());
      const nestedWork = jest.fn();
      const event = makeEvent();

      await unitOfWork.runInTransaction(async ({ integrationEvents }) => {
        integrationEvents.collect([event]);

        await expect(unitOfWork.runResultInTransaction(nestedWork)).rejects.toThrow(NestedResultAwareTransactionError);
      });

      expect(nestedWork).not.toHaveBeenCalled();
      expect(transactionsOpened()).toBe(1);
      expect(publisher.publish).toHaveBeenCalledTimes(1);
      expect(publisher.publish).toHaveBeenCalledWith([event]);
    });
  });

  describe('ambient isolation', () => {
    it('keeps concurrent executions isolated from each other', async () => {
      const { prisma, transactionsOpened } = makePrisma();
      const publisher = new TestIntegrationEventPublisher();
      const unitOfWork = new PrismaUnitOfWork(prisma, publisher, makeLogger());

      const gates = {
        firstEntered: deferred<void>(),
        secondEntered: deferred<void>(),
        firstRelease: deferred<void>(),
        secondRelease: deferred<void>(),
      };

      const observed: Array<{ name: string; tx: unknown }> = [];

      const first = unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        observed.push({ name: 'first', tx });
        integrationEvents.collect([makeEvent({ eventId: 'first-event' })]);
        gates.firstEntered.resolve();
        await gates.firstRelease.promise;
        return 'first-result';
      });

      const second = unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        observed.push({ name: 'second', tx });
        integrationEvents.collect([makeEvent({ eventId: 'second-event' })]);
        gates.secondEntered.resolve();
        await gates.secondRelease.promise;
        return 'second-result';
      });

      await gates.firstEntered.promise;
      await gates.secondEntered.promise;

      gates.secondRelease.resolve();
      gates.firstRelease.resolve();

      const [firstResult, secondResult] = await Promise.all([first, second]);

      expect(firstResult).toBe('first-result');
      expect(secondResult).toBe('second-result');
      expect(transactionsOpened()).toBe(2);

      const firstObservation = observed.find((entry) => entry.name === 'first');
      const secondObservation = observed.find((entry) => entry.name === 'second');
      expect(firstObservation).toBeDefined();
      expect(secondObservation).toBeDefined();
      expect(firstObservation?.tx).not.toBe(secondObservation?.tx);

      expect(publisher.publish).toHaveBeenCalledTimes(2);
      const publishedEvents = publisher.publish.mock.calls.map(([events]) => events[0].eventId);
      expect(new Set(publishedEvents)).toEqual(new Set(['first-event', 'second-event']));
    });
  });
});
