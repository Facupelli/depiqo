import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { toAcceptedRentalPricingFacts } from '../application/accepted-pricing/accepted-pricing-snapshot.projections';
import { ConfirmedPriceSnapshot } from '../domain/value-objects/confirmed-price-snapshot.value-object';
import {
  AcceptedRentalPricing,
  AcceptedRentalPricingFacts,
  AcceptedRentalPricingFactsError,
  GetAcceptedRentalPricingFactsInput,
} from './accepted-rental-pricing-facts.public-api';

function acceptedRentalPricingFactsError(
  code: AcceptedRentalPricingFactsError['code'],
  message: string,
): AcceptedRentalPricingFactsError {
  return { code, message };
}

@Injectable()
export class AcceptedRentalPricingFactsService extends AcceptedRentalPricingFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getAcceptedRentalPricingFacts(
    input: GetAcceptedRentalPricingFactsInput,
  ): Promise<Result<AcceptedRentalPricing, AcceptedRentalPricingFactsError>> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: input.rentalId,
        tenantId: input.tenantId,
      },
      select: {
        priceSnapshot: true,
        acceptedCustomerTotal: true,
      },
    });

    if (!rental) {
      return err(
        acceptedRentalPricingFactsError(
          'RentalNotFound',
          `Rental "${input.rentalId}" was not found for tenant "${input.tenantId}".`,
        ),
      );
    }

    const snapshot = ConfirmedPriceSnapshot.create(rental.priceSnapshot);
    if (snapshot.isErr()) {
      return err(acceptedRentalPricingFactsError('AcceptedPricingSnapshotInvalid', snapshot.error.message));
    }

    return ok({
      ...toAcceptedRentalPricingFacts(snapshot.value.snapshot),
      acceptedCustomerTotal: rental.acceptedCustomerTotal?.toString() ?? null,
    });
  }
}
