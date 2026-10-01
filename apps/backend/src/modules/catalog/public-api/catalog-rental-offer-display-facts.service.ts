import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  CatalogRentalOfferDisplayFact,
  CatalogRentalOfferDisplayFacts,
  GetCatalogRentalOfferDisplayFactsInput,
} from './catalog-rental-offer-display-facts.public-api';

@Injectable()
export class CatalogRentalOfferDisplayFactsService extends CatalogRentalOfferDisplayFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getByIds(input: GetCatalogRentalOfferDisplayFactsInput): Promise<CatalogRentalOfferDisplayFact[]> {
    if (input.rentalOfferIds.length === 0) return [];

    const offers = await this.prisma.client.v2RentalOffer.findMany({
      where: { tenantId: input.tenantId, id: { in: input.rentalOfferIds } },
      select: {
        id: true,
        branchId: true,
        rentableItemId: true,
        showInStore: true,
        isRentable: true,
        rentableItem: { select: { name: true } },
      },
    });

    return offers.map((offer) => ({
      id: offer.id,
      branchId: offer.branchId,
      rentableItemId: offer.rentableItemId,
      rentableItemName: offer.rentableItem.name,
      showInStore: offer.showInStore,
      isRentable: offer.isRentable,
    }));
  }
}
