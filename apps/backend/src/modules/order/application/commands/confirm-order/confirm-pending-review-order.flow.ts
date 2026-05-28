import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssignmentSource, AssignmentType, OrderAssignmentStage } from '@repo/types';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { InventoryPublicApi } from 'src/modules/inventory/inventory.public-api';
import { OrderRepository } from 'src/modules/order/infrastructure/persistence/repositories/order.repository';
import { OrderApprovedEvent } from 'src/modules/order/public/events/order-approved.event';

import {
  attachConfirmedDemandToOrder,
  buildConfirmOrderDemandUnits,
  buildUnavailableError,
} from './confirm-draft-order.flow';
import { CreateOrderAssetResolver } from '../create-order/inventory/create-order-asset-resolver';
import { CreateOrderOwnerContractResolver } from '../create-order/ownership/create-order-owner-contract-resolver';
import { Order } from '../../../domain/entities/order.entity';
import { InvalidOrderStatusTransitionException } from '../../../domain/exceptions/order.exceptions';
import {
  NoActiveContractForAssetError,
  OrderItemUnavailableError,
  OrderStatusTransitionNotAllowedError,
} from '../../../domain/errors/order.errors';

type ConfirmPendingReviewOrderError =
  | NoActiveContractForAssetError
  | OrderItemUnavailableError
  | OrderStatusTransitionNotAllowedError;

@Injectable()
export class ConfirmPendingReviewOrderFlow {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly orderRepository: OrderRepository,
    private readonly inventoryApi: InventoryPublicApi,
    private readonly assetResolver: CreateOrderAssetResolver,
    private readonly ownerContractResolver: CreateOrderOwnerContractResolver,
  ) {}

  async execute(order: Order, reviewedByUserId: string): Promise<Result<void, ConfirmPendingReviewOrderError>> {
    const transactionResult = await this.prisma.client.$transaction(async (tx) => {
      const demandUnits = buildConfirmOrderDemandUnits(order);
      const availability = await this.assetResolver.resolveDemand(demandUnits, tx);

      if (availability.unavailableItems.length > 0 || availability.conflictGroups.length > 0) {
        return err(new OrderItemUnavailableError(availability.unavailableItems, availability.conflictGroups));
      }

      try {
        order.confirm(reviewedByUserId);
      } catch (error) {
        if (error instanceof InvalidOrderStatusTransitionException) {
          return err(new OrderStatusTransitionNotAllowedError(order.currentStatus, 'CONFIRMED' as never));
        }

        throw error;
      }

      const contractByAssetId = await this.ownerContractResolver.resolve(
        order.tenantId,
        order.currentPeriod.start,
        demandUnits,
      );
      const assignments = attachConfirmedDemandToOrder(order, demandUnits, contractByAssetId);

      await this.orderRepository.save(order, tx);
      const assignmentResults = await Promise.all(
        assignments.map((assignment) => this.inventoryApi.saveOrderAssignment(assignment, tx)),
      );

      if (assignmentResults.some((result) => result.isErr())) {
        return err(buildUnavailableError(demandUnits));
      }

      const accessoryAssignmentResult = await this.createCommittedAccessoryAssignments(order, tx);
      if (accessoryAssignmentResult.isErr()) {
        return err(accessoryAssignmentResult.error);
      }

      return ok(undefined);
    });

    if (transactionResult.isErr()) {
      return err(transactionResult.error);
    }

    await this.eventEmitter.emitAsync(
      OrderApprovedEvent.EVENT_NAME,
      new OrderApprovedEvent({
        orderId: order.id,
        tenantId: order.tenantId,
        customerId: order.customerId,
        reviewedByUserId,
      }),
    );

    return ok(undefined);
  }

  private async createCommittedAccessoryAssignments(
    order: Order,
    tx: PrismaTransactionClient,
  ): Promise<Result<void, OrderItemUnavailableError>> {
    const accessoryRequests = await this.loadAccessoryRequests(order, tx);

    if (accessoryRequests.length === 0) {
      return ok(undefined);
    }

    await tx.assetAssignment.deleteMany({
      where: {
        orderId: order.id,
        orderItemAccessoryId: { not: null },
        type: AssignmentType.ORDER,
      },
    });

    for (const accessoryRequest of accessoryRequests) {
      const availableAssetIds = await this.inventoryApi.findAvailableAssetIds(
        {
          productTypeId: accessoryRequest.accessoryRentalItemId,
          locationId: order.locationId,
          period: order.currentPeriod,
          quantity: accessoryRequest.quantity,
        },
        tx,
      );

      if (availableAssetIds.length < accessoryRequest.quantity) {
        return err(
          new OrderItemUnavailableError(
            [],
            [],
            [
              {
                orderItemAccessoryId: accessoryRequest.id,
                accessoryRentalItemId: accessoryRequest.accessoryRentalItemId,
                requestedCount: accessoryRequest.quantity,
                availableCount: availableAssetIds.length,
              },
            ],
          ),
        );
      }

      for (const assetId of availableAssetIds) {
        const saveResult = await this.inventoryApi.saveOrderAssignment(
          {
            assetId,
            period: order.currentPeriod,
            type: AssignmentType.ORDER,
            stage: OrderAssignmentStage.COMMITTED,
            source: AssignmentSource.OWNED,
            orderId: order.id,
            orderItemAccessoryId: accessoryRequest.id,
          },
          tx,
        );

        if (saveResult.isErr()) {
          return err(
            new OrderItemUnavailableError(
              [],
              [],
              [
                {
                  orderItemAccessoryId: accessoryRequest.id,
                  accessoryRentalItemId: accessoryRequest.accessoryRentalItemId,
                  requestedCount: accessoryRequest.quantity,
                  availableCount: 0,
                },
              ],
            ),
          );
        }
      }
    }

    return ok(undefined);
  }

  private async loadAccessoryRequests(
    order: Order,
    tx: PrismaTransactionClient,
  ): Promise<Array<{ id: string; accessoryRentalItemId: string; quantity: number }>> {
    const orderItemAccessoryDelegate = (
      tx as PrismaTransactionClient & {
        orderItemAccessory?: {
          findMany: (args: {
            where: { tenantId: string; orderId: string };
            select: { id: true; accessoryRentalItemId: true; quantity: true };
            orderBy: { createdAt: 'asc' };
          }) => Promise<Array<{ id: string; accessoryRentalItemId: string; quantity: number }>>;
        };
      }
    ).orderItemAccessory;

    if (!orderItemAccessoryDelegate) {
      return [];
    }

    return orderItemAccessoryDelegate.findMany({
      where: {
        tenantId: order.tenantId,
        orderId: order.id,
      },
      select: {
        id: true,
        accessoryRentalItemId: true,
        quantity: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
