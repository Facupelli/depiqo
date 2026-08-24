import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { decodeAcceptedRentalPricing } from '../application/accepted-pricing/accepted-pricing-snapshot.decoder';
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
        selections: {
          where: { removedAt: null },
          select: {
            priceSnapshot: true,
          },
        },
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

    const pricing = decodeAcceptedRentalPricing(
      rental.priceSnapshot,
      rental.selections.map((selection) => selection.priceSnapshot),
    );

    if (pricing.isErr()) {
      return err(acceptedRentalPricingFactsError(pricing.error.code, pricing.error.message));
    }

    return ok(pricing.value);
  }
}
