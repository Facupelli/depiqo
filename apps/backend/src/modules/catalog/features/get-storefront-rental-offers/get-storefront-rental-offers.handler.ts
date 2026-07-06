import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetStorefrontRentalOffersQuery } from './get-storefront-rental-offers.query';
import { V2RentalOfferWhereInput } from 'src/generated/prisma/models';

export interface GetStorefrontRentalOffersItemReadModel {
  id: string;
  name: string;
  image: string | null;
  description: string | null;
  requirements: Array<{
    equipmentTypeId: string;
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
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStorefrontRentalOffersQuery): Promise<GetStorefrontRentalOffersResult> {
    const where: V2RentalOfferWhereInput = {
      tenantId: query.tenantId,
      branchId: query.branchId,
      isRentable: true,
      isVisible: true,
      deletedAt: null,
      rentableItem: {
        deletedAt: null,
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
          rentableItem: {
            select: {
              name: true,
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

    return {
      data: offers.map((offer) => ({
        id: offer.id,
        name: offer.rentableItem.name,
        image: offer.rentableItem.imageUrl,
        description: offer.rentableItem.description,
        requirements: offer.rentableItem.requirements.map((requirement) => ({
          equipmentTypeId: requirement.equipmentTypeId,
          quantityPerItem: requirement.quantityPerItem,
        })),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
