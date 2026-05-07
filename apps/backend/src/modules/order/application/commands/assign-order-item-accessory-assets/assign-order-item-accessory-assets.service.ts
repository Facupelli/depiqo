import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AssignmentSource, AssignmentType, OrderAssignmentStage, OrderItemType, OrderStatus } from '@repo/types';
import { Result, err, ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { InventoryPublicApi } from 'src/modules/inventory/inventory.public-api';
import {
  DuplicateOrderItemAccessoryAssetError,
  OrderAccessorySelectionNotAllowedError,
  OrderAccessorySelectionRequiresProductItemError,
  OrderItemAccessoryAssetLocationMismatchError,
  OrderItemAccessoryAssetMismatchError,
  OrderItemAccessoryAssetUnavailableError,
  OrderItemAccessoryAssignmentNotFoundError,
  OrderItemAccessoryAssignmentQuantityExceededError,
} from 'src/modules/order/domain/errors/order.errors';

import { AssignOrderItemAccessoryAssetsCommand } from './assign-order-item-accessory-assets.command';

const ASSIGNABLE_ACCESSORY_ASSET_STATUSES = new Set<OrderStatus>([
  OrderStatus.DRAFT,
  OrderStatus.PENDING_REVIEW,
  OrderStatus.CONFIRMED,
]);

type AssignOrderItemAccessoryAssetsError =
  | OrderItemAccessoryAssignmentNotFoundError
  | OrderAccessorySelectionNotAllowedError
  | OrderAccessorySelectionRequiresProductItemError
  | DuplicateOrderItemAccessoryAssetError
  | OrderItemAccessoryAssignmentQuantityExceededError
  | OrderItemAccessoryAssetMismatchError
  | OrderItemAccessoryAssetLocationMismatchError
  | OrderItemAccessoryAssetUnavailableError;

@CommandHandler(AssignOrderItemAccessoryAssetsCommand)
export class AssignOrderItemAccessoryAssetsService implements ICommandHandler<
  AssignOrderItemAccessoryAssetsCommand,
  Result<void, AssignOrderItemAccessoryAssetsError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryApi: InventoryPublicApi,
  ) {}

  async execute(
    command: AssignOrderItemAccessoryAssetsCommand,
  ): Promise<Result<void, AssignOrderItemAccessoryAssetsError>> {
    const accessory = await this.prisma.client.orderItemAccessory.findFirst({
      where: {
        id: command.orderItemAccessoryId,
        tenantId: command.tenantId,
        orderId: command.orderId,
        orderItemId: command.orderItemId,
      },
      select: {
        id: true,
        quantity: true,
        accessoryRentalItemId: true,
        order: {
          select: {
            id: true,
            status: true,
            locationId: true,
            periodStart: true,
            periodEnd: true,
          },
        },
        orderItem: {
          select: {
            id: true,
            type: true,
          },
        },
        assetAssignments: {
          select: { assetId: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!accessory) {
      return err(new OrderItemAccessoryAssignmentNotFoundError(command.orderItemAccessoryId));
    }

    const orderStatus = accessory.order.status as OrderStatus;
    if (!ASSIGNABLE_ACCESSORY_ASSET_STATUSES.has(orderStatus)) {
      return err(new OrderAccessorySelectionNotAllowedError(orderStatus));
    }

    if (accessory.orderItem.type !== OrderItemType.PRODUCT) {
      return err(new OrderAccessorySelectionRequiresProductItemError(command.orderItemId));
    }

    const pinnedAssetIds = command.assetIds;
    const seenPinnedAssetIds = new Set<string>();
    for (const assetId of pinnedAssetIds) {
      if (seenPinnedAssetIds.has(assetId)) {
        return err(new DuplicateOrderItemAccessoryAssetError(assetId));
      }
      seenPinnedAssetIds.add(assetId);
    }

    const existingAssignedAssetIds = new Set(accessory.assetAssignments.map((assignment) => assignment.assetId));
    const newPinnedAssetIds = pinnedAssetIds.filter((assetId) => !existingAssignedAssetIds.has(assetId));
    const remainingDemand = accessory.quantity - existingAssignedAssetIds.size;
    const requestedAssignmentCount =
      command.quantity ?? (pinnedAssetIds.length > 0 ? newPinnedAssetIds.length : remainingDemand);

    if (requestedAssignmentCount <= 0) {
      return ok(undefined);
    }

    if (requestedAssignmentCount > remainingDemand || newPinnedAssetIds.length > requestedAssignmentCount) {
      return err(new OrderItemAccessoryAssignmentQuantityExceededError(accessory.id, accessory.quantity));
    }

    const period = DateRange.create(accessory.order.periodStart, accessory.order.periodEnd);
    const pinnedAssets: string[] = [];

    for (const assetId of newPinnedAssetIds) {
      const asset = await this.inventoryApi.findAssetById(command.tenantId, assetId);
      if (!asset) {
        return err(new OrderItemAccessoryAssetUnavailableError(assetId));
      }

      if (asset.productTypeId !== accessory.accessoryRentalItemId) {
        return err(new OrderItemAccessoryAssetMismatchError(assetId, accessory.accessoryRentalItemId));
      }

      if (asset.locationId !== accessory.order.locationId) {
        return err(new OrderItemAccessoryAssetLocationMismatchError(assetId));
      }

      pinnedAssets.push(asset.id);
    }

    const transactionResult = await this.prisma.client.$transaction(async (tx) => {
      const resolvedAssets = [...pinnedAssets];
      const excludeAssetIds = [...existingAssignedAssetIds];

      for (const asset of pinnedAssets) {
        const availablePinnedIds = await this.inventoryApi.findAvailableAssetIds(
          {
            productTypeId: accessory.accessoryRentalItemId,
            locationId: accessory.order.locationId,
            period,
            quantity: 1,
            assetId: asset,
            excludeAssetIds,
          },
          tx,
        );

        if (availablePinnedIds.length === 0) {
          return err(new OrderItemAccessoryAssetUnavailableError(asset));
        }

        excludeAssetIds.push(asset);
      }

      const freeAssignmentCount = requestedAssignmentCount - pinnedAssets.length;
      if (freeAssignmentCount > 0) {
        const availableAssetIds = await this.inventoryApi.findAvailableAssetIds(
          {
            productTypeId: accessory.accessoryRentalItemId,
            locationId: accessory.order.locationId,
            period,
            quantity: freeAssignmentCount,
            excludeAssetIds,
          },
          tx,
        );

        resolvedAssets.push(...availableAssetIds);
      }

      for (const assetId of resolvedAssets) {
        const saveResult = await this.inventoryApi.saveOrderAssignment(
          {
            assetId,
            period,
            type: AssignmentType.ORDER,
            stage:
              orderStatus === OrderStatus.PENDING_REVIEW ? OrderAssignmentStage.HOLD : OrderAssignmentStage.COMMITTED,
            source: AssignmentSource.OWNED,
            orderId: accessory.order.id,
            orderItemId: accessory.orderItem.id,
            orderItemAccessoryId: accessory.id,
          },
          tx,
        );

        if (saveResult.isErr()) {
          return err(new OrderItemAccessoryAssetUnavailableError(assetId));
        }
      }

      return ok(undefined);
    });

    if (transactionResult.isErr()) {
      return err(transactionResult.error);
    }

    return ok(undefined);
  }
}
