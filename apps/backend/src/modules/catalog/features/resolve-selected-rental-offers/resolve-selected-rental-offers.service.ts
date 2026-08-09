import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import {
  EquipmentTypeNotFoundError,
  EquipmentTypeNotRentableError,
  InvalidCatalogSelectionQuantityError,
  InvalidFulfillmentDefinitionError,
  RentalCommitmentError,
  RentalInvalidFieldError,
  RentalMustContainSelectionError,
  RentalOfferNotFoundError,
  RentalOfferNotRentableError,
  RentableItemNotActiveError,
} from '../../../rental-commitment/domain/errors/rental-commitment.errors';
import {
  ResolveRentalOffersForAvailabilityError,
  ResolveRentalOffersForAvailabilityInput,
  ResolveRentalOffersForAvailabilityResult,
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
  ): Promise<Result<ResolveSelectedRentalOffersResult, RentalCommitmentError>> {
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
        return err(new RentalOfferNotFoundError(selection.rentalOfferId));
      }

      if (!rentalOffer.isRentable) {
        return err(new RentalOfferNotRentableError(selection.rentalOfferId));
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
        return err(new RentableItemNotActiveError(offer.rentableItemId));
      }

      if (rentableItem.status !== 'ACTIVE') {
        return err(new RentableItemNotActiveError(offer.rentableItemId));
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
        return err(new InvalidFulfillmentDefinitionError(rentableItemId));
      }

      for (const requirement of itemRequirements) {
        if (!Number.isInteger(requirement.quantityPerItem) || requirement.quantityPerItem <= 0) {
          return err(
            new InvalidCatalogSelectionQuantityError(
              'fulfillmentRequirements.quantityPerItem',
              requirement.quantityPerItem,
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
        return err(new EquipmentTypeNotFoundError(equipmentTypeId));
      }

      if (!equipmentType.isActive) {
        return err(new EquipmentTypeNotRentableError(equipmentTypeId));
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

  private toAvailabilityError(error: RentalCommitmentError): ResolveRentalOffersForAvailabilityError {
    if (error instanceof RentalOfferNotFoundError) {
      return { code: 'RentalOfferNotFound', message: error.message, cause: error };
    }
    if (error instanceof RentalOfferNotRentableError) {
      return { code: 'RentalOfferNotRentable', message: error.message, cause: error };
    }
    if (error instanceof RentableItemNotActiveError) {
      return { code: 'RentableItemNotActive', message: error.message, cause: error };
    }

    return { code: 'InvalidFulfillmentDefinition', message: error.message, cause: error };
  }

  private validateSelectionPayload(selections: SelectedRentalOfferInput[]): Result<void, RentalCommitmentError> {
    if (selections.length === 0) {
      return err(new RentalMustContainSelectionError());
    }

    const seenRentalOfferIds = new Set<string>();

    for (const selection of selections) {
      if (!Number.isInteger(selection.quantity) || selection.quantity <= 0) {
        return err(new InvalidCatalogSelectionQuantityError('selectedOffers.quantity', selection.quantity));
      }

      if (seenRentalOfferIds.has(selection.rentalOfferId)) {
        return err(
          new RentalInvalidFieldError(
            'rentalOfferId',
            `offer "${selection.rentalOfferId}" was selected more than once`,
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
