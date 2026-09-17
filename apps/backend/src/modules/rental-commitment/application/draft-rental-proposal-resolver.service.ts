import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { ApplicationError } from 'src/core/errors/application-error';
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
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantBillingPreferences } from 'src/modules/tenant-management/public-api/tenant-billing-preferences.public-api';

import { acceptedDeliverySnapshotFromQuote } from './accepted-delivery-snapshot.adapter';
import { adaptPricingCalculationToSnapshot } from './accepted-pricing/adapt-pricing-calculation-to-snapshot';
import { toRentalSelectionKind } from './catalog-selection-kind.mapper';
import { resolveEquipmentTypeNames } from './equipment-type-display-facts';
import { ProspectiveRentalCostService } from './prospective-rental-cost.service';
import { RentalOperationalFactsValidatorService } from './rental-operational-facts-validator.service';
import {
  BranchUnavailableForRentalError,
  DuplicateRentalOfferSelectionError,
  EquipmentTypeNotFoundError,
  EquipmentTypeNotRentableError,
  InvalidCatalogSelectionQuantityError,
  InvalidFulfillmentDefinitionError,
  RentalCustomerUnavailableForRentalError,
  RentalInvalidFieldError,
  RentalOfferNotFoundError,
  RentalOfferNotRentableError,
  RentableItemNotActiveError,
  TenantUnavailableForRentalError,
} from '../domain/errors/rental-commitment.errors';
import { RentalDemandLineId } from '../domain/ids/rental-demand-line-id';
import { RentalSelectionId } from '../domain/ids/rental-selection-id';
import { EquipmentTypeId } from '../domain/types/rental-commitment-ids';
import { FulfillmentMethod, RentableItemKind } from '../domain/rental-status';
import { AcceptedDeliverySnapshotData } from '../domain/value-objects/accepted-delivery-snapshot.value-object';
import { AcceptedRentalPricingV3Snapshot } from '../domain/value-objects/accepted-pricing-snapshot.type';
import { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import { RentalDeliveryDetails } from '../domain/rental.aggregate';

export type DraftRentalProposalResolutionErrorCode =
  | 'rental_commitment.rental_requires_selection'
  | 'rental_commitment.rental_offer_not_found'
  | 'rental_commitment.catalog_selection_unavailable'
  | 'rental_commitment.invalid_fulfillment_definition'
  | 'rental_commitment.duplicate_rental_offer_selection'
  | 'rental_commitment.tenant_unavailable'
  | 'rental_commitment.branch_unavailable'
  | 'rental_commitment.customer_unavailable'
  | 'rental_commitment.equipment_type_not_found'
  | 'rental_commitment.equipment_type_not_rentable'
  | 'rental_commitment.invalid_rental_field'
  | 'rental_commitment.invalid_catalog_selection_quantity'
  | 'rental_commitment.invalid_pricing_input'
  | 'rental_commitment.delivery_not_serviceable';

export interface DraftRentalProposalResolutionError extends ApplicationError {
  code: DraftRentalProposalResolutionErrorCode;
}

export type DraftRentalDeliveryAuthoringInput =
  | { address: string; locationId: string }
  | { address: string; resolvedLocation: ResolvedCustomerLocation };

export interface DraftRentalProposalInput {
  tenantId: string;
  branchId: string;
  rentalCustomerId?: string;
  period: RentalPeriod;
  selectedOffers: Array<{ rentalOfferId: string; quantity: number }>;
  fulfillmentMethod: FulfillmentMethod;
  insuranceSelected?: boolean;
  deliveryDestination?: DraftRentalDeliveryAuthoringInput;
  manualPricingAdjustment?: {
    mode: 'TARGET_TOTAL';
    targetTotal: string;
    reason?: string;
    setByTenantUserId: string;
  };
}

export interface ResolvedDraftRentalSelection {
  id: RentalSelectionId;
  rentalOfferId: string;
  rentableItemId: string;
  rentableItemNameSnapshot: string;
  rentableItemKindSnapshot: RentableItemKind;
  quantity: number;
}

export interface ResolvedDraftRentalDemandLine {
  id: RentalDemandLineId;
  rentalSelectionId: RentalSelectionId;
  equipmentTypeId: EquipmentTypeId;
  equipmentTypeNameSnapshot: string;
  quantity: number;
}

export interface ResolvedDraftRentalProposal {
  selections: ResolvedDraftRentalSelection[];
  demandLines: ResolvedDraftRentalDemandLine[];
  priceSnapshot: AcceptedRentalPricingV3Snapshot;
  deliveryDetails?: RentalDeliveryDetails;
  deliverySnapshot?: AcceptedDeliverySnapshotData;
}

@Injectable()
export class DraftRentalProposalResolver {
  constructor(
    private readonly tenantBillingPreferences: TenantBillingPreferences,
    private readonly branchFacts: BranchFacts,
    private readonly rentalOperationalFacts: RentalOperationalFactsValidatorService,
    private readonly catalogSelectionResolution: CatalogSelectionResolution,
    private readonly assetInventoryDisplayFacts: AssetInventoryDisplayFacts,
    private readonly prospectiveRentalCost: ProspectiveRentalCostService,
  ) {}

  async resolve(
    input: DraftRentalProposalInput,
  ): Promise<Result<ResolvedDraftRentalProposal, DraftRentalProposalResolutionError>> {
    const context = {
      tenantId: input.tenantId,
      branchId: input.branchId,
      rentalCustomerId: input.rentalCustomerId,
    };

    const operationalFacts = await this.rentalOperationalFacts.validateDraftFacts({
      tenantId: input.tenantId,
      branchId: input.branchId,
      rentalCustomerId: input.rentalCustomerId,
      fulfillmentMethod: input.fulfillmentMethod,
    });
    if (operationalFacts.isErr()) return err(this.toResolutionError(operationalFacts.error, context));

    const [billingPreferences, branchFacts] = await Promise.all([
      this.tenantBillingPreferences.getTenantBillingPreferences({ tenantId: input.tenantId }),
      this.branchFacts.getBranchFacts({ tenantId: input.tenantId, branchId: input.branchId }),
    ]);
    if (billingPreferences.isErr()) {
      return err(this.toResolutionError(new TenantUnavailableForRentalError(input.tenantId), context));
    }
    if (branchFacts.isErr()) {
      return err(this.toResolutionError(new BranchUnavailableForRentalError(input.branchId), context));
    }

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
      rentalPeriod: input.period,
      calculationFacts: {
        effectiveTimezone: branchFacts.value.effectiveTimezone,
        dailyBillingPolicy: billingPreferences.value.dailyBillingPolicy,
        weekendCountsAsOne: billingPreferences.value.weekendCountsAsOne,
      },
      insuranceSelected: input.insuranceSelected ?? false,
      lines: selectionsWithRequirements.map((selection) => ({
        lineReference: selection.id,
        rentalOfferId: selection.rentalOfferId,
        rentableItemId: selection.rentableItemId,
        rentableItemKind: selection.rentableItemKindSnapshot,
        categoryId: selection.categoryId,
        quantity: selection.quantity,
      })),
      targetTotalAdjustment: input.manualPricingAdjustment
        ? { targetTotal: input.manualPricingAdjustment.targetTotal }
        : undefined,
    };

    const prospectiveResult =
      input.fulfillmentMethod === FulfillmentMethod.Pickup
        ? await this.prospectiveRentalCost.calculate({ fulfillmentMethod: 'PICKUP', pricing: pricingRequest })
        : input.deliveryDestination
          ? await this.prospectiveRentalCost.calculate({
              fulfillmentMethod: 'DELIVERY',
              pricing: pricingRequest,
              branchId: input.branchId,
              customerLocation: toCustomerLocationSelection(input.deliveryDestination),
            })
          : null;

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
    const selections: ResolvedDraftRentalSelection[] = selectionsWithRequirements.map((selection) => ({
      id: selection.id,
      rentalOfferId: selection.rentalOfferId,
      rentableItemId: selection.rentableItemId,
      rentableItemNameSnapshot: selection.rentableItemNameSnapshot,
      rentableItemKindSnapshot: selection.rentableItemKindSnapshot,
      quantity: selection.quantity,
    }));
    // SAFETY: This value comes from a persisted or already validated non-empty domain identifier; the brand adds no runtime representation.
    const demandLines: ResolvedDraftRentalDemandLine[] = selectionsWithRequirements.flatMap((selection) =>
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
        context: 'DRAFT',
        lineDisplayNames: Object.fromEntries(
          selections.map((selection) => [selection.id, selection.rentableItemNameSnapshot]),
        ),
        manualPricingAdjustment: input.manualPricingAdjustment,
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

  private toResolutionError(error: unknown, context: Record<string, unknown>): DraftRentalProposalResolutionError {
    if (error instanceof CatalogSelectionResolutionError) {
      switch (error.code) {
        case 'EmptySelection':
          return resolutionError('rental_commitment.rental_requires_selection', error, context);
        case 'InvalidSelectionQuantity':
          return resolutionError('rental_commitment.invalid_catalog_selection_quantity', error, context);
        case 'DuplicateRentalOfferSelection':
          return resolutionError('rental_commitment.duplicate_rental_offer_selection', error, {
            ...context,
            rentalOfferId: error.context?.rentalOfferId,
          });
        case 'RentalOfferNotFound':
          return resolutionError('rental_commitment.rental_offer_not_found', error, context);
        case 'RentalOfferNotRentable':
        case 'RentableItemNotActive':
          return resolutionError('rental_commitment.catalog_selection_unavailable', error, context);
        case 'InvalidFulfillmentDefinition':
          return resolutionError('rental_commitment.invalid_fulfillment_definition', error, context);
      }
    }
    if (error instanceof RentalOfferNotFoundError) {
      return resolutionError('rental_commitment.rental_offer_not_found', error, context);
    }
    if (error instanceof RentalOfferNotRentableError || error instanceof RentableItemNotActiveError) {
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
    if (error instanceof TenantUnavailableForRentalError) {
      return resolutionError('rental_commitment.tenant_unavailable', error, context);
    }
    if (error instanceof BranchUnavailableForRentalError) {
      return resolutionError('rental_commitment.branch_unavailable', error, context);
    }
    if (error instanceof RentalCustomerUnavailableForRentalError) {
      return resolutionError('rental_commitment.customer_unavailable', error, context);
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

function toCustomerLocationSelection(input: DraftRentalDeliveryAuthoringInput): CustomerLocationSelection {
  return 'resolvedLocation' in input
    ? { resolvedLocation: input.resolvedLocation }
    : { address: input.address, locationId: input.locationId };
}

function resolutionError(
  code: DraftRentalProposalResolutionErrorCode,
  cause: Error,
  context: Record<string, unknown>,
): DraftRentalProposalResolutionError {
  return { code, message: cause.message, cause, context };
}

function isErrorWithCode(error: unknown, code: string): error is Error & { code: string } {
  return error instanceof Error && 'code' in error && error.code === code;
}
