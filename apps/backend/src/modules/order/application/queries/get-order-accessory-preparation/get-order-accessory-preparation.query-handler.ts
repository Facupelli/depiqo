import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { OrderItemType } from '@repo/types';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  AvailableAssetCountReadModel,
  GetAvailableAssetCountsQuery,
} from 'src/modules/inventory/public/queries/get-available-asset-counts.query';
import { OrderNotFoundException } from 'src/modules/order/domain/exceptions/order.exceptions';

import { GetOrderAccessoryPreparationQuery } from './get-order-accessory-preparation.query';
import { GetOrderAccessoryPreparationResponse } from './get-order-accessory-preparation.response.dto';

@QueryHandler(GetOrderAccessoryPreparationQuery)
export class GetOrderAccessoryPreparationQueryHandler implements IQueryHandler<
  GetOrderAccessoryPreparationQuery,
  GetOrderAccessoryPreparationResponse
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: GetOrderAccessoryPreparationQuery): Promise<GetOrderAccessoryPreparationResponse> {
    const order = await this.prisma.client.order.findFirst({
      where: { id: query.orderId, tenantId: query.tenantId },
      select: {
        id: true,
        locationId: true,
        periodStart: true,
        periodEnd: true,
        accessorySavedAt: true,
        items: {
          where: { type: OrderItemType.PRODUCT },
          select: {
            id: true,
            productTypeId: true,
            productType: { select: { name: true } },
            assetAssignments: {
              select: {
                asset: {
                  select: {
                    id: true,
                    serialNumber: true,
                    ownerId: true,
                    owner: { select: { name: true } },
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
            accessories: {
              select: {
                id: true,
                accessoryRentalItemId: true,
                quantity: true,
                notes: true,
                assetAssignments: {
                  select: {
                    asset: {
                      select: {
                        id: true,
                        serialNumber: true,
                        ownerId: true,
                        owner: { select: { name: true } },
                      },
                    },
                  },
                  orderBy: { createdAt: 'asc' },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new OrderNotFoundException(query.orderId);
    }

    const productTypeIds = order.items.map((item) => item.productTypeId).filter((id): id is string => Boolean(id));
    const accessoryLinks = await this.prisma.client.accessoryLink.findMany({
      where: {
        tenantId: query.tenantId,
        primaryRentalItemId: { in: productTypeIds },
      },
      select: {
        primaryRentalItemId: true,
        accessoryRentalItemId: true,
        isDefaultIncluded: true,
        defaultQuantity: true,
        notes: true,
        accessoryRentalItem: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const accessoryRentalItemIds = [...new Set(accessoryLinks.map((link) => link.accessoryRentalItemId))];
    const availableCounts = await this.queryBus.execute<GetAvailableAssetCountsQuery, AvailableAssetCountReadModel[]>(
      new GetAvailableAssetCountsQuery(order.locationId, order.periodStart, order.periodEnd, accessoryRentalItemIds),
    );
    const availableCountByRentalItemId = new Map(
      availableCounts.map((count) => [count.productTypeId, count.availableCount]),
    );

    type AccessoryLinkReadModel = (typeof accessoryLinks)[number];
    const linksByPrimaryRentalItemId = new Map<string, AccessoryLinkReadModel[]>();
    for (const link of accessoryLinks) {
      const existing = linksByPrimaryRentalItemId.get(link.primaryRentalItemId) ?? [];
      existing.push(link);
      linksByPrimaryRentalItemId.set(link.primaryRentalItemId, existing);
    }

    return {
      orderId: order.id,
      locationId: order.locationId,
      periodStart: order.periodStart.toISOString(),
      periodEnd: order.periodEnd.toISOString(),
      hasSavedAccessory: order.accessorySavedAt !== null,
      items: order.items.map((item) => {
        if (!item.productTypeId || !item.productType) {
          throw new Error(`Product order item "${item.id}" is missing product type data.`);
        }

        const selectedLineByAccessoryRentalItemId = new Map(
          item.accessories.map((accessory) => [accessory.accessoryRentalItemId, accessory]),
        );

        return {
          orderItemId: item.id,
          productTypeId: item.productTypeId,
          productTypeName: item.productType.name,
          assignedPrimaryAssets: item.assetAssignments.map((assignment) => ({
            id: assignment.asset.id,
            serialNumber: assignment.asset.serialNumber,
            ownerId: assignment.asset.ownerId,
            ownerName: assignment.asset.owner?.name ?? null,
          })),
          compatibleAccessories: (linksByPrimaryRentalItemId.get(item.productTypeId) ?? []).map((link) => {
            const selectedLine = selectedLineByAccessoryRentalItemId.get(link.accessoryRentalItemId) ?? null;
            const assignedAssets =
              selectedLine?.assetAssignments.map((assignment) => ({
                id: assignment.asset.id,
                serialNumber: assignment.asset.serialNumber,
                ownerId: assignment.asset.ownerId,
                ownerName: assignment.asset.owner?.name ?? null,
              })) ?? [];

            return {
              accessoryRentalItemId: link.accessoryRentalItemId,
              name: link.accessoryRentalItem.name,
              isDefaultIncluded: link.isDefaultIncluded,
              defaultQuantity: link.defaultQuantity,
              defaultNotes: link.notes,
              selectedLine: selectedLine
                ? {
                    id: selectedLine.id,
                    quantity: selectedLine.quantity,
                    notes: selectedLine.notes,
                    assignedAssets,
                  }
                : null,
              suggestedQuantity: selectedLine ? null : link.isDefaultIncluded ? link.defaultQuantity : null,
              suggestedNotes: selectedLine ? null : link.isDefaultIncluded ? link.notes : null,
              availableCount:
                (availableCountByRentalItemId.get(link.accessoryRentalItemId) ?? 0) + assignedAssets.length,
            };
          }),
        };
      }),
    };
  }
}
