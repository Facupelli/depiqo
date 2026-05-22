import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RentalItemKind } from '@repo/types';
import { Result, err, ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  AccessoryLinkDefaultQuantityExceedsAssetCountError,
  AccessoryLinkAccessoryMustBeAccessoryError,
  AccessoryLinkCrossTenantError,
  AccessoryLinkPrimaryMustBePrimaryError,
  DuplicateAccessoryLinkError,
  InvalidAccessoryLinkDefaultQuantityError,
  ProductTypeNotFoundError,
} from 'src/modules/catalog/domain/errors/catalog.errors';

import { ReplaceProductTypeAccessoryLinksCommand } from './replace-product-type-accessory-links.command';

type ReplaceProductTypeAccessoryLinksResult = Result<
  void,
  | ProductTypeNotFoundError
  | AccessoryLinkPrimaryMustBePrimaryError
  | AccessoryLinkAccessoryMustBeAccessoryError
  | AccessoryLinkCrossTenantError
  | InvalidAccessoryLinkDefaultQuantityError
  | AccessoryLinkDefaultQuantityExceedsAssetCountError
  | DuplicateAccessoryLinkError
>;

@CommandHandler(ReplaceProductTypeAccessoryLinksCommand)
export class ReplaceProductTypeAccessoryLinksService implements ICommandHandler<
  ReplaceProductTypeAccessoryLinksCommand,
  ReplaceProductTypeAccessoryLinksResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ReplaceProductTypeAccessoryLinksCommand): Promise<ReplaceProductTypeAccessoryLinksResult> {
    const primaryRentalItem = await this.prisma.client.productType.findUnique({
      where: { id: command.primaryRentalItemId },
      select: { id: true, tenantId: true, kind: true },
    });

    if (!primaryRentalItem || primaryRentalItem.tenantId !== command.tenantId) {
      return err(new ProductTypeNotFoundError(command.primaryRentalItemId));
    }

    if (primaryRentalItem.kind !== RentalItemKind.PRIMARY) {
      return err(new AccessoryLinkPrimaryMustBePrimaryError(primaryRentalItem.id));
    }

    const seenAccessoryIds = new Set<string>();
    for (const accessoryLink of command.accessoryLinks) {
      if (accessoryLink.defaultQuantity <= 0) {
        return err(new InvalidAccessoryLinkDefaultQuantityError());
      }

      if (seenAccessoryIds.has(accessoryLink.accessoryRentalItemId)) {
        return err(new DuplicateAccessoryLinkError(accessoryLink.accessoryRentalItemId));
      }

      seenAccessoryIds.add(accessoryLink.accessoryRentalItemId);
    }

    const accessoryRentalItems = await this.prisma.client.productType.findMany({
      where: { id: { in: [...seenAccessoryIds] } },
      select: {
        id: true,
        tenantId: true,
        kind: true,
        _count: {
          select: {
            assets: {
              where: { isActive: true, deletedAt: null },
            },
          },
        },
      },
    });

    const accessoryRentalItemsById = new Map(accessoryRentalItems.map((item) => [item.id, item]));

    for (const accessoryLink of command.accessoryLinks) {
      const accessoryRentalItem = accessoryRentalItemsById.get(accessoryLink.accessoryRentalItemId);

      if (!accessoryRentalItem) {
        return err(new ProductTypeNotFoundError(accessoryLink.accessoryRentalItemId));
      }

      if (accessoryRentalItem.tenantId !== command.tenantId) {
        return err(new AccessoryLinkCrossTenantError(accessoryRentalItem.id));
      }

      if (accessoryRentalItem.kind !== RentalItemKind.ACCESSORY) {
        return err(new AccessoryLinkAccessoryMustBeAccessoryError(accessoryRentalItem.id));
      }

      if (accessoryLink.defaultQuantity > accessoryRentalItem._count.assets) {
        return err(
          new AccessoryLinkDefaultQuantityExceedsAssetCountError(
            accessoryRentalItem.id,
            accessoryLink.defaultQuantity,
            accessoryRentalItem._count.assets,
          ),
        );
      }
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.accessoryLink.deleteMany({
        where: {
          tenantId: command.tenantId,
          primaryRentalItemId: command.primaryRentalItemId,
        },
      });

      if (command.accessoryLinks.length === 0) {
        return;
      }

      await tx.accessoryLink.createMany({
        data: command.accessoryLinks.map((accessoryLink) => ({
          tenantId: command.tenantId,
          primaryRentalItemId: command.primaryRentalItemId,
          accessoryRentalItemId: accessoryLink.accessoryRentalItemId,
          isDefaultIncluded: accessoryLink.isDefaultIncluded,
          defaultQuantity: accessoryLink.defaultQuantity,
          notes: accessoryLink.notes,
        })),
      });
    });

    return ok(undefined);
  }
}
