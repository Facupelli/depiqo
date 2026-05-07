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
  DuplicateOrderItemAccessoryAssetError,
  DuplicateOrderItemAccessoryError,
  InvalidOrderItemAccessoryQuantityError,
  OrderAccessorySelectionItemNotFoundError,
  OrderAccessorySelectionNotAllowedError,
  OrderAccessorySelectionRequiresProductItemError,
  OrderItemAccessoryAssetLocationMismatchError,
  OrderItemAccessoryAssetMismatchError,
  OrderItemAccessoryAssetUnavailableError,
  OrderItemAccessoryAssignmentQuantityExceededError,
  OrderItemAccessoryIncompatibleError,
  OrderItemAccessoryInsufficientAvailableAssetsError,
  OrderItemAccessoryMustBeAccessoryError,
  OrderItemAccessoryRentalItemNotFoundError,
  OrderNotFoundError,
} from 'src/modules/order/domain/errors/order.errors';

import {
  SaveOrderAccessoryPreparationAccessoryInput,
  SaveOrderAccessoryPreparationCommand,
} from './save-order-accessory-preparation.command';

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
  | DuplicateOrderItemAccessoryAssetError
  | OrderItemAccessoryAssignmentQuantityExceededError
  | OrderItemAccessoryAssetMismatchError
  | OrderItemAccessoryAssetLocationMismatchError
  | OrderItemAccessoryAssetUnavailableError
  | OrderItemAccessoryInsufficientAvailableAssetsError;

type ExistingAccessoryLine = {
  id: string;
  accessoryRentalItemId: string;
  assetAssignments: { assetId: string }[];
};

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
    const submittedPinnedAssetIds = new Set<string>();

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

        const pinnedAssetIds = accessory.assetIds ?? [];
        const autoAssignQuantity = accessory.autoAssignQuantity ?? 0;
        if (pinnedAssetIds.length + autoAssignQuantity > accessory.quantity) {
          return err(
            new OrderItemAccessoryAssignmentQuantityExceededError(accessory.accessoryRentalItemId, accessory.quantity),
          );
        }

        const linePinnedAssetIds = new Set<string>();
        for (const assetId of pinnedAssetIds) {
          if (linePinnedAssetIds.has(assetId) || submittedPinnedAssetIds.has(assetId)) {
            return err(new DuplicateOrderItemAccessoryAssetError(assetId));
          }

          linePinnedAssetIds.add(assetId);
          submittedPinnedAssetIds.add(assetId);
        }
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

    for (const item of command.items) {
      for (const accessory of item.accessories) {
        for (const assetId of accessory.assetIds ?? []) {
          const asset = await this.inventoryApi.findAssetById(command.tenantId, assetId);
          if (!asset) {
            return err(new OrderItemAccessoryAssetUnavailableError(assetId));
          }

          if (asset.productTypeId !== accessory.accessoryRentalItemId) {
            return err(new OrderItemAccessoryAssetMismatchError(assetId, accessory.accessoryRentalItemId));
          }

          if (asset.locationId !== order.locationId) {
            return err(new OrderItemAccessoryAssetLocationMismatchError(assetId));
          }
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
          assetAssignments: {
            select: { assetId: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      const existingByLineKey = new Map(
        existingAccessories.map((accessory) => [
          this.lineKey(accessory.orderItemId, accessory.accessoryRentalItemId),
          accessory,
        ]),
      );

      for (const item of command.items) {
        const requestedAccessoryIds = new Set(item.accessories.map((accessory) => accessory.accessoryRentalItemId));
        const removedAccessories = existingAccessories.filter(
          (accessory) =>
            accessory.orderItemId === item.orderItemId && !requestedAccessoryIds.has(accessory.accessoryRentalItemId),
        );

        for (const removedAccessory of removedAccessories) {
          await tx.assetAssignment.deleteMany({
            where: { orderItemAccessoryId: removedAccessory.id, type: AssignmentType.ORDER },
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

          const existingLine = existingByLineKey.get(this.lineKey(item.orderItemId, accessory.accessoryRentalItemId));
          const reconcileResult = await this.reconcileAssignments({
            command,
            orderStatus,
            orderLocationId: order.locationId,
            period,
            orderItemId: item.orderItemId,
            accessory,
            existingLine,
            orderItemAccessoryId: persistedAccessory.id,
            tx,
          });

          if (reconcileResult.isErr()) {
            return err(reconcileResult.error);
          }
        }
      }

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
    accessory: SaveOrderAccessoryPreparationAccessoryInput;
    existingLine: ExistingAccessoryLine | undefined;
    orderItemAccessoryId: string;
    tx: PrismaTransactionClient;
  }): Promise<
    Result<
      void,
      | OrderItemAccessoryAssetUnavailableError
      | OrderItemAccessoryAssignmentQuantityExceededError
      | OrderItemAccessoryInsufficientAvailableAssetsError
    >
  > {
    const existingAssetIds = params.existingLine?.assetAssignments.map((assignment) => assignment.assetId) ?? [];
    const requestedPinnedAssetIds = params.accessory.assetIds ?? null;
    const autoAssignQuantity = params.accessory.autoAssignQuantity ?? 0;
    const keepAssetIds = requestedPinnedAssetIds
      ? existingAssetIds.filter((assetId) => requestedPinnedAssetIds.includes(assetId))
      : existingAssetIds.slice(0, params.accessory.quantity);
    const pinnedAssetIdsToAssign = requestedPinnedAssetIds?.filter((assetId) => !keepAssetIds.includes(assetId)) ?? [];
    const requestedAssignmentCount = keepAssetIds.length + pinnedAssetIdsToAssign.length + autoAssignQuantity;

    if (requestedAssignmentCount > params.accessory.quantity) {
      return err(
        new OrderItemAccessoryAssignmentQuantityExceededError(params.orderItemAccessoryId, params.accessory.quantity),
      );
    }

    const releaseAssetIds = existingAssetIds.filter((assetId) => !keepAssetIds.includes(assetId));
    if (releaseAssetIds.length > 0) {
      await params.tx.assetAssignment.deleteMany({
        where: {
          orderItemAccessoryId: params.orderItemAccessoryId,
          assetId: { in: releaseAssetIds },
          type: AssignmentType.ORDER,
        },
      });
    }

    const resolvedNewAssetIds: string[] = [];
    const excludeAssetIds = [...keepAssetIds];

    for (const assetId of pinnedAssetIdsToAssign) {
      const availablePinnedIds = await this.inventoryApi.findAvailableAssetIds(
        {
          productTypeId: params.accessory.accessoryRentalItemId,
          locationId: params.orderLocationId,
          period: params.period,
          quantity: 1,
          assetId,
          excludeAssetIds,
        },
        params.tx,
      );

      if (availablePinnedIds.length === 0) {
        return err(new OrderItemAccessoryAssetUnavailableError(assetId));
      }

      resolvedNewAssetIds.push(assetId);
      excludeAssetIds.push(assetId);
    }

    if (autoAssignQuantity > 0) {
      const availableAssetIds = await this.inventoryApi.findAvailableAssetIds(
        {
          productTypeId: params.accessory.accessoryRentalItemId,
          locationId: params.orderLocationId,
          period: params.period,
          quantity: autoAssignQuantity,
          excludeAssetIds,
        },
        params.tx,
      );

      if (availableAssetIds.length < autoAssignQuantity) {
        return err(
          new OrderItemAccessoryInsufficientAvailableAssetsError(
            params.accessory.accessoryRentalItemId,
            autoAssignQuantity,
            availableAssetIds.length,
          ),
        );
      }

      resolvedNewAssetIds.push(...availableAssetIds);
    }

    for (const assetId of resolvedNewAssetIds) {
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
          orderItemId: params.orderItemId,
          orderItemAccessoryId: params.orderItemAccessoryId,
        },
        params.tx,
      );

      if (saveResult.isErr()) {
        return err(new OrderItemAccessoryAssetUnavailableError(assetId));
      }
    }

    return ok(undefined);
  }

  private lineKey(orderItemId: string, accessoryRentalItemId: string): string {
    return `${orderItemId}:${accessoryRentalItemId}`;
  }
}
