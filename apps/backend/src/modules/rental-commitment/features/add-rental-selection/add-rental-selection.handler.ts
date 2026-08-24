import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';
import {
  CatalogSelectionResolution,
  CatalogSelectionResolutionError,
} from 'src/modules/catalog/public-api/catalog-selection-resolution.public-api';
import {
  PricingCalculation,
  PricingCalculationError,
} from 'src/modules/pricing/public-api/pricing-calculation.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantBillingPreferences } from 'src/modules/tenant-management/public-api/tenant-billing-preferences.public-api';

import { adaptPricingCalculationToSnapshot } from '../../application/accepted-pricing/adapt-pricing-calculation-to-snapshot';
import { toRentalSelectionKind } from '../../application/catalog-selection-kind.mapper';
import { resolveEquipmentTypeNames } from '../../application/equipment-type-display-facts';
import { RentalOperationalFactsValidatorService } from '../../application/rental-operational-facts-validator.service';
import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import {
  BranchUnavailableForRentalError,
  DuplicateRentalOfferSelectionError,
  EquipmentTypeNotFoundError,
  InsufficientAssetAvailabilityError,
  InvalidCatalogSelectionQuantityError,
  RentalCannotBeEditedFromStatusError,
  RentalCustomerUnavailableForRentalError,
  RentalInvalidFieldError,
  RentalPeriodHasEndedError,
  TenantUnavailableForRentalError,
  UnsupportedBranchFulfillmentMethodError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalDemandLineId } from '../../domain/ids/rental-demand-line-id';
import { RentalSelectionId } from '../../domain/ids/rental-selection-id';
import { RentalStatus } from '../../domain/rental-status';
import { Rental } from '../../domain/rental.aggregate';
import { EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
import { AcceptedRentalPricingSnapshotV1 } from '../../domain/value-objects/accepted-pricing-snapshot.type';
import { getConfirmedPriceSnapshotForOwnerSplits } from '../../owner-split/confirmed-price-snapshot-for-owner-splits';
import { RentalOwnerSplitDraft } from '../../owner-split/owner-split-calculator.types';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalRepository } from '../../persistence/rental.repository';
import { AddRentalSelectionCommand } from './add-rental-selection.command';
import { AddRentalSelectionError, addRentalSelectionError } from './add-rental-selection.errors';

export interface AddRentalSelectionResultValue {
  rentalId: string;
  version: number;
  updatedAt: Date;
}

export type AddRentalSelectionResult = Result<AddRentalSelectionResultValue, AddRentalSelectionError>;

@CommandHandler(AddRentalSelectionCommand)
export class AddRentalSelectionHandler implements ICommandHandler<AddRentalSelectionCommand, AddRentalSelectionResult> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly tenantBillingPreferences: TenantBillingPreferences,
    private readonly branchFacts: BranchFacts,
    private readonly rentalOperationalFacts: RentalOperationalFactsValidatorService,
    private readonly catalogSelectionResolution: CatalogSelectionResolution,
    private readonly assetInventoryDisplayFacts: AssetInventoryDisplayFacts,
    private readonly pricingCalculation: PricingCalculation,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly rentalOwnerSplitCalculator: RentalOwnerSplitCalculator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: AddRentalSelectionCommand): Promise<AddRentalSelectionResult> {
    const { tenantId, tenantUserId, rentalId, rentalOfferId, quantity } = command.props;
    const context = { useCase: 'AddRentalSelection', tenantId, tenantUserId, rentalId, rentalOfferId };
    const rental = await this.rentalRepository.findById(tenantId, rentalId);

    if (!rental) return err(this.notFound(rentalId, context));
    if (rental.status !== RentalStatus.Confirmed) {
      return err(this.toApplicationError(new RentalCannotBeEditedFromStatusError(rentalId, rental.status), context));
    }
    if (rental.selections.some((selection) => selection.rentalOfferId === rentalOfferId)) {
      return err(this.toApplicationError(new DuplicateRentalOfferSelectionError(rentalOfferId), context));
    }

    const operationalFacts = await this.rentalOperationalFacts.validateDraftFacts({
      tenantId,
      branchId: rental.branchId,
      rentalCustomerId: rental.rentalCustomerId,
      fulfillmentMethod: rental.fulfillmentMethod!,
    });
    if (operationalFacts.isErr()) return err(this.toApplicationError(operationalFacts.error, context));

    const [billingPreferences, branchFacts, catalog] = await Promise.all([
      this.tenantBillingPreferences.getTenantBillingPreferences({ tenantId }),
      this.branchFacts.getBranchFacts({ tenantId, branchId: rental.branchId }),
      this.catalogSelectionResolution.resolveSelectedRentalOffers({
        tenantId,
        branchId: rental.branchId,
        selectedOffers: [{ rentalOfferId, quantity }],
      }),
    ]);
    if (billingPreferences.isErr()) {
      return err(this.toApplicationError(new TenantUnavailableForRentalError(tenantId), context));
    }
    if (branchFacts.isErr()) {
      return err(this.toApplicationError(new BranchUnavailableForRentalError(rental.branchId), context));
    }
    if (catalog.isErr()) return err(this.toApplicationError(catalog.error, context));

    const offer = catalog.value.resolvedOffers[0];
    const selectionId = RentalSelectionId.create();
    const equipmentTypeNames = await resolveEquipmentTypeNames(this.assetInventoryDisplayFacts, {
      tenantId,
      equipmentTypeIds: offer.fulfillmentRequirements.map((requirement) => requirement.equipmentTypeId),
    });
    if (equipmentTypeNames.isErr()) return err(this.toApplicationError(equipmentTypeNames.error, context));

    const demandLines = offer.fulfillmentRequirements.map((requirement) => ({
      id: RentalDemandLineId.create(),
      rentalSelectionId: selectionId,
      equipmentTypeId: requirement.equipmentTypeId as EquipmentTypeId,
      equipmentTypeNameSnapshot: equipmentTypeNames.value.get(requirement.equipmentTypeId),
      quantity: quantity * requirement.quantityPerItem,
    }));
    const selection = {
      id: selectionId,
      rentalOfferId: offer.rentalOfferId,
      rentableItemId: offer.rentableItem.id,
      rentableItemNameSnapshot: offer.rentableItem.name,
      rentableItemKindSnapshot: toRentalSelectionKind(offer.rentableItem.kind),
      quantity,
    };

    const previousSnapshot = rental.confirmedPriceSnapshot!.toJSON() as AcceptedRentalPricingSnapshotV1;
    const previousPriceLineBySelectionId = new Map(
      previousSnapshot.final.lines.map((line) => [line.rentalSelectionId, line]),
    );
    const pricingResult = await this.pricingCalculation.calculateProposedPrice({
      tenantId,
      customerId: rental.rentalCustomerId!,
      rentalPeriod: { start: rental.period.start, end: rental.period.end },
      calculationFacts: {
        effectiveTimezone: branchFacts.value.effectiveTimezone,
        dailyBillingPolicy: billingPreferences.value.dailyBillingPolicy,
        weekendCountsAsOne: billingPreferences.value.weekendCountsAsOne,
      },
      lines: [
        ...rental.selections.map((existing) => ({
          lineReference: existing.id,
          rentalOfferId: existing.rentalOfferId,
          rentableItemId: existing.rentableItemId,
          categoryId: previousPriceLineBySelectionId.get(existing.id)?.categoryId,
          quantity: existing.quantity,
        })),
        {
          lineReference: selectionId,
          rentalOfferId: offer.rentalOfferId,
          rentableItemId: offer.rentableItem.id,
          categoryId: offer.rentableItem.categoryId,
          quantity,
        },
      ],
    });
    if (pricingResult.isErr()) return err(this.toApplicationError(pricingResult.error, context));

    const confirmedPriceSnapshot = adaptPricingCalculationToSnapshot({
      result: pricingResult.value,
      context: 'CONFIRMED',
      lineDisplayNames: Object.fromEntries([
        ...rental.selections.map((existing) => [existing.id, existing.rentableItemNameSnapshot] as const),
        [selectionId, selection.rentableItemNameSnapshot],
      ]),
    });

    try {
      return await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        const currentRental = await this.rentalRepository.findById(tenantId, rentalId, tx);
        if (!currentRental) return err(this.notFound(rentalId, context));
        if (currentRental.version !== command.props.expectedVersion) {
          return err(
            addRentalSelectionError(
              'rental_commitment.rental_version_conflict',
              `Rental "${rentalId}" was modified by another request.`,
              undefined,
              context,
            ),
          );
        }
        if (currentRental.status !== RentalStatus.Confirmed) {
          return err(
            this.toApplicationError(new RentalCannotBeEditedFromStatusError(rentalId, currentRental.status), context),
          );
        }
        if (currentRental.selections.some((existing) => existing.rentalOfferId === rentalOfferId)) {
          return err(this.toApplicationError(new DuplicateRentalOfferSelectionError(rentalOfferId), context));
        }

        const operationTime = new Date();
        const effectiveAt = operationTime < currentRental.period.start ? currentRental.period.start : operationTime;
        if (effectiveAt >= currentRental.period.end) {
          return err(this.toApplicationError(new RentalPeriodHasEndedError(rentalId), context));
        }

        const allocation = await this.rentalAssetAllocation.planAllocations({
          tenantId,
          branchId: currentRental.branchId,
          periodStart: effectiveAt,
          periodEnd: currentRental.period.end,
          demandLines: demandLines.map((line) => ({
            rentalDemandLineId: line.id,
            rentalSelectionId: line.rentalSelectionId,
            equipmentTypeId: line.equipmentTypeId,
            quantity: line.quantity,
          })),
          excludeAssetIds: currentRental.currentAssignedAssets.map((assignment) => assignment.assetId),
          tx,
        });
        if (allocation.isErr()) return err(this.toApplicationError(allocation.error, context));

        const added = currentRental.addConfirmedSelection({
          selection,
          demandLines,
          assignedAssets: allocation.value.allocations.map((planned) => ({
            rentalDemandLineId: planned.rentalDemandLineId,
            assetId: planned.assetId,
            ownershipSnapshot: planned.ownershipSnapshot,
          })),
          confirmedPriceSnapshot,
          operationTime,
        });
        if (added.isErr()) return err(this.toApplicationError(added.error, context));

        const ownerSplits = this.calculateOwnerSplits(currentRental);
        const saved = await this.rentalRepository.save(currentRental, {
          expectedVersion: command.props.expectedVersion,
          ownerSplits,
          tx,
        });
        if (!saved) {
          return err(
            addRentalSelectionError(
              'rental_commitment.rental_version_conflict',
              `Rental "${rentalId}" was modified by another request.`,
              undefined,
              context,
            ),
          );
        }

        integrationEvents.collect(toRentalIntegrationEvents(currentRental.pullDomainEvents()));
        return ok({ rentalId, version: saved.version, updatedAt: saved.updatedAt });
      });
    } catch (error) {
      if (error instanceof PostgresExclusionViolationError) {
        return err(
          addRentalSelectionError(
            'rental_commitment.insufficient_asset_availability',
            'The requested equipment is no longer available.',
            error,
            context,
          ),
        );
      }
      throw error;
    }
  }

  private calculateOwnerSplits(rental: Rental): RentalOwnerSplitDraft[] {
    const priceSnapshot = getConfirmedPriceSnapshotForOwnerSplits(rental.confirmedPriceSnapshot);
    return this.rentalOwnerSplitCalculator.calculate({
      tenantId: rental.tenantId,
      rentalId: rental.id,
      currency: priceSnapshot.currency,
      selections: rental.selections.map((selection) => ({ id: selection.id })),
      demandLines: rental.demandLines.map((line) => ({ id: line.id, sourceSelectionId: line.rentalSelectionId })),
      fulfilledAssets: rental.currentAssignedAssets.map((assignment) => ({
        id: assignment.id,
        rentalDemandLineId: assignment.rentalDemandLineId,
        assetId: assignment.assetId,
        ownershipSnapshot: assignment.ownershipSnapshot.toJSON(),
      })),
      priceLines: priceSnapshot.lines.map((line) => ({
        rentalSelectionId: line.rentalSelectionId,
        netAmount: line.total,
      })),
    }).splits;
  }

  private notFound(rentalId: string, context: Record<string, unknown>): AddRentalSelectionError {
    return addRentalSelectionError(
      'rental_commitment.rental_not_found',
      `Rental "${rentalId}" was not found.`,
      undefined,
      context,
    );
  }

  private toApplicationError(error: unknown, context: Record<string, unknown>): AddRentalSelectionError {
    if (error instanceof CatalogSelectionResolutionError) {
      switch (error.code) {
        case 'InvalidSelectionQuantity':
          return addRentalSelectionError(
            'rental_commitment.invalid_catalog_selection_quantity',
            error.message,
            error,
            context,
          );
        case 'DuplicateRentalOfferSelection':
          return addRentalSelectionError(
            'rental_commitment.duplicate_rental_offer_selection',
            error.message,
            error,
            context,
          );
        case 'RentalOfferNotFound':
          return addRentalSelectionError('rental_commitment.rental_offer_not_found', error.message, error, context);
        case 'RentalOfferNotRentable':
        case 'RentableItemNotActive':
          return addRentalSelectionError(
            'rental_commitment.catalog_selection_unavailable',
            error.message,
            error,
            context,
          );
        case 'InvalidFulfillmentDefinition':
        case 'EmptySelection':
          return addRentalSelectionError(
            'rental_commitment.invalid_fulfillment_definition',
            error.message,
            error,
            context,
          );
      }
    }
    if (error instanceof RentalCannotBeEditedFromStatusError) {
      return addRentalSelectionError(
        'rental_commitment.rental_cannot_be_edited_from_status',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalPeriodHasEndedError) {
      return addRentalSelectionError('rental_commitment.rental_period_ended', error.message, error, context);
    }
    if (error instanceof DuplicateRentalOfferSelectionError) {
      return addRentalSelectionError(
        'rental_commitment.duplicate_rental_offer_selection',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof EquipmentTypeNotFoundError) {
      return addRentalSelectionError('rental_commitment.equipment_type_not_found', error.message, error, context);
    }
    if (error instanceof InsufficientAssetAvailabilityError) {
      return addRentalSelectionError(
        'rental_commitment.insufficient_asset_availability',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof TenantUnavailableForRentalError) {
      return addRentalSelectionError('rental_commitment.tenant_unavailable', error.message, error, context);
    }
    if (error instanceof BranchUnavailableForRentalError) {
      return addRentalSelectionError('rental_commitment.branch_unavailable', error.message, error, context);
    }
    if (error instanceof RentalCustomerUnavailableForRentalError) {
      return addRentalSelectionError('rental_commitment.customer_unavailable', error.message, error, context);
    }
    if (error instanceof UnsupportedBranchFulfillmentMethodError) {
      return addRentalSelectionError(
        'rental_commitment.unsupported_branch_fulfillment_method',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof InvalidCatalogSelectionQuantityError) {
      return addRentalSelectionError(
        'rental_commitment.invalid_catalog_selection_quantity',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof PricingCalculationError || isErrorWithCode(error, 'INVALID_PRICING_INPUT')) {
      return addRentalSelectionError('rental_commitment.invalid_pricing_input', error.message, error, context);
    }
    if (error instanceof RentalInvalidFieldError) {
      return addRentalSelectionError('rental_commitment.invalid_rental_field', error.message, error, context);
    }
    throw error;
  }
}

function isErrorWithCode(error: unknown, code: string): error is Error & { code: string } {
  return error instanceof Error && 'code' in error && error.code === code;
}
