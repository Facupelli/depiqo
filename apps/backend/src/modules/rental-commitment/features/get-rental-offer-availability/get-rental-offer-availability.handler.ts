import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  RentalOfferAvailabilityError,
  RentalOfferAvailabilityOutcome,
  RentalOfferAvailabilityService,
} from '../../application/availability/rental-offer-availability.service';
import {
  GetRentalOfferAvailabilityError,
  getRentalOfferAvailabilityError,
} from './get-rental-offer-availability.errors';
import { GetRentalOfferAvailabilityQuery } from './get-rental-offer-availability.query';

export interface RentalOfferAvailabilityItemReadModel {
  rentalOfferId: string;
  availableCount: number;
}

export type GetRentalOfferAvailabilityReadModel = RentalOfferAvailabilityItemReadModel[];

export type GetRentalOfferAvailabilityResult = Result<
  GetRentalOfferAvailabilityReadModel,
  GetRentalOfferAvailabilityError
>;

@QueryHandler(GetRentalOfferAvailabilityQuery)
export class GetRentalOfferAvailabilityHandler implements IQueryHandler<
  GetRentalOfferAvailabilityQuery,
  GetRentalOfferAvailabilityResult
> {
  constructor(private readonly rentalOfferAvailability: RentalOfferAvailabilityService) {}

  async execute(query: GetRentalOfferAvailabilityQuery): Promise<GetRentalOfferAvailabilityResult> {
    const result = await this.rentalOfferAvailability.calculate({
      tenantId: query.tenantId,
      branchId: query.branchId,
      period: query.period,
      rentalOfferIds: query.rentalOfferIds,
      fulfillmentMethod: 'PICKUP',
    });
    if (result.isErr()) return err(this.mapCalculationError(result.error));

    const unavailable = result.value.find(
      (outcome): outcome is Extract<RentalOfferAvailabilityOutcome, { kind: 'CATALOG_UNAVAILABLE' }> =>
        outcome.kind === 'CATALOG_UNAVAILABLE',
    );
    if (unavailable) return err(this.mapUnavailable(unavailable));

    return ok(
      result.value.map((outcome) => {
        if (outcome.kind !== 'RESOLVED') {
          throw new Error(`Unexpected unavailable rental offer "${outcome.rentalOfferId}".`);
        }
        return { rentalOfferId: outcome.rentalOfferId, availableCount: outcome.availableCount };
      }),
    );
  }

  private mapUnavailable(
    outcome: Extract<RentalOfferAvailabilityOutcome, { kind: 'CATALOG_UNAVAILABLE' }>,
  ): GetRentalOfferAvailabilityError {
    switch (outcome.reason) {
      case 'RENTAL_OFFER_NOT_FOUND':
        return getRentalOfferAvailabilityError(
          'rental_commitment.rental_offer_not_found',
          `Rental offer "${outcome.rentalOfferId}" was not found.`,
        );
      case 'RENTAL_OFFER_NOT_RENTABLE':
        return getRentalOfferAvailabilityError(
          'rental_commitment.rental_offer_not_rentable',
          `Rental offer "${outcome.rentalOfferId}" is not rentable.`,
        );
      case 'RENTABLE_ITEM_NOT_ACTIVE':
        return getRentalOfferAvailabilityError(
          'rental_commitment.rentable_item_not_active',
          `Rentable item "${outcome.rentableItemId}" is not active.`,
        );
    }
  }

  private mapCalculationError(error: RentalOfferAvailabilityError): GetRentalOfferAvailabilityError {
    switch (error.code) {
      case 'rental_commitment.tenant_unavailable':
      case 'rental_commitment.invalid_fulfillment_definition':
      case 'rental_commitment.invalid_candidate_projection':
        return getRentalOfferAvailabilityError(error.code, error.message, error.cause);
      case 'rental_commitment.invalid_availability_selection':
        return getRentalOfferAvailabilityError(
          'rental_commitment.invalid_fulfillment_definition',
          error.message,
          error.cause,
        );
    }
  }
}
