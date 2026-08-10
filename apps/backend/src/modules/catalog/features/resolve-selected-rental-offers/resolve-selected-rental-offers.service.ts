import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import {
  ResolveRentalOffersForAvailabilityError,
  ResolveRentalOffersForAvailabilityInput,
  ResolveRentalOffersForAvailabilityResult,
  ResolveSelectedRentalOffersError,
  ResolveSelectedRentalOffersInput,
  ResolveSelectedRentalOffersResult,
  SelectedRentalOfferInput,
} from '../../public-api/catalog.public-api';
import {
  FulfillmentRequirementReadModel,
  PrismaResolveSelectedRentalOffersReader,
} from './prisma-resolve-selected-rental-offers.reader';

@Injectable()
export class ResolveSelectedRentalOffersService {
  constructor(private readonly reader: PrismaResolveSelectedRentalOffersReader) {}

  async executeForAvailability(
    input: ResolveRentalOffersForAvailabilityInput,
  ): Promise<Result<ResolveRentalOffersForAvailabilityResult, ResolveRentalOffersForAvailabilityError>> {
    const resolved = await this.execute({
      tenantId: input.tenantId,
      branchId: input.branchId,
      selectedOffers: input.rentalOfferIds.map((rentalOfferId) => ({ rentalOfferId, quantity: 1 })),
    });

    if (resolved.isErr()) {
      return err(this.toAvailabilityError(resolved.error));
    }

    return ok({
      resolvedOffers: resolved.value.resolvedOffers.map((offer) => ({
        rentalOfferId: offer.rentalOfferId,
        branchId: offer.branchId,
        fulfillmentRequirements: offer.fulfillmentRequirements.map(({ equipmentTypeId, quantityPerItem }) => ({
          equipmentTypeId,
          quantityPerItem,
        })),
      })),
    });
  }

  async execute(
    input: ResolveSelectedRentalOffersInput,
  ): Promise<Result<ResolveSelectedRentalOffersResult, ResolveSelectedRentalOffersError>> {
    const payloadValidation = this.validateSelectionPayload(input.selectedOffers);

    if (payloadValidation.isErr()) {
      return err(payloadValidation.error);
    }

    const rentalOfferIds = input.selectedOffers.map((selection) => selection.rentalOfferId);
    const rentalOffers = await this.reader.findRentalOffers({
      tenantId: input.tenantId,
      branchId: input.branchId,
      rentalOfferIds,
    });
    const rentalOffersById = this.indexById(rentalOffers);

    for (const selection of input.selectedOffers) {
      const rentalOffer = rentalOffersById.get(selection.rentalOfferId);

      if (!rentalOffer) {
        return err(
          catalogSelectionError('RentalOfferNotFound', `Rental offer "${selection.rentalOfferId}" was not found.`),
        );
      }

      if (!rentalOffer.isRentable) {
        return err(
          catalogSelectionError('RentalOfferNotRentable', `Rental offer "${selection.rentalOfferId}" is not rentable.`),
        );
      }
    }

    const rentableItemIds = [...new Set(rentalOffers.map((offer) => offer.rentableItemId))];
    const rentableItems = await this.reader.findRentableItems({
      tenantId: input.tenantId,
      rentableItemIds,
    });
    const rentableItemsById = this.indexById(rentableItems);

    for (const offer of rentalOffers) {
      const rentableItem = rentableItemsById.get(offer.rentableItemId);

      if (!rentableItem) {
        return err(
          catalogSelectionError('RentableItemNotActive', `Rentable item "${offer.rentableItemId}" is not active.`),
        );
      }

      if (rentableItem.status !== 'ACTIVE') {
        return err(
          catalogSelectionError('RentableItemNotActive', `Rentable item "${offer.rentableItemId}" is not active.`),
        );
      }
    }

    const requirements = await this.reader.findFulfillmentRequirements({
      tenantId: input.tenantId,
      rentableItemIds,
    });
    const requirementsByRentableItemId = this.groupRequirementsByRentableItemId(requirements);

    for (const rentableItemId of rentableItemIds) {
      const itemRequirements = requirementsByRentableItemId.get(rentableItemId) ?? [];

      if (itemRequirements.length === 0) {
        return err(
          catalogSelectionError(
            'InvalidFulfillmentDefinition',
            `Rentable item "${rentableItemId}" has no fulfillment requirements.`,
          ),
        );
      }

      for (const requirement of itemRequirements) {
        if (!Number.isInteger(requirement.quantityPerItem) || requirement.quantityPerItem <= 0) {
          return err(
            catalogSelectionError(
              'InvalidFulfillmentDefinition',
              `Fulfillment requirement quantity "${requirement.quantityPerItem}" must be a positive integer.`,
            ),
          );
        }
      }
    }

    const equipmentTypeIds = [...new Set(requirements.map((requirement) => requirement.equipmentTypeId))];
    const equipmentTypes = await this.reader.findEquipmentTypes({
      tenantId: input.tenantId,
      equipmentTypeIds,
    });
    const equipmentTypesById = this.indexById(equipmentTypes);

    for (const equipmentTypeId of equipmentTypeIds) {
      const equipmentType = equipmentTypesById.get(equipmentTypeId);

      if (!equipmentType) {
        return err(
          catalogSelectionError('EquipmentTypeNotFound', `Equipment type "${equipmentTypeId}" was not found.`),
        );
      }

      if (!equipmentType.isActive) {
        return err(
          catalogSelectionError('EquipmentTypeNotActive', `Equipment type "${equipmentTypeId}" is not active.`),
        );
      }
    }

    return ok({
      resolvedOffers: input.selectedOffers.map((selection) => {
        const rentalOffer = rentalOffersById.get(selection.rentalOfferId)!;
        const rentableItem = rentableItemsById.get(rentalOffer.rentableItemId)!;
        const itemRequirements = requirementsByRentableItemId.get(rentableItem.id)!;

        return {
          rentalOfferId: rentalOffer.id,
          rentableItem: {
            id: rentableItem.id,
            name: rentableItem.name,
            kind: rentableItem.kind,
            categoryId: rentableItem.categoryId ?? undefined,
          },
          branchId: rentalOffer.branchId,
          quantity: selection.quantity,
          fulfillmentRequirements: itemRequirements.map((requirement) => ({
            equipmentTypeId: requirement.equipmentTypeId,
            equipmentTypeName: equipmentTypesById.get(requirement.equipmentTypeId)?.name,
            quantityPerItem: requirement.quantityPerItem,
          })),
        };
      }),
    });
  }

  private toAvailabilityError(error: ResolveSelectedRentalOffersError): ResolveRentalOffersForAvailabilityError {
    if (error.code === 'RentalOfferNotFound')
      return { code: 'RentalOfferNotFound', message: error.message, cause: error };
    if (error.code === 'RentalOfferNotRentable')
      return { code: 'RentalOfferNotRentable', message: error.message, cause: error };
    if (error.code === 'RentableItemNotActive')
      return { code: 'RentableItemNotActive', message: error.message, cause: error };

    return { code: 'InvalidFulfillmentDefinition', message: error.message, cause: error };
  }

  private validateSelectionPayload(
    selections: SelectedRentalOfferInput[],
  ): Result<void, ResolveSelectedRentalOffersError> {
    if (selections.length === 0) {
      return err(catalogSelectionError('EmptySelection', 'At least one rental offer must be selected.'));
    }

    const seenRentalOfferIds = new Set<string>();

    for (const selection of selections) {
      if (!Number.isInteger(selection.quantity) || selection.quantity <= 0) {
        return err(
          catalogSelectionError('InvalidSelectionQuantity', 'Rental offer quantity must be a positive integer.'),
        );
      }

      if (seenRentalOfferIds.has(selection.rentalOfferId)) {
        return err(
          catalogSelectionError(
            'DuplicateRentalOfferSelection',
            `Rental offer "${selection.rentalOfferId}" was selected more than once.`,
            { rentalOfferId: selection.rentalOfferId },
          ),
        );
      }

      seenRentalOfferIds.add(selection.rentalOfferId);
    }

    return ok(undefined);
  }

  private indexById<T extends { id: string }>(records: T[]): Map<string, T> {
    return new Map(records.map((record) => [record.id, record]));
  }

  private groupRequirementsByRentableItemId(
    requirements: FulfillmentRequirementReadModel[],
  ): Map<string, FulfillmentRequirementReadModel[]> {
    const grouped = new Map<string, FulfillmentRequirementReadModel[]>();

    for (const requirement of requirements) {
      const current = grouped.get(requirement.rentableItemId) ?? [];
      current.push(requirement);
      grouped.set(requirement.rentableItemId, current);
    }

    return grouped;
  }
}

function catalogSelectionError(
  code: ResolveSelectedRentalOffersError['code'],
  message: string,
  context?: Record<string, unknown>,
): ResolveSelectedRentalOffersError {
  return { code, message, context };
}
