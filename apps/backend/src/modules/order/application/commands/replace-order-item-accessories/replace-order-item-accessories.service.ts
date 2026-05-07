import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderItemType, OrderStatus, RentalItemKind } from '@repo/types';
import { Result, err, ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  DuplicateOrderItemAccessoryError,
  InvalidOrderItemAccessoryQuantityError,
  OrderAccessorySelectionItemNotFoundError,
  OrderAccessorySelectionNotAllowedError,
  OrderAccessorySelectionRequiresProductItemError,
  OrderItemAccessoryIncompatibleError,
  OrderItemAccessoryMustBeAccessoryError,
  OrderItemAccessoryRentalItemNotFoundError,
  OrderNotFoundError,
} from 'src/modules/order/domain/errors/order.errors';

import { ReplaceOrderItemAccessoriesCommand } from './replace-order-item-accessories.command';

const EDITABLE_ACCESSORY_SELECTION_STATUSES = new Set<OrderStatus>([
  OrderStatus.DRAFT,
  OrderStatus.PENDING_REVIEW,
  OrderStatus.CONFIRMED,
]);

type ReplaceOrderItemAccessoriesError =
  | OrderNotFoundError
  | OrderAccessorySelectionNotAllowedError
  | OrderAccessorySelectionItemNotFoundError
  | OrderAccessorySelectionRequiresProductItemError
  | InvalidOrderItemAccessoryQuantityError
  | DuplicateOrderItemAccessoryError
  | OrderItemAccessoryRentalItemNotFoundError
  | OrderItemAccessoryMustBeAccessoryError
  | OrderItemAccessoryIncompatibleError;

@CommandHandler(ReplaceOrderItemAccessoriesCommand)
export class ReplaceOrderItemAccessoriesService implements ICommandHandler<
  ReplaceOrderItemAccessoriesCommand,
  Result<void, ReplaceOrderItemAccessoriesError>
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ReplaceOrderItemAccessoriesCommand): Promise<Result<void, ReplaceOrderItemAccessoriesError>> {
    const order = await this.prisma.client.order.findFirst({
      where: { id: command.orderId, tenantId: command.tenantId },
      select: { id: true, status: true },
    });

    if (!order) {
      return err(new OrderNotFoundError(command.orderId));
    }

    const orderStatus = order.status as OrderStatus;
    if (!EDITABLE_ACCESSORY_SELECTION_STATUSES.has(orderStatus)) {
      return err(new OrderAccessorySelectionNotAllowedError(orderStatus));
    }

    const orderItem = await this.prisma.client.orderItem.findFirst({
      where: { id: command.orderItemId, orderId: command.orderId },
      select: { id: true, type: true, productTypeId: true },
    });

    if (!orderItem) {
      return err(new OrderAccessorySelectionItemNotFoundError(command.orderItemId));
    }

    if (orderItem.type !== OrderItemType.PRODUCT || !orderItem.productTypeId) {
      return err(new OrderAccessorySelectionRequiresProductItemError(command.orderItemId));
    }

    const seenAccessoryIds = new Set<string>();
    for (const accessory of command.accessories) {
      if (accessory.quantity <= 0) {
        return err(new InvalidOrderItemAccessoryQuantityError());
      }

      if (seenAccessoryIds.has(accessory.accessoryRentalItemId)) {
        return err(new DuplicateOrderItemAccessoryError(accessory.accessoryRentalItemId));
      }

      seenAccessoryIds.add(accessory.accessoryRentalItemId);
    }

    const accessoryIds = [...seenAccessoryIds];
    const accessoryRentalItems = await this.prisma.client.productType.findMany({
      where: { id: { in: accessoryIds } },
      select: { id: true, tenantId: true, kind: true },
    });
    const accessoryRentalItemsById = new Map(accessoryRentalItems.map((item) => [item.id, item]));

    for (const accessory of command.accessories) {
      const accessoryRentalItem = accessoryRentalItemsById.get(accessory.accessoryRentalItemId);

      if (!accessoryRentalItem || accessoryRentalItem.tenantId !== command.tenantId) {
        return err(new OrderItemAccessoryRentalItemNotFoundError(accessory.accessoryRentalItemId));
      }

      if (accessoryRentalItem.kind !== RentalItemKind.ACCESSORY) {
        return err(new OrderItemAccessoryMustBeAccessoryError(accessory.accessoryRentalItemId));
      }
    }

    const compatibleLinks = await this.prisma.client.accessoryLink.findMany({
      where: {
        tenantId: command.tenantId,
        primaryRentalItemId: orderItem.productTypeId,
        accessoryRentalItemId: { in: accessoryIds },
      },
      select: { accessoryRentalItemId: true },
    });
    const compatibleAccessoryIds = new Set(compatibleLinks.map((link) => link.accessoryRentalItemId));

    for (const accessory of command.accessories) {
      if (!compatibleAccessoryIds.has(accessory.accessoryRentalItemId)) {
        return err(new OrderItemAccessoryIncompatibleError(accessory.accessoryRentalItemId, orderItem.productTypeId));
      }
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.orderItemAccessory.deleteMany({
        where: {
          tenantId: command.tenantId,
          orderId: command.orderId,
          orderItemId: command.orderItemId,
          accessoryRentalItemId: { notIn: accessoryIds },
        },
      });

      for (const accessory of command.accessories) {
        await tx.orderItemAccessory.upsert({
          where: {
            orderItemId_accessoryRentalItemId: {
              orderItemId: command.orderItemId,
              accessoryRentalItemId: accessory.accessoryRentalItemId,
            },
          },
          create: {
            tenantId: command.tenantId,
            orderId: command.orderId,
            orderItemId: command.orderItemId,
            accessoryRentalItemId: accessory.accessoryRentalItemId,
            quantity: accessory.quantity,
            notes: accessory.notes,
          },
          update: {
            quantity: accessory.quantity,
            notes: accessory.notes,
          },
        });
      }
    });

    return ok(undefined);
  }
}
