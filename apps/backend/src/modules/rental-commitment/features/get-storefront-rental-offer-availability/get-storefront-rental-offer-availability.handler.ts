import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  RentalOfferAvailabilityError,
  RentalOfferAvailabilityService,
} from '../../application/availability/rental-offer-availability.service';
import {
  GetStorefrontRentalOfferAvailabilityError,
  getStorefrontRentalOfferAvailabilityError,
} from './get-storefront-rental-offer-availability.errors';
import { GetStorefrontRentalOfferAvailabilityQuery } from './get-storefront-rental-offer-availability.query';

export interface StorefrontRentalOfferAvailabilityItemReadModel {
  rentalOfferId: string;
  availableCount: number;
}

export interface GetStorefrontRentalOfferAvailabilityReadModel {
  data: StorefrontRentalOfferAvailabilityItemReadModel[];
}

export type GetStorefrontRentalOfferAvailabilityResult = Result<
  GetStorefrontRentalOfferAvailabilityReadModel,
  GetStorefrontRentalOfferAvailabilityError
>;

@QueryHandler(GetStorefrontRentalOfferAvailabilityQuery)
export class GetStorefrontRentalOfferAvailabilityHandler implements IQueryHandler<
  GetStorefrontRentalOfferAvailabilityQuery,
  GetStorefrontRentalOfferAvailabilityResult
> {
  constructor(private readonly rentalOfferAvailability: RentalOfferAvailabilityService) {}

  async execute(query: GetStorefrontRentalOfferAvailabilityQuery): Promise<GetStorefrontRentalOfferAvailabilityResult> {
    if (query.rentalOfferIds.length === 0) {
      return ok({ data: [] });
    }

    const result = await this.rentalOfferAvailability.calculate({
      tenantId: query.tenantId,
      branchId: query.branchId,
      period: query.period,
      rentalOfferIds: query.rentalOfferIds,
      fulfillmentMethod: 'PICKUP',
    });
    if (result.isErr()) return err(this.mapCalculationError(result.error));

    return ok({
      data: result.value.map((outcome) => ({
        rentalOfferId: outcome.rentalOfferId,
        availableCount: outcome.kind === 'RESOLVED' ? outcome.availableCount : 0,
      })),
    });
  }

  private mapCalculationError(error: RentalOfferAvailabilityError): GetStorefrontRentalOfferAvailabilityError {
    switch (error.code) {
      case 'rental_commitment.tenant_unavailable':
      case 'rental_commitment.invalid_fulfillment_definition':
      case 'rental_commitment.invalid_candidate_projection':
        return getStorefrontRentalOfferAvailabilityError(error.code, error.message, error.cause);
      case 'rental_commitment.invalid_availability_selection':
        return getStorefrontRentalOfferAvailabilityError(
          'rental_commitment.invalid_fulfillment_definition',
          error.message,
          error.cause,
        );
    }
  }
}
