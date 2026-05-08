import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  AssignmentSource,
  AssignmentType,
  OrderAssignmentStage,
  OrderItemType,
  OrderStatus,
  RentalItemKind,
} from '@repo/types';
import { Result, err, ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { InventoryPublicApi } from 'src/modules/inventory/inventory.public-api';
import {
  DuplicateOrderAccessoryPreparationItemError,
  DuplicateOrderItemAccessoryError,
  InvalidOrderItemAccessoryQuantityError,
  OrderAccessorySelectionItemNotFoundError,
  OrderAccessorySelectionNotAllowedError,
  OrderAccessorySelectionRequiresProductItemError,
  OrderItemAccessoryIncompatibleError,
  OrderItemAccessoryInsufficientAvailableAssetsError,
  OrderItemAccessoryMustBeAccessoryError,
  OrderItemAccessoryRentalItemNotFoundError,
  OrderNotFoundError,
} from 'src/modules/order/domain/errors/order.errors';

import { SaveOrderAccessoryPreparationCommand } from './save-order-accessory-preparation.command';

const EDITABLE_ACCESSORY_PREPARATION_STATUSES = new Set<OrderStatus>([
  OrderStatus.DRAFT,
  OrderStatus.PENDING_REVIEW,
  OrderStatus.CONFIRMED,
]);

type SaveOrderAccessoryPreparationError =
  | OrderNotFoundError
  | OrderAccessorySelectionNotAllowedError
  | OrderAccessorySelectionItemNotFoundError
  | OrderAccessorySelectionRequiresProductItemError
  | InvalidOrderItemAccessoryQuantityError
  | DuplicateOrderItemAccessoryError
  | DuplicateOrderAccessoryPreparationItemError
  | OrderItemAccessoryRentalItemNotFoundError
  | OrderItemAccessoryMustBeAccessoryError
  | OrderItemAccessoryIncompatibleError
  | OrderItemAccessoryInsufficientAvailableAssetsError;

@CommandHandler(SaveOrderAccessoryPreparationCommand)
export class SaveOrderAccessoryPreparationService implements ICommandHandler<
  SaveOrderAccessoryPreparationCommand,
  Result<void, SaveOrderAccessoryPreparationError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryApi: InventoryPublicApi,
  ) {}

  async execute(
    command: SaveOrderAccessoryPreparationCommand,
  ): Promise<Result<void, SaveOrderAccessoryPreparationError>> {
    const order = await this.prisma.client.order.findFirst({
      where: { id: command.orderId, tenantId: command.tenantId },
      select: {
        id: true,
        status: true,
        locationId: true,
        periodStart: true,
        periodEnd: true,
        items: {
          select: {
            id: true,
            type: true,
            productTypeId: true,
          },
        },
      },
    });

    if (!order) {
      return err(new OrderNotFoundError(command.orderId));
    }

    const orderStatus = order.status as OrderStatus;
    if (!EDITABLE_ACCESSORY_PREPARATION_STATUSES.has(orderStatus)) {
      return err(new OrderAccessorySelectionNotAllowedError(orderStatus));
    }

    const orderItemById = new Map(order.items.map((item) => [item.id, item]));
    const submittedOrderItemIds = new Set<string>();
    const submittedAccessoryIds = new Set<string>();

    for (const item of command.items) {
      if (submittedOrderItemIds.has(item.orderItemId)) {
        return err(new DuplicateOrderAccessoryPreparationItemError(item.orderItemId));
      }
      submittedOrderItemIds.add(item.orderItemId);

      const orderItem = orderItemById.get(item.orderItemId);
      if (!orderItem) {
        return err(new OrderAccessorySelectionItemNotFoundError(item.orderItemId));
      }

      if (orderItem.type !== OrderItemType.PRODUCT || !orderItem.productTypeId) {
        return err(new OrderAccessorySelectionRequiresProductItemError(item.orderItemId));
      }

      const itemAccessoryIds = new Set<string>();
      for (const accessory of item.accessories) {
        if (accessory.quantity <= 0) {
          return err(new InvalidOrderItemAccessoryQuantityError());
        }

        if (itemAccessoryIds.has(accessory.accessoryRentalItemId)) {
          return err(new DuplicateOrderItemAccessoryError(accessory.accessoryRentalItemId));
        }
        itemAccessoryIds.add(accessory.accessoryRentalItemId);
        submittedAccessoryIds.add(accessory.accessoryRentalItemId);
      }
    }

    const accessoryRentalItemIds = [...submittedAccessoryIds];
    const accessoryRentalItems = await this.prisma.client.productType.findMany({
      where: { id: { in: accessoryRentalItemIds } },
      select: { id: true, tenantId: true, kind: true },
    });
    const accessoryRentalItemById = new Map(accessoryRentalItems.map((item) => [item.id, item]));

    for (const accessoryRentalItemId of accessoryRentalItemIds) {
      const accessoryRentalItem = accessoryRentalItemById.get(accessoryRentalItemId);
      if (!accessoryRentalItem || accessoryRentalItem.tenantId !== command.tenantId) {
        return err(new OrderItemAccessoryRentalItemNotFoundError(accessoryRentalItemId));
      }

      if (accessoryRentalItem.kind !== RentalItemKind.ACCESSORY) {
        return err(new OrderItemAccessoryMustBeAccessoryError(accessoryRentalItemId));
      }
    }

    const compatibleLinks = await this.prisma.client.accessoryLink.findMany({
      where: {
        tenantId: command.tenantId,
        primaryRentalItemId: {
          in: command.items
            .map((item) => orderItemById.get(item.orderItemId)?.productTypeId)
            .filter(Boolean) as string[],
        },
        accessoryRentalItemId: { in: accessoryRentalItemIds },
      },
      select: { primaryRentalItemId: true, accessoryRentalItemId: true },
    });
    const compatibleLinkKeys = new Set(
      compatibleLinks.map((link) => this.lineKey(link.primaryRentalItemId, link.accessoryRentalItemId)),
    );

    for (const item of command.items) {
      const primaryRentalItemId = orderItemById.get(item.orderItemId)!.productTypeId!;
      for (const accessory of item.accessories) {
        if (!compatibleLinkKeys.has(this.lineKey(primaryRentalItemId, accessory.accessoryRentalItemId))) {
          return err(new OrderItemAccessoryIncompatibleError(accessory.accessoryRentalItemId, primaryRentalItemId));
        }
      }
    }

    const period = DateRange.create(order.periodStart, order.periodEnd);
    const transactionResult = await this.prisma.client.$transaction(async (tx) => {
      const existingAccessories = await tx.orderItemAccessory.findMany({
        where: {
          tenantId: command.tenantId,
          orderId: command.orderId,
          orderItemId: { in: [...submittedOrderItemIds] },
        },
        select: {
          id: true,
          orderItemId: true,
          accessoryRentalItemId: true,
        },
      });

      for (const item of command.items) {
        const requestedAccessoryIds = new Set(item.accessories.map((a) => a.accessoryRentalItemId));
        const removedAccessories = existingAccessories.filter(
          (a) => a.orderItemId === item.orderItemId && !requestedAccessoryIds.has(a.accessoryRentalItemId),
        );

        for (const removed of removedAccessories) {
          await tx.assetAssignment.deleteMany({
            where: { orderItemAccessoryId: removed.id, type: AssignmentType.ORDER },
          });
        }

        await tx.orderItemAccessory.deleteMany({
          where: {
            tenantId: command.tenantId,
            orderId: command.orderId,
            orderItemId: item.orderItemId,
            accessoryRentalItemId: { notIn: [...requestedAccessoryIds] },
          },
        });
      }

      for (const item of command.items) {
        for (const accessory of item.accessories) {
          const persistedAccessory = await tx.orderItemAccessory.upsert({
            where: {
              orderItemId_accessoryRentalItemId: {
                orderItemId: item.orderItemId,
                accessoryRentalItemId: accessory.accessoryRentalItemId,
              },
            },
            create: {
              tenantId: command.tenantId,
              orderId: command.orderId,
              orderItemId: item.orderItemId,
              accessoryRentalItemId: accessory.accessoryRentalItemId,
              quantity: accessory.quantity,
              notes: accessory.notes,
            },
            update: {
              quantity: accessory.quantity,
              notes: accessory.notes,
            },
            select: { id: true },
          });

          const reconcileResult = await this.reconcileAssignments({
            command,
            orderStatus,
            orderLocationId: order.locationId,
            period,
            orderItemId: item.orderItemId,
            accessoryRentalItemId: accessory.accessoryRentalItemId,
            accessoryQuantity: accessory.quantity,
            orderItemAccessoryId: persistedAccessory.id,
            tx,
          });

          if (reconcileResult.isErr()) {
            return err(reconcileResult.error);
          }
        }
      }

      await tx.order.update({
        where: { id: command.orderId },
        data: { accessorySavedAt: new Date() },
      });

      return ok(undefined);
    });

    if (transactionResult.isErr()) {
      return err(transactionResult.error);
    }

    return ok(undefined);
  }

  private async reconcileAssignments(params: {
    command: SaveOrderAccessoryPreparationCommand;
    orderStatus: OrderStatus;
    orderLocationId: string;
    period: DateRange;
    orderItemId: string;
    accessoryRentalItemId: string;
    accessoryQuantity: number;
    orderItemAccessoryId: string;
    tx: PrismaTransactionClient;
  }): Promise<Result<void, OrderItemAccessoryInsufficientAvailableAssetsError>> {
    const existingAssignments = await params.tx.assetAssignment.findMany({
      where: {
        orderItemAccessoryId: params.orderItemAccessoryId,
        type: AssignmentType.ORDER,
      },
      select: { id: true, assetId: true },
      orderBy: { createdAt: 'asc' },
    });

    const keepCount = Math.min(existingAssignments.length, params.accessoryQuantity);

    if (existingAssignments.length > keepCount) {
      const releaseIds = existingAssignments.slice(keepCount).map((a) => a.id);
      await params.tx.assetAssignment.deleteMany({
        where: { id: { in: releaseIds } },
      });
    }

    const keptAssetIds = existingAssignments.slice(0, keepCount).map((a) => a.assetId);
    const gap = params.accessoryQuantity - keepCount;

    if (gap > 0) {
      const availableIds = await this.inventoryApi.findAvailableAssetIds(
        {
          productTypeId: params.accessoryRentalItemId,
          locationId: params.orderLocationId,
          period: params.period,
          quantity: gap,
          excludeAssetIds: keptAssetIds,
        },
        params.tx,
      );

      if (availableIds.length < gap) {
        return err(
          new OrderItemAccessoryInsufficientAvailableAssetsError(
            params.accessoryRentalItemId,
            gap,
            availableIds.length,
          ),
        );
      }

      for (const assetId of availableIds) {
        const saveResult = await this.inventoryApi.saveOrderAssignment(
          {
            assetId,
            period: params.period,
            type: AssignmentType.ORDER,
            stage:
              params.orderStatus === OrderStatus.PENDING_REVIEW
                ? OrderAssignmentStage.HOLD
                : OrderAssignmentStage.COMMITTED,
            source: AssignmentSource.OWNED,
            orderId: params.command.orderId,
            orderItemAccessoryId: params.orderItemAccessoryId,
          },
          params.tx,
        );

        if (saveResult.isErr()) {
          return err(new OrderItemAccessoryInsufficientAvailableAssetsError(params.accessoryRentalItemId, gap, 0));
        }
      }
    }

    return ok(undefined);
  }

  private lineKey(orderItemId: string, accessoryRentalItemId: string): string {
    return `${orderItemId}:${accessoryRentalItemId}`;
  }
}
