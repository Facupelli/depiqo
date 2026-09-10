import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import {
  CatalogRentalOfferReferenceAuthority,
  CatalogRentalOfferReferenceAuthorityError,
  ValidateCatalogRentalOfferReferenceInput,
} from './catalog-rental-offer-reference-authority.public-api';

@Injectable()
export class CatalogRentalOfferReferenceAuthorityService extends CatalogRentalOfferReferenceAuthority {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  async validateRentalOfferReference(
    input: ValidateCatalogRentalOfferReferenceInput,
  ): Promise<Result<void, CatalogRentalOfferReferenceAuthorityError>> {
    return this.unitOfWork.runInTransaction(async ({ tx }) => {
      const rentalOffer = await tx.v2RentalOffer.findFirst({
        where: { id: input.rentalOfferId, tenantId: input.tenantId },
        select: { id: true },
      });

      if (!rentalOffer) {
        return err(
          new CatalogRentalOfferReferenceAuthorityError('The requested rental offer was not found.', {
            rentalOfferId: input.rentalOfferId,
          }),
        );
      }

      return ok(undefined);
    });
  }
}
