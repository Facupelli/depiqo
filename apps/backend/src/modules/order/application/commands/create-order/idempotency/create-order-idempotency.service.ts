import { Injectable } from '@nestjs/common';
import { ok, Result } from 'neverthrow';
import { Prisma, OrderCreateIdempotencyStatus } from 'src/generated/prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';

import { CreateOrderIdempotencyStartKind } from './create-order-idempotency.constants';

const ORDER_CREATE_IDEMPOTENCY_IN_PROGRESS_STALE_AFTER_MS = 10 * 60 * 1000;

export type StartCreateOrderIdempotencyParams = {
  tenantId: string;
  customerId: string;
  idempotencyKey: string;
  requestHash: string;
};

export type StartCreateOrderIdempotencyResult =
  | { kind: CreateOrderIdempotencyStartKind.STARTED; recordId: string }
  | { kind: CreateOrderIdempotencyStartKind.COMPLETED_REPLAY; orderId: string }
  | { kind: CreateOrderIdempotencyStartKind.IN_PROGRESS }
  | { kind: CreateOrderIdempotencyStartKind.CONFLICT };

@Injectable()
export class CreateOrderIdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async start(
    params: StartCreateOrderIdempotencyParams,
  ): Promise<Result<StartCreateOrderIdempotencyResult, never>> {
    try {
      const record = await this.prisma.client.orderCreateIdempotencyKey.create({
        data: {
          tenantId: params.tenantId,
          customerId: params.customerId,
          idempotencyKey: params.idempotencyKey,
          requestHash: params.requestHash,
          status: OrderCreateIdempotencyStatus.IN_PROGRESS,
        },
        select: { id: true },
      });

      return ok({ kind: CreateOrderIdempotencyStartKind.STARTED, recordId: record.id });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
    }

    const existing = await this.prisma.client.orderCreateIdempotencyKey.findFirst({
      where: {
        tenantId: params.tenantId,
        customerId: params.customerId,
        idempotencyKey: params.idempotencyKey,
      },
      select: {
        id: true,
        requestHash: true,
        status: true,
        orderId: true,
        createdAt: true,
      },
    });

    if (!existing) {
      throw new Error('Order create idempotency key unique conflict occurred, but no existing record was found.');
    }

    if (existing.requestHash !== params.requestHash) {
      return ok({ kind: CreateOrderIdempotencyStartKind.CONFLICT });
    }

    if (existing.status === OrderCreateIdempotencyStatus.IN_PROGRESS) {
      if (this.isStaleInProgress(existing.createdAt)) {
        await this.prisma.client.orderCreateIdempotencyKey.deleteMany({
          where: {
            id: existing.id,
            status: OrderCreateIdempotencyStatus.IN_PROGRESS,
          },
        });

        return this.start(params);
      }

      return ok({ kind: CreateOrderIdempotencyStartKind.IN_PROGRESS });
    }

    if (!existing.orderId) {
      throw new Error('Completed order create idempotency key is missing an order id.');
    }

    return ok({ kind: CreateOrderIdempotencyStartKind.COMPLETED_REPLAY, orderId: existing.orderId });
  }

  async complete(recordId: string, orderId: string, tx?: PrismaTransactionClient): Promise<Result<void, never>> {
    const client = tx ?? this.prisma.client;

    const updateResult = await client.orderCreateIdempotencyKey.updateMany({
      where: { id: recordId },
      data: {
        status: OrderCreateIdempotencyStatus.COMPLETED,
        orderId,
        completedAt: new Date(),
      },
    });

    if (updateResult.count !== 1) {
      throw new Error(`Expected to complete one order create idempotency record, updated ${updateResult.count}.`);
    }

    return ok(undefined);
  }

  async release(recordId: string): Promise<Result<void, never>> {
    await this.prisma.client.orderCreateIdempotencyKey.deleteMany({
      where: { id: recordId },
    });

    return ok(undefined);
  }

  private isStaleInProgress(createdAt: Date): boolean {
    return Date.now() - createdAt.getTime() > ORDER_CREATE_IDEMPOTENCY_IN_PROGRESS_STALE_AFTER_MS;
  }
}
