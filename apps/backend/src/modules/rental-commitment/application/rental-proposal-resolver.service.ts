import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';
import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';
import {
  CatalogSelectionResolution,
  CatalogSelectionResolutionError,
} from 'src/modules/catalog/public-api/catalog-selection-resolution.public-api';
import {
  PricingCalculationError,
  PricingCalculationRequest,
} from 'src/modules/pricing/public-api/pricing-calculation.public-api';
import {
  CustomerLocationSelection,
  ResolvedCustomerLocation,
} from 'src/modules/delivery/public-api/delivery-quote.public-api';

import { acceptedDeliverySnapshotFromQuote } from './accepted-delivery-snapshot.adapter';
import { adaptPricingCalculationToSnapshot } from './accepted-pricing/adapt-pricing-calculation-to-snapshot';
import { toRentalSelectionKind } from './catalog-selection-kind.mapper';
import { resolveEquipmentTypeNames } from './equipment-type-display-facts';
import { ProspectiveRentalCostService } from './prospective-rental-cost.service';
import {
  DuplicateRentalOfferSelectionError,
  EquipmentTypeNotFoundError,
  EquipmentTypeNotRentableError,
  InvalidCatalogSelectionQuantityError,
  InvalidFulfillmentDefinitionError,
  RentalInvalidFieldError,
  RentalOfferNotFoundError,
  RentalOfferNotRentableError,
} from '../domain/errors/rental-commitment.errors';
import { RentalDemandLineId } from '../domain/ids/rental-demand-line-id';
import { RentalSelectionId } from '../domain/ids/rental-selection-id';
import { EquipmentTypeId } from '../domain/types/rental-commitment-ids';
import { FulfillmentMethod, RentableItemKind } from '../domain/rental-status';
import { AcceptedDeliverySnapshotData } from '../domain/value-objects/accepted-delivery-snapshot.value-object';
import { AcceptedRentalPricingV3Snapshot } from '../domain/value-objects/accepted-pricing-snapshot.type';
import { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import { RentalDeliveryDetails } from '../domain/rental.aggregate';

export type RentalProposalResolutionErrorCode =
  | 'rental_commitment.rental_requires_selection'
  | 'rental_commitment.rental_offer_not_found'
  | 'rental_commitment.catalog_selection_unavailable'
  | 'rental_commitment.invalid_fulfillment_definition'
  | 'rental_commitment.duplicate_rental_offer_selection'
  | 'rental_commitment.equipment_type_not_found'
  | 'rental_commitment.equipment_type_not_rentable'
  | 'rental_commitment.invalid_rental_field'
  | 'rental_commitment.invalid_catalog_selection_quantity'
  | 'rental_commitment.invalid_pricing_input'
  | 'rental_commitment.delivery_not_serviceable';

export interface RentalProposalResolutionError extends ApplicationError {
  code: RentalProposalResolutionErrorCode;
}

export type RentalProposalDeliveryDestination =
  | { address: string; locationId: string }
  | { address: string; resolvedLocation: ResolvedCustomerLocation };

export type RentalProposalInput = {
  tenantId: string;
  branchId: string;
  period: RentalPeriod;
  selectedOffers: Array<{ rentalOfferId: string; quantity: number }>;
  fulfillmentMethod: FulfillmentMethod;
  insuranceSelected?: boolean;
  deliveryDestination?: RentalProposalDeliveryDestination;
  calculationFacts: PricingCalculationRequest['calculationFacts'];
} & (
  | {
      rentalCustomerId?: string;
      pricingIntent: {
        context: 'DRAFT';
        manualPricingAdjustment?: {
          mode: 'TARGET_TOTAL';
          targetTotal: string;
          reason?: string;
          setByTenantUserId: string;
        };
      };
    }
  | { rentalCustomerId: string; pricingIntent: { context: 'CONFIRMED'; manualPricingAdjustment?: never } }
);

export interface ResolvedRentalSelection {
  id: RentalSelectionId;
  rentalOfferId: string;
  rentableItemId: string;
  rentableItemNameSnapshot: string;
  rentableItemKindSnapshot: RentableItemKind;
  quantity: number;
}

export interface ResolvedRentalDemandLine {
  id: RentalDemandLineId;
  rentalSelectionId: RentalSelectionId;
  equipmentTypeId: EquipmentTypeId;
  equipmentTypeNameSnapshot: string;
  quantity: number;
}

export interface ResolvedRentalProposal {
  selections: ResolvedRentalSelection[];
  demandLines: ResolvedRentalDemandLine[];
  priceSnapshot: AcceptedRentalPricingV3Snapshot;
  deliveryDetails?: RentalDeliveryDetails;
  deliverySnapshot?: AcceptedDeliverySnapshotData;
}

@Injectable()
export class RentalProposalResolver {
  constructor(
    private readonly catalogSelectionResolution: CatalogSelectionResolution,
    private readonly assetInventoryDisplayFacts: AssetInventoryDisplayFacts,
    private readonly prospectiveRentalCost: ProspectiveRentalCostService,
  ) {}

  async resolve(input: RentalProposalInput): Promise<Result<ResolvedRentalProposal, RentalProposalResolutionError>> {
    const context = {
      tenantId: input.tenantId,
      branchId: input.branchId,
      ...(input.rentalCustomerId === undefined ? {} : { rentalCustomerId: input.rentalCustomerId }),
    };

    const catalogSelections = await this.catalogSelectionResolution.resolveSelectedRentalOffers({
      tenantId: input.tenantId,
      branchId: input.branchId,
      selectedOffers: input.selectedOffers,
    });
    if (catalogSelections.isErr()) return err(this.toResolutionError(catalogSelections.error, context));

    const equipmentTypeNames = await resolveEquipmentTypeNames(this.assetInventoryDisplayFacts, {
      tenantId: input.tenantId,
      equipmentTypeIds: catalogSelections.value.resolvedOffers.flatMap((offer) =>
        offer.fulfillmentRequirements.map((requirement) => requirement.equipmentTypeId),
      ),
    });
    if (equipmentTypeNames.isErr()) return err(this.toResolutionError(equipmentTypeNames.error, context));

    const selectionsWithRequirements = catalogSelections.value.resolvedOffers.map((offer) => ({
      id: RentalSelectionId.create(),
      rentalOfferId: offer.rentalOfferId,
      rentableItemId: offer.rentableItem.id,
      rentableItemNameSnapshot: offer.rentableItem.name,
      rentableItemKindSnapshot: toRentalSelectionKind(offer.rentableItem.kind),
      categoryId: offer.rentableItem.categoryId,
      quantity: offer.quantity,
      fulfillmentRequirements: offer.fulfillmentRequirements,
    }));

    const pricingRequest: PricingCalculationRequest = {
      tenantId: input.tenantId,
      customerId: input.rentalCustomerId,
      rentalPeriod: { start: input.period.start, end: input.period.end },
      calculationFacts: input.calculationFacts,
      insuranceSelected: input.insuranceSelected ?? false,
      lines: selectionsWithRequirements.map((selection) => ({
        lineReference: selection.id,
        rentalOfferId: selection.rentalOfferId,
        rentableItemId: selection.rentableItemId,
        rentableItemKind: selection.rentableItemKindSnapshot,
        categoryId: selection.categoryId,
        quantity: selection.quantity,
      })),
      targetTotalAdjustment: input.pricingIntent.manualPricingAdjustment
        ? { targetTotal: input.pricingIntent.manualPricingAdjustment.targetTotal }
        : undefined,
    };

    let prospectiveResult: Awaited<ReturnType<ProspectiveRentalCostService['calculate']>> | null = null;
    if (input.fulfillmentMethod === FulfillmentMethod.Pickup) {
      prospectiveResult = await this.prospectiveRentalCost.calculate({
        fulfillmentMethod: 'PICKUP',
        pricing: pricingRequest,
      });
    } else if (input.deliveryDestination) {
      prospectiveResult = await this.prospectiveRentalCost.calculate({
        fulfillmentMethod: 'DELIVERY',
        pricing: pricingRequest,
        branchId: input.branchId,
        customerLocation: toCustomerLocationSelection(input.deliveryDestination),
      });
    }

    if (!prospectiveResult) {
      return err(
        this.toResolutionError(
          new RentalInvalidFieldError('deliveryDetails', 'delivery rentals require delivery details'),
          context,
        ),
      );
    }
    if (prospectiveResult.isErr()) return err(this.toResolutionError(prospectiveResult.error, context));
    if (!prospectiveResult.value.available) {
      return err({
        code: 'rental_commitment.delivery_not_serviceable',
        message: `Delivery is not serviceable: ${prospectiveResult.value.reason}.`,
        context: { ...context, deliveryReason: prospectiveResult.value.reason },
      });
    }

    const deliveryQuote = prospectiveResult.value.deliveryQuote;
    const selections: ResolvedRentalSelection[] = selectionsWithRequirements.map((selection) => ({
      id: selection.id,
      rentalOfferId: selection.rentalOfferId,
      rentableItemId: selection.rentableItemId,
      rentableItemNameSnapshot: selection.rentableItemNameSnapshot,
      rentableItemKindSnapshot: selection.rentableItemKindSnapshot,
      quantity: selection.quantity,
    }));
    // SAFETY: This value comes from a persisted or already validated non-empty domain identifier; the brand adds no runtime representation.
    const demandLines: ResolvedRentalDemandLine[] = selectionsWithRequirements.flatMap((selection) =>
      selection.fulfillmentRequirements.map((requirement) => ({
        id: RentalDemandLineId.create(),
        rentalSelectionId: selection.id,
        equipmentTypeId: requirement.equipmentTypeId as EquipmentTypeId,
        equipmentTypeNameSnapshot: equipmentTypeNames.value.get(requirement.equipmentTypeId),
        quantity: selection.quantity * requirement.quantityPerItem,
      })),
    );

    return ok({
      selections,
      demandLines,
      priceSnapshot: adaptPricingCalculationToSnapshot({
        result: prospectiveResult.value.pricing,
        context: input.pricingIntent.context,
        lineDisplayNames: Object.fromEntries(
          selections.map((selection) => [selection.id, selection.rentableItemNameSnapshot]),
        ),
        manualPricingAdjustment: input.pricingIntent.manualPricingAdjustment,
      }),
      deliveryDetails:
        input.fulfillmentMethod === FulfillmentMethod.Delivery && input.deliveryDestination && deliveryQuote
          ? {
              address: input.deliveryDestination.address,
              formattedAddress: deliveryQuote.resolvedCustomerLocation.formattedAddress,
              latitude: deliveryQuote.resolvedCustomerLocation.latitude,
              longitude: deliveryQuote.resolvedCustomerLocation.longitude,
              providerPlaceId: deliveryQuote.resolvedCustomerLocation.providerPlaceId,
            }
          : undefined,
      deliverySnapshot: deliveryQuote ? acceptedDeliverySnapshotFromQuote(deliveryQuote) : undefined,
    });
  }

  private toResolutionError(error: unknown, context: ApplicationErrorContext): RentalProposalResolutionError {
    if (error instanceof CatalogSelectionResolutionError) {
      switch (error.code) {
        case 'EmptySelection':
          return resolutionError('rental_commitment.rental_requires_selection', error, context);
        case 'InvalidSelectionQuantity':
          return resolutionError('rental_commitment.invalid_catalog_selection_quantity', error, context);
        case 'DuplicateRentalOfferSelection':
          return resolutionError('rental_commitment.duplicate_rental_offer_selection', error, {
            ...context,
            ...(error.context?.rentalOfferId === undefined ? {} : { rentalOfferId: error.context.rentalOfferId }),
          });
        case 'RentalOfferNotFound':
          return resolutionError('rental_commitment.rental_offer_not_found', error, context);
        case 'RentalOfferNotRentable':
        case 'RentableItemArchived':
          return resolutionError('rental_commitment.catalog_selection_unavailable', error, context);
        case 'InvalidFulfillmentDefinition':
          return resolutionError('rental_commitment.invalid_fulfillment_definition', error, context);
      }
    }
    if (error instanceof RentalOfferNotFoundError) {
      return resolutionError('rental_commitment.rental_offer_not_found', error, context);
    }
    if (error instanceof RentalOfferNotRentableError) {
      return resolutionError('rental_commitment.catalog_selection_unavailable', error, context);
    }
    if (error instanceof InvalidFulfillmentDefinitionError) {
      return resolutionError('rental_commitment.invalid_fulfillment_definition', error, context);
    }
    if (error instanceof DuplicateRentalOfferSelectionError) {
      return resolutionError('rental_commitment.duplicate_rental_offer_selection', error, {
        ...context,
        rentalOfferId: error.rentalOfferId,
      });
    }
    if (error instanceof EquipmentTypeNotFoundError) {
      return resolutionError('rental_commitment.equipment_type_not_found', error, {
        ...context,
        equipmentTypeId: error.equipmentTypeId,
      });
    }
    if (error instanceof EquipmentTypeNotRentableError) {
      return resolutionError('rental_commitment.equipment_type_not_rentable', error, {
        ...context,
        equipmentTypeId: error.equipmentTypeId,
      });
    }
    if (error instanceof RentalInvalidFieldError) {
      return resolutionError('rental_commitment.invalid_rental_field', error, { ...context, field: error.field });
    }
    if (error instanceof InvalidCatalogSelectionQuantityError) {
      return resolutionError('rental_commitment.invalid_catalog_selection_quantity', error, {
        ...context,
        field: error.field,
        quantity: error.quantity,
      });
    }
    if (error instanceof PricingCalculationError || isErrorWithCode(error, 'INVALID_PRICING_INPUT')) {
      return resolutionError('rental_commitment.invalid_pricing_input', error, context);
    }
    throw error;
  }
}

function toCustomerLocationSelection(input: RentalProposalDeliveryDestination): CustomerLocationSelection {
  return 'resolvedLocation' in input
    ? { resolvedLocation: input.resolvedLocation }
    : { address: input.address, locationId: input.locationId };
}

function resolutionError(
  code: RentalProposalResolutionErrorCode,
  cause: Error,
  context: ApplicationErrorContext,
): RentalProposalResolutionError {
  return { code, message: cause.message, cause, context };
}

function isErrorWithCode(error: unknown, code: string): error is Error & { code: string } {
  return error instanceof Error && 'code' in error && error.code === code;
}
