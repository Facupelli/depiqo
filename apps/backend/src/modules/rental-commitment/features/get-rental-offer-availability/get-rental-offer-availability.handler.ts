import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  CatalogSelectionResolution,
  CatalogSelectionResolutionError,
} from 'src/modules/catalog/public-api/catalog-selection-resolution.public-api';
import { TenantRentalAssetBufferSettings } from 'src/modules/tenant-management/public-api/tenant-rental-asset-buffer-settings.public-api';

import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { deriveBufferedAssetBlockPeriod } from '../../domain/asset-block-period';
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
    private readonly catalogSelectionResolution: CatalogSelectionResolution,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly tenantRentalAssetBufferSettings: TenantRentalAssetBufferSettings,
  ) {}

  async execute(query: GetRentalOfferAvailabilityQuery): Promise<GetRentalOfferAvailabilityResult> {
    const bufferSettings = await this.tenantRentalAssetBufferSettings.getTenantRentalAssetBufferSettings({
      tenantId: query.tenantId,
    });
    if (bufferSettings.isErr()) {
      return err(
        getRentalOfferAvailabilityError(
          'rental_commitment.tenant_unavailable',
          bufferSettings.error.message,
          bufferSettings.error,
        ),
      );
    }

    const operationalPeriod = deriveBufferedAssetBlockPeriod({
      participationPeriod: query.period,
      ...bufferSettings.value,
    });

    const resolved = await this.catalogSelectionResolution.resolveSelectedRentalOffers({
      tenantId: query.tenantId,
      branchId: query.branchId,
      selectedOffers: [...query.rentalOfferIds].map((rentalOfferId) => ({ rentalOfferId, quantity: 1 })),
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
      periodStart: operationalPeriod.start,
      periodEnd: operationalPeriod.end,
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

  private mapCatalogError(error: CatalogSelectionResolutionError): GetRentalOfferAvailabilityError {
    switch (error.code) {
      case 'RentalOfferNotFound':
        return getRentalOfferAvailabilityError('rental_commitment.rental_offer_not_found', error.message, error);
      case 'RentalOfferNotRentable':
        return getRentalOfferAvailabilityError('rental_commitment.rental_offer_not_rentable', error.message, error);
      case 'RentableItemNotActive':
        return getRentalOfferAvailabilityError('rental_commitment.rentable_item_not_active', error.message, error);
      case 'EmptySelection':
      case 'InvalidSelectionQuantity':
      case 'DuplicateRentalOfferSelection':
      case 'InvalidFulfillmentDefinition':
        return getRentalOfferAvailabilityError(
          'rental_commitment.invalid_fulfillment_definition',
          error.message,
          error,
        );
    }
  }
}
