import { Prisma, V2RentalOffer } from 'src/generated/prisma/client';

import { RentalOffer, UpdateRentalOfferSettingsProps } from '../../domain/rental-offer.entity';

export class RentalOfferMapper {
  static toDomain(record: V2RentalOffer): RentalOffer {
    return RentalOffer.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      branchId: record.branchId,
      rentableItemId: record.rentableItemId,
      showInStore: record.showInStore,
      isRentable: record.isRentable,
      firstPublishedAt: record.firstPublishedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toCreateData(rentalOffer: RentalOffer): Prisma.V2RentalOfferUncheckedCreateInput {
    return {
      id: rentalOffer.id,
      tenantId: rentalOffer.tenantId,
      branchId: rentalOffer.branchId,
      rentableItemId: rentalOffer.rentableItemId,
      showInStore: rentalOffer.showInStore,
      isRentable: rentalOffer.isRentable,
      firstPublishedAt: rentalOffer.firstPublishedAt,
    };
  }

  static toCreateManyData(rentalOffer: RentalOffer): Prisma.V2RentalOfferCreateManyInput {
    return this.toCreateData(rentalOffer);
  }

  static toUpdateData(rentalOffer: RentalOffer): Prisma.V2RentalOfferUpdateInput {
    return {
      showInStore: rentalOffer.showInStore,
      isRentable: rentalOffer.isRentable,
    };
  }

  static toSettingsUpdateData(
    rentalOffer: RentalOffer,
    supplied: UpdateRentalOfferSettingsProps,
    firstPublishedAt: Date | null,
  ): Prisma.V2RentalOfferUpdateManyMutationInput {
    return {
      ...(supplied.showInStore !== undefined && { showInStore: rentalOffer.showInStore }),
      ...(supplied.isRentable !== undefined && { isRentable: rentalOffer.isRentable }),
      ...(firstPublishedAt !== null && { firstPublishedAt }),
    };
  }
}
