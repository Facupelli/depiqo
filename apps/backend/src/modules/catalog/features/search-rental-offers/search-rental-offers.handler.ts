import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2RentalOfferWhereInput } from 'src/generated/prisma/models';

import { SearchRentalOffersQuery } from './search-rental-offers.query';

export interface SearchRentalOffersItemReadModel {
  id: string;
  name: string;
  kind: 'SINGLE' | 'PACKAGE' | 'KIT' | 'BUNDLE';
  image: string | null;
  description: string | null;
  requirements: Array<{
    equipmentTypeId: string;
    quantityPerItem: number;
  }>;
}

export interface SearchRentalOffersResult {
  data: SearchRentalOffersItemReadModel[];
  total: number;
  page: number;
  pageSize: number;
}

@QueryHandler(SearchRentalOffersQuery)
export class SearchRentalOffersHandler implements IQueryHandler<SearchRentalOffersQuery, SearchRentalOffersResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: SearchRentalOffersQuery): Promise<SearchRentalOffersResult> {
    const where: V2RentalOfferWhereInput = {
      tenantId: query.tenantId,
      branchId: query.branchId,
      isRentable: true,
      rentableItem: {
        status: 'ACTIVE',
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

    return {
      data: offers.map((offer) => ({
        id: offer.id,
        name: offer.rentableItem.name,
        kind: offer.rentableItem.kind,
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
