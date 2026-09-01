import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { ApplicationError } from 'src/core/errors/application-error';
import {
  CatalogSelectionResolution,
  CatalogSelectionResolutionError,
} from 'src/modules/catalog/public-api/catalog-selection-resolution.public-api';
import { TenantRentalAssetBufferSettings } from 'src/modules/tenant-management/public-api/tenant-rental-asset-buffer-settings.public-api';

import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { deriveBufferedAssetBlockPeriod } from '../../domain/asset-block-period';
import { EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

export type RentalOfferCatalogUnavailableReason =
  | 'RENTAL_OFFER_NOT_FOUND'
  | 'RENTAL_OFFER_NOT_RENTABLE'
  | 'RENTABLE_ITEM_NOT_ACTIVE';

export type RentalOfferAvailabilityOutcome =
  | {
      kind: 'RESOLVED';
      rentalOfferId: string;
      availableCount: number;
    }
  | {
      kind: 'CATALOG_UNAVAILABLE';
      rentalOfferId: string;
      reason: RentalOfferCatalogUnavailableReason;
      rentableItemId?: string;
    };

export type RentalOfferAvailabilityErrorCode =
  | 'rental_commitment.tenant_unavailable'
  | 'rental_commitment.invalid_fulfillment_definition'
  | 'rental_commitment.invalid_availability_selection'
  | 'rental_commitment.invalid_candidate_projection';

export interface RentalOfferAvailabilityError extends ApplicationError {
  code: RentalOfferAvailabilityErrorCode;
}

export type CalculateRentalOfferAvailabilityResult = Result<
  RentalOfferAvailabilityOutcome[],
  RentalOfferAvailabilityError
>;

export type CalculateRentalOfferAvailabilityInput = {
  tenantId: string;
  branchId: string;
  period: RentalPeriod;
  rentalOfferIds: readonly string[];
  transportReservationMinutes?: number;
};

function deriveProspectiveAssetBlockPeriod(
  input: Pick<CalculateRentalOfferAvailabilityInput, 'period' | 'transportReservationMinutes'>,
  bufferSettings: { beforeBufferMinutes: number; afterBufferMinutes: number },
): RentalPeriod {
  const transportReservationMinutes = input.transportReservationMinutes ?? 0;

  return deriveBufferedAssetBlockPeriod({
    participationPeriod: input.period,
    beforeBufferMinutes: bufferSettings.beforeBufferMinutes + transportReservationMinutes,
    afterBufferMinutes: bufferSettings.afterBufferMinutes + transportReservationMinutes,
  });
}

@Injectable()
export class RentalOfferAvailabilityService {
  constructor(
    private readonly catalogSelectionResolution: CatalogSelectionResolution,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly tenantRentalAssetBufferSettings: TenantRentalAssetBufferSettings,
  ) {}

  async calculate(input: CalculateRentalOfferAvailabilityInput): Promise<CalculateRentalOfferAvailabilityResult> {
    if (
      input.transportReservationMinutes !== undefined &&
      (!Number.isInteger(input.transportReservationMinutes) || input.transportReservationMinutes < 0)
    ) {
      return err(
        this.error(
          'rental_commitment.invalid_availability_selection',
          'transportReservationMinutes must be a non-negative integer when provided.',
        ),
      );
    }

    const bufferSettings = await this.tenantRentalAssetBufferSettings.getTenantRentalAssetBufferSettings({
      tenantId: input.tenantId,
    });
    if (bufferSettings.isErr()) {
      return err(
        this.error('rental_commitment.tenant_unavailable', bufferSettings.error.message, bufferSettings.error),
      );
    }

    const operationalPeriod = deriveProspectiveAssetBlockPeriod(input, bufferSettings.value);

    const catalogResult = await this.catalogSelectionResolution.resolveSelectedRentalOfferRequirements({
      tenantId: input.tenantId,
      branchId: input.branchId,
      rentalOfferIds: [...input.rentalOfferIds],
    });
    if (catalogResult.isErr()) return err(this.mapCatalogError(catalogResult.error));

    const resolvedById = new Map(catalogResult.value.resolvedOffers.map((offer) => [offer.rentalOfferId, offer]));
    const unavailableById = new Map(
      catalogResult.value.unavailableOffers.map((offer) => [
        offer.rentalOfferId,
        {
          kind: 'CATALOG_UNAVAILABLE' as const,
          rentalOfferId: offer.rentalOfferId,
          reason: this.mapUnavailableReason(offer.code),
          ...(offer.rentableItemId ? { rentableItemId: offer.rentableItemId } : {}),
        },
      ]),
    );

    if (resolvedById.size === 0) {
      return ok(input.rentalOfferIds.map((rentalOfferId) => this.requireUnavailable(rentalOfferId, unavailableById)));
    }

    const equipmentTypeIds = [
      ...new Set(
        catalogResult.value.resolvedOffers.flatMap((offer) =>
          offer.fulfillmentRequirements.map((requirement) => requirement.equipmentTypeId as EquipmentTypeId),
        ),
      ),
    ];

    const candidates = await this.rentalAssetAllocation.findEligibleAvailableCandidates({
      tenantId: input.tenantId,
      branchId: input.branchId,
      equipmentTypeIds,
      periodStart: operationalPeriod.start,
      periodEnd: operationalPeriod.end,
    });
    if (candidates.isErr()) {
      return err(
        this.error('rental_commitment.invalid_candidate_projection', candidates.error.message, candidates.error),
      );
    }

    const availableCounts = new Map<string, number>();
    for (const candidate of candidates.value) {
      availableCounts.set(candidate.equipmentTypeId, (availableCounts.get(candidate.equipmentTypeId) ?? 0) + 1);
    }

    const capacityById = new Map<string, number>();
    for (const offer of catalogResult.value.resolvedOffers) {
      const capacity = this.calculateCapacity(offer.fulfillmentRequirements, availableCounts);
      if (capacity === undefined) {
        return err(
          this.error(
            'rental_commitment.invalid_fulfillment_definition',
            `Rental offer "${offer.rentalOfferId}" has an invalid fulfillment definition.`,
          ),
        );
      }
      capacityById.set(offer.rentalOfferId, capacity);
    }

    return ok(
      input.rentalOfferIds.map((rentalOfferId) => {
        if (resolvedById.has(rentalOfferId)) {
          const availableCount = capacityById.get(rentalOfferId);
          if (availableCount === undefined) {
            throw new Error(`Resolved rental offer "${rentalOfferId}" has no calculated availability.`);
          }
          return { kind: 'RESOLVED' as const, rentalOfferId, availableCount };
        }
        return this.requireUnavailable(rentalOfferId, unavailableById);
      }),
    );
  }

  private calculateCapacity(
    requirements: readonly { equipmentTypeId: string; quantityPerItem: number }[],
    availableCounts: ReadonlyMap<string, number>,
  ): number | undefined {
    if (requirements.length === 0) return undefined;
    if (
      requirements.some(
        (requirement) => !Number.isInteger(requirement.quantityPerItem) || requirement.quantityPerItem <= 0,
      )
    ) {
      return undefined;
    }

    return Math.min(
      ...requirements.map((requirement) =>
        Math.floor((availableCounts.get(requirement.equipmentTypeId) ?? 0) / requirement.quantityPerItem),
      ),
    );
  }

  private requireUnavailable(
    rentalOfferId: string,
    unavailableById: ReadonlyMap<string, Extract<RentalOfferAvailabilityOutcome, { kind: 'CATALOG_UNAVAILABLE' }>>,
  ): Extract<RentalOfferAvailabilityOutcome, { kind: 'CATALOG_UNAVAILABLE' }> {
    const unavailable = unavailableById.get(rentalOfferId);
    if (!unavailable) {
      throw new Error(`Catalog did not classify requested rental offer "${rentalOfferId}".`);
    }
    return unavailable;
  }

  private mapUnavailableReason(
    code: 'RentalOfferNotFound' | 'RentalOfferNotRentable' | 'RentableItemNotActive',
  ): RentalOfferCatalogUnavailableReason {
    switch (code) {
      case 'RentalOfferNotFound':
        return 'RENTAL_OFFER_NOT_FOUND';
      case 'RentalOfferNotRentable':
        return 'RENTAL_OFFER_NOT_RENTABLE';
      case 'RentableItemNotActive':
        return 'RENTABLE_ITEM_NOT_ACTIVE';
    }
  }

  private mapCatalogError(error: CatalogSelectionResolutionError): RentalOfferAvailabilityError {
    switch (error.code) {
      case 'InvalidFulfillmentDefinition':
        return this.error('rental_commitment.invalid_fulfillment_definition', error.message, error);
      case 'EmptySelection':
      case 'InvalidSelectionQuantity':
      case 'DuplicateRentalOfferSelection':
        return this.error('rental_commitment.invalid_availability_selection', error.message, error);
      case 'RentalOfferNotFound':
      case 'RentalOfferNotRentable':
      case 'RentableItemNotActive':
        throw new Error(`Catalog requirement resolution unexpectedly returned whole-call error "${error.code}".`);
    }
  }

  private error(
    code: RentalOfferAvailabilityErrorCode,
    message: string,
    cause?: unknown,
  ): RentalOfferAvailabilityError {
    return { code, message, cause };
  }
}
