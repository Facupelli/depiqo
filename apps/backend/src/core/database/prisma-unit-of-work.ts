import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AsyncLocalStorage } from 'node:async_hooks';
import { ok, Result } from 'neverthrow';

import { InMemoryIntegrationEventsCollector } from '../domain/events/in-memory-integration-events.collector';
import { IntegrationEventPublisher } from '../domain/events/integration-event.publisher';
import { IntegrationEventsCollector } from '../domain/events/integration-events.collector';

import { PrismaService } from './prisma.service';

export type PrismaTransactionClient = Parameters<PrismaService['client']['$transaction']>[0] extends (
  tx: infer T,
  ...args: never[]
) => Promise<unknown>
  ? T
  : never;

export interface PrismaTransactionContext {
  tx: PrismaTransactionClient;
  integrationEvents: IntegrationEventsCollector;
}

/**
 * Private infrastructure signal used to make Prisma roll back when an
 * application workflow returns `Err`. It never carries application data.
 */
class TransactionRollbackSignal extends Error {
  constructor() {
    super('Transaction rollback requested by a result-aware workflow.');
    this.name = 'TransactionRollbackSignal';
  }
}

/** Thrown when a result-aware transaction boundary is used while a transaction is already active. */
export class NestedResultAwareTransactionError extends Error {
  constructor() {
    super(
      'runResultInTransaction is an outermost transaction boundary and must not be called inside an active transaction. Use runInTransaction for nested work.',
    );
    this.name = 'NestedResultAwareTransactionError';
  }
}

@Injectable()
export class PrismaUnitOfWork {
  private readonly ambientContext = new AsyncLocalStorage<PrismaTransactionContext>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationEventPublisher: IntegrationEventPublisher,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PrismaUnitOfWork.name);
  }

  async runInTransaction<T>(work: (context: PrismaTransactionContext) => Promise<T>): Promise<T> {
    const activeContext = this.ambientContext.getStore();
    if (activeContext) {
      return work(activeContext);
    }

    const integrationEvents = new InMemoryIntegrationEventsCollector();

    const result = await this.prisma.client.$transaction(async (tx) => {
      const context: PrismaTransactionContext = { tx, integrationEvents };
      return this.ambientContext.run(context, () => work(context));
    });

    await this.publishAfterCommit(integrationEvents);

    return result;
  }

  async runResultInTransaction<T, E>(
    work: (context: PrismaTransactionContext) => Promise<Result<T, E>>,
  ): Promise<Result<T, E>> {
    if (this.ambientContext.getStore()) {
      throw new NestedResultAwareTransactionError();
    }

    const integrationEvents = new InMemoryIntegrationEventsCollector();

    // The captured Err stays in this local variable; the rollback signal
    // itself never carries the Result across the Prisma $transaction boundary.
    let capturedErr: Result<T, E> | undefined;

    try {
      const value = await this.prisma.client.$transaction(async (tx) => {
        const context: PrismaTransactionContext = { tx, integrationEvents };
        return this.ambientContext.run(context, async () => {
          const result = await work(context);
          if (result.isErr()) {
            capturedErr = result;
            throw new TransactionRollbackSignal();
          }
          return result.value;
        });
      });

      await this.publishAfterCommit(integrationEvents);

      return ok(value);
    } catch (error) {
      if (error instanceof TransactionRollbackSignal && capturedErr) {
        return capturedErr;
      }

      throw error;
    }
  }

  private async publishAfterCommit(integrationEvents: IntegrationEventsCollector): Promise<void> {
    const recordedIntegrationEvents = integrationEvents.drain();
    if (recordedIntegrationEvents.length === 0) {
      return;
    }

    try {
      await this.integrationEventPublisher.publish(recordedIntegrationEvents);
    } catch (error) {
      this.logger.error(
        { err: toError(error), integrationEventCount: recordedIntegrationEvents.length },
        'Integration event publication failed after transaction commit',
      );
    }
  }
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error('A non-Error value was thrown.', { cause: value });
}
