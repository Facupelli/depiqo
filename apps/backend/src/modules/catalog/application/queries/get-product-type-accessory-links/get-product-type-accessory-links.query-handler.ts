import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RentalItemKind, TrackingMode } from '@repo/types';
import { Result, err, ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  AccessoryLinkPrimaryMustBePrimaryError,
  ProductTypeNotFoundError,
} from 'src/modules/catalog/domain/errors/catalog.errors';

import { GetProductTypeAccessoryLinksQuery } from './get-product-type-accessory-links.query';

type AccessoryLinkReadModel = {
  id: string;
  primaryRentalItemId: string;
  accessoryRentalItemId: string;
  isDefaultIncluded: boolean;
  defaultQuantity: number;
  notes: string | null;
  accessoryRentalItem: {
    id: string;
    name: string;
    imageUrl: string;
    trackingMode: TrackingMode;
    retiredAt: Date | null;
  };
};

type GetProductTypeAccessoryLinksResult = Result<
  AccessoryLinkReadModel[],
  ProductTypeNotFoundError | AccessoryLinkPrimaryMustBePrimaryError
>;

@QueryHandler(GetProductTypeAccessoryLinksQuery)
export class GetProductTypeAccessoryLinksQueryHandler implements IQueryHandler<
  GetProductTypeAccessoryLinksQuery,
  GetProductTypeAccessoryLinksResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductTypeAccessoryLinksQuery): Promise<GetProductTypeAccessoryLinksResult> {
    const primaryRentalItem = await this.prisma.client.productType.findFirst({
      where: { id: query.primaryRentalItemId, tenantId: query.tenantId },
      select: { id: true, kind: true },
    });

    if (!primaryRentalItem) {
      return err(new ProductTypeNotFoundError(query.primaryRentalItemId));
    }

    if (primaryRentalItem.kind !== RentalItemKind.PRIMARY) {
      return err(new AccessoryLinkPrimaryMustBePrimaryError(primaryRentalItem.id));
    }

    const accessoryLinks = await this.prisma.client.accessoryLink.findMany({
      where: {
        tenantId: query.tenantId,
        primaryRentalItemId: query.primaryRentalItemId,
        accessoryRentalItem: {
          kind: RentalItemKind.ACCESSORY,
          deletedAt: null,
          retiredAt: null,
        },
      },
      include: {
        accessoryRentalItem: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            trackingMode: true,
            retiredAt: true,
          },
        },
      },
      orderBy: { accessoryRentalItem: { name: 'asc' } },
    });

    return ok(
      accessoryLinks.map((accessoryLink) => ({
        id: accessoryLink.id,
        primaryRentalItemId: accessoryLink.primaryRentalItemId,
        accessoryRentalItemId: accessoryLink.accessoryRentalItemId,
        isDefaultIncluded: accessoryLink.isDefaultIncluded,
        defaultQuantity: accessoryLink.defaultQuantity,
        notes: accessoryLink.notes,
        accessoryRentalItem: {
          id: accessoryLink.accessoryRentalItem.id,
          name: accessoryLink.accessoryRentalItem.name,
          imageUrl: accessoryLink.accessoryRentalItem.imageUrl ?? '',
          trackingMode: accessoryLink.accessoryRentalItem.trackingMode as TrackingMode,
          retiredAt: accessoryLink.accessoryRentalItem.retiredAt,
        },
      })),
    );
  }
}
