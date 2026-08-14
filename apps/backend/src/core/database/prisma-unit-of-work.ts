import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

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

@Injectable()
export class PrismaUnitOfWork {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationEventPublisher: IntegrationEventPublisher,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PrismaUnitOfWork.name);
  }

  async runInTransaction<T>(work: (context: PrismaTransactionContext) => Promise<T>): Promise<T> {
    const integrationEvents = new InMemoryIntegrationEventsCollector();

    const result = await this.prisma.client.$transaction(async (tx) => {
      return work({ tx, integrationEvents });
    });

    const recordedIntegrationEvents = integrationEvents.drain();
    if (recordedIntegrationEvents.length === 0) {
      return result;
    }

    try {
      await this.integrationEventPublisher.publish(recordedIntegrationEvents);
    } catch (error) {
      this.logger.error(
        { err: toError(error), integrationEventCount: recordedIntegrationEvents.length },
        'Integration event publication failed after transaction commit',
      );
    }

    return result;
  }
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error('A non-Error value was thrown.', { cause: value });
}
