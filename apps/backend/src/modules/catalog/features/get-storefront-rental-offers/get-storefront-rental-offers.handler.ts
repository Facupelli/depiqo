import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { AssetInventoryPublicApi } from 'src/modules/asset-inventory/public-api/asset-inventory.public-api';

import { GetStorefrontRentalOffersQuery } from './get-storefront-rental-offers.query';
import { V2RentalOfferWhereInput } from 'src/generated/prisma/models';

export interface GetStorefrontRentalOffersItemReadModel {
  id: string;
  name: string;
  image: string | null;
  description: string | null;
  isRentable: boolean;
  requirements: Array<{
    equipmentTypeId: string;
    quantityPerItem: number;
  }>;
  packageComposition?: Array<{
    equipmentTypeId: string;
    equipmentTypeName: string;
    category: { id: string; name: string } | null;
    quantityPerItem: number;
  }>;
}

export interface GetStorefrontRentalOffersResult {
  data: GetStorefrontRentalOffersItemReadModel[];
  total: number;
  page: number;
  pageSize: number;
}

@QueryHandler(GetStorefrontRentalOffersQuery)
export class GetStorefrontRentalOffersHandler implements IQueryHandler<
  GetStorefrontRentalOffersQuery,
  GetStorefrontRentalOffersResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetInventoryApi: AssetInventoryPublicApi,
  ) {}

  async execute(query: GetStorefrontRentalOffersQuery): Promise<GetStorefrontRentalOffersResult> {
    const where: V2RentalOfferWhereInput = {
      tenantId: query.tenantId,
      branchId: query.branchId,
      isVisible: true,
      rentableItem: {
        status: 'ACTIVE',
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
      },
    };

    const [offers, total] = await this.prisma.client.$transaction([
      this.prisma.client.v2RentalOffer.findMany({
        where,
        select: {
          id: true,
          isRentable: true,
          rentableItem: {
            select: {
              name: true,
              kind: true,
              imageUrl: true,
              description: true,
              requirements: {
                select: {
                  equipmentTypeId: true,
                  quantityPerItem: true,
                },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.client.v2RentalOffer.count({ where }),
    ]);

    const equipmentTypes = await this.assetInventoryApi.getEquipmentTypeDisplayFacts({
      tenantId: query.tenantId,
      equipmentTypeIds: offers.flatMap((offer) =>
        offer.rentableItem.kind === 'PACKAGE'
          ? offer.rentableItem.requirements.map((requirement) => requirement.equipmentTypeId)
          : [],
      ),
    });
    const equipmentTypesById = new Map(
      equipmentTypes.map((equipmentType) => [equipmentType.equipmentTypeId, equipmentType]),
    );

    return {
      data: offers.map((offer) => {
        const requirements = offer.rentableItem.requirements.map((requirement) => ({
          equipmentTypeId: requirement.equipmentTypeId,
          quantityPerItem: requirement.quantityPerItem,
        }));
        const packageComposition =
          offer.rentableItem.kind === 'PACKAGE'
            ? requirements.flatMap((requirement) => {
                const equipmentType = equipmentTypesById.get(requirement.equipmentTypeId);
                return equipmentType
                  ? [
                      {
                        ...requirement,
                        equipmentTypeName: equipmentType.name,
                        category: equipmentType.category,
                      },
                    ]
                  : [];
              })
            : undefined;

        return {
          id: offer.id,
          name: offer.rentableItem.name,
          image: offer.rentableItem.imageUrl,
          description: offer.rentableItem.description,
          isRentable: offer.isRentable,
          requirements,
          ...(packageComposition && packageComposition.length === requirements.length
            ? { packageComposition: packageComposition.sort(comparePackageComposition) }
            : {}),
        };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}

function comparePackageComposition(
  left: NonNullable<GetStorefrontRentalOffersItemReadModel['packageComposition']>[number],
  right: NonNullable<GetStorefrontRentalOffersItemReadModel['packageComposition']>[number],
): number {
  return (
    (left.category?.name ?? '\uffff').localeCompare(right.category?.name ?? '\uffff') ||
    (left.category?.id ?? '\uffff').localeCompare(right.category?.id ?? '\uffff') ||
    left.equipmentTypeName.localeCompare(right.equipmentTypeName) ||
    left.equipmentTypeId.localeCompare(right.equipmentTypeId)
  );
}
