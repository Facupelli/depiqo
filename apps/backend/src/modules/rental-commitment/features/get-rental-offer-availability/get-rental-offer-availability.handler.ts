import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  CatalogPublicApi,
  ResolveRentalOffersForAvailabilityError,
} from 'src/modules/catalog/public-api/catalog.public-api';

import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
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
  constructor(
    private readonly catalogApi: CatalogPublicApi,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
  ) {}

  async execute(query: GetRentalOfferAvailabilityQuery): Promise<GetRentalOfferAvailabilityResult> {
    const resolved = await this.catalogApi.resolveRentalOffersForAvailability({
      tenantId: query.tenantId,
      branchId: query.branchId,
      rentalOfferIds: [...query.rentalOfferIds],
    });
    if (resolved.isErr()) return err(this.mapCatalogError(resolved.error));

    const equipmentTypeIds = [
      ...new Set(
        resolved.value.resolvedOffers.flatMap((offer) =>
          offer.fulfillmentRequirements.map((requirement) => requirement.equipmentTypeId as EquipmentTypeId),
        ),
      ),
    ];

    const candidates = await this.rentalAssetAllocation.findEligibleAvailableCandidates({
      tenantId: query.tenantId,
      branchId: query.branchId,
      equipmentTypeIds,
      periodStart: query.period.start,
      periodEnd: query.period.end,
    });
    if (candidates.isErr()) {
      return err(
        getRentalOfferAvailabilityError(
          'rental_commitment.invalid_candidate_projection',
          candidates.error.message,
          candidates.error,
        ),
      );
    }

    const availableCounts = new Map<string, number>();
    for (const candidate of candidates.value) {
      availableCounts.set(candidate.equipmentTypeId, (availableCounts.get(candidate.equipmentTypeId) ?? 0) + 1);
    }

    return ok(
      resolved.value.resolvedOffers.map((offer) => ({
        rentalOfferId: offer.rentalOfferId,
        availableCount: this.calculateAvailableCount(offer.fulfillmentRequirements, availableCounts),
      })),
    );
  }

  private calculateAvailableCount(
    requirements: readonly { equipmentTypeId: string; quantityPerItem: number }[],
    availableCounts: ReadonlyMap<string, number>,
  ): number {
    return Math.min(
      ...requirements.map((requirement) =>
        Math.floor((availableCounts.get(requirement.equipmentTypeId) ?? 0) / requirement.quantityPerItem),
      ),
    );
  }

  private mapCatalogError(error: ResolveRentalOffersForAvailabilityError): GetRentalOfferAvailabilityError {
    const codeByCatalogError = {
      RentalOfferNotFound: 'rental_commitment.rental_offer_not_found',
      RentalOfferNotRentable: 'rental_commitment.rental_offer_not_rentable',
      RentableItemNotActive: 'rental_commitment.rentable_item_not_active',
      InvalidFulfillmentDefinition: 'rental_commitment.invalid_fulfillment_definition',
    } as const;

    return getRentalOfferAvailabilityError(codeByCatalogError[error.code], error.message, error);
  }
}
