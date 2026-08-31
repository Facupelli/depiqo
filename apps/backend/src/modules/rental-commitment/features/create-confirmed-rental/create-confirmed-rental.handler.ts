import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PrismaService } from 'src/core/database/prisma.service';
import { PostgresExclusionViolationError, isUniqueConstraintViolation } from 'src/core/utils/postgres-error.mapper';
import {
  CatalogSelectionResolution,
  CatalogSelectionResolutionError,
} from 'src/modules/catalog/public-api/catalog-selection-resolution.public-api';
import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';
import {
  PricingCalculation,
  PricingCalculationError,
} from 'src/modules/pricing/public-api/pricing-calculation.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantBillingPreferences } from 'src/modules/tenant-management/public-api/tenant-billing-preferences.public-api';

import { RentalOperationalFactsValidatorService } from '../../application/rental-operational-facts-validator.service';

import { adaptPricingCalculationToSnapshot } from '../../application/accepted-pricing/adapt-pricing-calculation-to-snapshot';
import { toRentalSelectionKind } from '../../application/catalog-selection-kind.mapper';
import { resolveEquipmentTypeNames } from '../../application/equipment-type-display-facts';
import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { buildConfirmationFingerprint } from './confirmation-operation-fingerprint';
import { CreateConfirmedRentalCommand } from './create-confirmed-rental.command';
import { ConfirmationOperationPersistence } from '../../persistence/rental.repository';
import { Rental } from '../../domain/rental.aggregate';
import { FulfillmentMethod } from '../../domain/rental-status';
import { createConfirmedRentalError, CreateConfirmedRentalError } from './create-confirmed-rental.errors';
import { RentalNumberAllocator } from '../../persistence/rental-number.allocator';
import { RentalRepository } from '../../persistence/rental.repository';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { RentalSelectionId } from '../../domain/ids/rental-selection-id';
import { RentalDemandLineId } from '../../domain/ids/rental-demand-line-id';
import { EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalOwnerSplitDraft } from '../../owner-split/owner-split-calculator.types';
import {
  BranchUnavailableForRentalError,
  DuplicateAssignedAssetError,
  DuplicateRentalOfferSelectionError,
  EquipmentTypeNotFoundError,
  EquipmentTypeNotRentableError,
  InsufficientAssetAvailabilityError,
  InvalidCatalogSelectionQuantityError,
  InvalidFulfillmentDefinitionError,
  PickupTimeOutsideBranchScheduleError,
  RentableItemNotActiveError,
  RentalOfferNotFoundError,
  RentalOfferNotRentableError,
  ProfessionalConfirmedRentalCreationDisabledError,
  RentalCustomerUnavailableForRentalError,
  RentalInvalidFieldError,
  RentalMustContainSelectionError,
  ReturnTimeOutsideBranchScheduleError,
  TenantUnavailableForRentalError,
  UnsupportedBranchFulfillmentMethodError,
} from '../../domain/errors/rental-commitment.errors';

export interface CreateConfirmedRentalResult {
  rentalId: string;
  rentalNumber: number;
}

export type CreateConfirmedRentalServiceResult = Result<CreateConfirmedRentalResult, CreateConfirmedRentalError>;

@CommandHandler(CreateConfirmedRentalCommand)
export class CreateConfirmedRentalService implements ICommandHandler<
  CreateConfirmedRentalCommand,
  CreateConfirmedRentalServiceResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly prisma: PrismaService,
    private readonly tenantBillingPreferences: TenantBillingPreferences,
    private readonly branchFacts: BranchFacts,
    private readonly rentalOperationalFacts: RentalOperationalFactsValidatorService,
    private readonly catalogSelectionResolution: CatalogSelectionResolution,
    private readonly assetInventoryDisplayFacts: AssetInventoryDisplayFacts,
    private readonly pricingCalculation: PricingCalculation,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly rentalOwnerSplitCalculator: RentalOwnerSplitCalculator,
    private readonly rentalNumberAllocator: RentalNumberAllocator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: CreateConfirmedRentalCommand): Promise<CreateConfirmedRentalServiceResult> {
    const context = {
      useCase: 'CreateConfirmedRental',
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
    };
    const confirmationOperation: ConfirmationOperationPersistence = {
      operationId: command.confirmationOperationId,
      fingerprint: buildConfirmationFingerprint(command),
    };

    const replay = await this.findCommittedRentalByOperation(command.tenantId, confirmationOperation.operationId);
    if (replay) {
      return this.resolveReplayResult(replay, confirmationOperation, context);
    }

    const tenantValidation = await this.rentalOperationalFacts.validateDirectConfirmedFacts({
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
      pickupAt: command.period.start,
      returnAt: command.period.end,
      fulfillmentMethod: command.fulfillmentMethod ?? FulfillmentMethod.Pickup,
    });

    if (tenantValidation.isErr()) {
      return err(this.toApplicationError(tenantValidation.error, context));
    }

    const [billingPreferences, branchFacts] = await Promise.all([
      this.tenantBillingPreferences.getTenantBillingPreferences({ tenantId: command.tenantId }),
      this.branchFacts.getBranchFacts({ tenantId: command.tenantId, branchId: command.branchId }),
    ]);
    if (billingPreferences.isErr())
      return err(this.toApplicationError(new TenantUnavailableForRentalError(command.tenantId), context));
    if (branchFacts.isErr())
      return err(this.toApplicationError(new BranchUnavailableForRentalError(command.branchId), context));

    const resolvedCatalogSelections = await this.catalogSelectionResolution.resolveSelectedRentalOffers({
      tenantId: command.tenantId,
      branchId: command.branchId,
      selectedOffers: command.selectedOffers.map((selection) => ({
        rentalOfferId: selection.rentalOfferId,
        quantity: selection.quantity,
      })),
    });

    if (resolvedCatalogSelections.isErr()) {
      return err(this.toApplicationError(resolvedCatalogSelections.error, context));
    }

    const equipmentTypeNames = await resolveEquipmentTypeNames(this.assetInventoryDisplayFacts, {
      tenantId: command.tenantId,
      equipmentTypeIds: resolvedCatalogSelections.value.resolvedOffers.flatMap((offer) =>
        offer.fulfillmentRequirements.map((requirement) => requirement.equipmentTypeId),
      ),
    });
    if (equipmentTypeNames.isErr()) return err(this.toApplicationError(equipmentTypeNames.error, context));

    const rentalSelectionsDraft = resolvedCatalogSelections.value.resolvedOffers.map((offer) => ({
      rentalSelectionId: RentalSelectionId.create(),
      rentalOfferId: offer.rentalOfferId,
      rentableItemId: offer.rentableItem.id,
      rentableItemNameSnapshot: offer.rentableItem.name,
      rentableItemKindSnapshot: toRentalSelectionKind(offer.rentableItem.kind),
      categoryId: offer.rentableItem.categoryId,
      quantity: offer.quantity,
      fulfillmentRequirements: offer.fulfillmentRequirements,
    }));

    const pricingResult = await this.pricingCalculation.calculateProposedPrice({
      tenantId: command.tenantId,
      customerId: command.rentalCustomerId,
      rentalPeriod: {
        start: command.period.start,
        end: command.period.end,
      },
      calculationFacts: {
        effectiveTimezone: branchFacts.value.effectiveTimezone,
        dailyBillingPolicy: billingPreferences.value.dailyBillingPolicy,
        weekendCountsAsOne: billingPreferences.value.weekendCountsAsOne,
      },
      insuranceSelected: command.insuranceSelected ?? false,
      lines: rentalSelectionsDraft.map((selection) => ({
        lineReference: selection.rentalSelectionId,
        rentalOfferId: selection.rentalOfferId,
        rentableItemId: selection.rentableItemId,
        rentableItemKind: selection.rentableItemKindSnapshot,
        categoryId: selection.categoryId,
        quantity: selection.quantity,
      })),
    });

    if (pricingResult.isErr()) {
      return err(this.toApplicationError(pricingResult.error, context));
    }

    const equipmentDemandLines = rentalSelectionsDraft.flatMap((selection) =>
      selection.fulfillmentRequirements.map((requirement) => ({
        rentalDemandLineId: RentalDemandLineId.create(),
        rentalSelectionId: selection.rentalSelectionId,
        equipmentTypeId: requirement.equipmentTypeId,
        equipmentNameSnapshot: equipmentTypeNames.value.get(requirement.equipmentTypeId),
        quantity: selection.quantity * requirement.quantityPerItem,
      })),
    );

    const assetAssignmentPlan = await this.rentalAssetAllocation.planAllocations({
      tenantId: command.tenantId,
      branchId: command.branchId,
      periodStart: command.period.start,
      periodEnd: command.period.end,
      demandLines: equipmentDemandLines.map((line) => ({
        rentalDemandLineId: line.rentalDemandLineId,
        rentalSelectionId: line.rentalSelectionId,
        equipmentTypeId: line.equipmentTypeId as EquipmentTypeId,
        quantity: line.quantity,
      })),
    });

    if (assetAssignmentPlan.isErr()) {
      const availabilityError = assetAssignmentPlan.error;

      if (availabilityError instanceof InsufficientAssetAvailabilityError) {
        const replay = await this.findCommittedRentalByOperation(command.tenantId, confirmationOperation.operationId);
        if (replay) {
          return this.resolveReplayResult(replay, confirmationOperation, context);
        }
      }

      const failedSelection =
        availabilityError instanceof InsufficientAssetAvailabilityError
          ? rentalSelectionsDraft.find(
              (selection) => selection.rentalSelectionId === availabilityError.rentalSelectionId,
            )
          : undefined;
      return err(
        this.toApplicationError(availabilityError, {
          ...context,
          ...(failedSelection ? { rentalOfferId: failedSelection.rentalOfferId } : {}),
        }),
      );
    }

    try {
      return await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        const rental = Rental.createConfirmed({
          tenantId: command.tenantId,
          rentalNumber: await this.rentalNumberAllocator.allocate(command.tenantId, tx),
          branchId: command.branchId,
          rentalCustomerId: command.rentalCustomerId,
          fulfillmentMethod: command.fulfillmentMethod ?? FulfillmentMethod.Pickup,
          notes: command.notes,
          insuranceSelected: command.insuranceSelected,
          bookingSnapshot: command.bookingSnapshot,
          deliveryDetails:
            command.fulfillmentMethod === FulfillmentMethod.Delivery ? command.deliveryDetails : undefined,
          acceptedAssetBuffer: { beforeBufferMinutes: 0, afterBufferMinutes: 0 },
          confirmedPriceSnapshot: adaptPricingCalculationToSnapshot({
            result: pricingResult.value,
            context: 'CONFIRMED',
            lineDisplayNames: Object.fromEntries(
              rentalSelectionsDraft.map((selection) => [
                selection.rentalSelectionId,
                selection.rentableItemNameSnapshot,
              ]),
            ),
          }),
          period: command.period,

          selections: rentalSelectionsDraft.map((selection) => ({
            id: selection.rentalSelectionId,
            rentalOfferId: selection.rentalOfferId,
            rentableItemId: selection.rentableItemId,
            rentableItemNameSnapshot: selection.rentableItemNameSnapshot,
            rentableItemKindSnapshot: selection.rentableItemKindSnapshot,
            quantity: selection.quantity,
          })),

          demandLines: equipmentDemandLines.map((line) => ({
            id: line.rentalDemandLineId,
            rentalSelectionId: line.rentalSelectionId,
            equipmentTypeId: line.equipmentTypeId as EquipmentTypeId,
            equipmentTypeNameSnapshot: line.equipmentNameSnapshot,
            quantity: line.quantity,
          })),

          assignedAssets: assetAssignmentPlan.value.allocations.map((allocation) => ({
            rentalDemandLineId: allocation.rentalDemandLineId,
            assetId: allocation.assetId,
            ownershipSnapshot: allocation.ownershipSnapshot,
          })),
        });

        if (rental.isErr()) {
          throw rental.error;
        }

        const confirmedRental = rental.value;

        // TODO: make part of Rental Aggregate
        const ownerSplitInput = {
          tenantId: confirmedRental.tenantId,
          rentalId: confirmedRental.id,
          currency: pricingResult.value.final.currency,

          selections: confirmedRental.selections.map((selection) => ({
            id: selection.id,
          })),

          demandLines: confirmedRental.demandLines.map((demandLine) => ({
            id: demandLine.id,
            sourceSelectionId: demandLine.rentalSelectionId,
          })),

          fulfilledAssets: confirmedRental.currentAssignedAssets.map((assignment) => ({
            id: assignment.id,
            rentalDemandLineId: assignment.rentalDemandLineId,
            assetId: assignment.assetId,
            ownershipSnapshot: assignment.ownershipSnapshot.toJSON(),
          })),

          priceLines: pricingResult.value.final.lines.map((line) => ({
            rentalSelectionId: line.lineReference,
            netAmount: line.total,
          })),
        };

        const { splits }: { splits: RentalOwnerSplitDraft[] } =
          this.rentalOwnerSplitCalculator.calculate(ownerSplitInput);

        await this.rentalRepository.save(confirmedRental, { ownerSplits: splits, confirmationOperation, tx });
        integrationEvents.collect(toRentalIntegrationEvents(confirmedRental.pullDomainEvents()));

        return ok({
          rentalId: confirmedRental.id,
          rentalNumber: confirmedRental.rentalNumber,
        });
      });
    } catch (error) {
      const isIdempotencyConflict = isUniqueConstraintViolation(error, ['tenant_id', 'confirmation_operation_id']);
      const isAssetBlockConflict = error instanceof PostgresExclusionViolationError;

      if (isIdempotencyConflict || isAssetBlockConflict) {
        // The failed transaction has fully rolled back before runInTransaction
        // rejects. Resolve through the normal Prisma client, never the failed tx.
        const replay = await this.findCommittedRentalByOperation(command.tenantId, confirmationOperation.operationId);
        if (replay) {
          return this.resolveReplayResult(replay, confirmationOperation, context);
        }
      }

      if (isAssetBlockConflict) {
        return err(
          createConfirmedRentalError(
            'rental_commitment.insufficient_asset_availability',
            'The requested equipment is no longer available.',
            error,
            context,
          ),
        );
      }

      return err(this.toApplicationError(error, context));
    }
  }

  private async findCommittedRentalByOperation(
    tenantId: string,
    operationId: string,
  ): Promise<{ id: string; rentalNumber: number; confirmationFingerprint: string | null } | null> {
    return this.prisma.client.v2Rental.findFirst({
      where: { tenantId, confirmationOperationId: operationId },
      select: { id: true, rentalNumber: true, confirmationFingerprint: true },
    });
  }

  private resolveReplayResult(
    replay: { id: string; rentalNumber: number; confirmationFingerprint: string | null },
    operation: ConfirmationOperationPersistence,
    context: Record<string, unknown>,
  ): CreateConfirmedRentalServiceResult {
    if (replay.confirmationFingerprint !== operation.fingerprint) {
      return err(
        createConfirmedRentalError(
          'rental_commitment.idempotency_key_reused_with_different_input',
          'The idempotency key was already used for a different confirmation request.',
          undefined,
          context,
        ),
      );
    }

    return ok({ rentalId: replay.id, rentalNumber: replay.rentalNumber });
  }

  private toApplicationError(error: unknown, context: Record<string, unknown>): CreateConfirmedRentalError {
    if (isCatalogSelectionError(error)) {
      switch (error.code) {
        case 'EmptySelection':
          return createConfirmedRentalError(
            'rental_commitment.rental_requires_selection',
            error.message,
            error,
            context,
          );
        case 'InvalidSelectionQuantity':
          return createConfirmedRentalError(
            'rental_commitment.invalid_catalog_selection_quantity',
            error.message,
            error,
            context,
          );
        case 'DuplicateRentalOfferSelection':
          return createConfirmedRentalError(
            'rental_commitment.duplicate_rental_offer_selection',
            error.message,
            error,
            {
              ...context,
              rentalOfferId: error.context?.rentalOfferId,
            },
          );
        case 'RentalOfferNotFound':
          return createConfirmedRentalError('rental_commitment.rental_offer_not_found', error.message, error, context);
        case 'RentalOfferNotRentable':
        case 'RentableItemNotActive':
          return createConfirmedRentalError('rental_commitment.catalog_selection_unavailable', error.message, error, {
            ...context,
            rentalOfferId: error.context?.rentalOfferId,
          });
        case 'InvalidFulfillmentDefinition':
          return createConfirmedRentalError(
            'rental_commitment.invalid_fulfillment_definition',
            error.message,
            error,
            context,
          );
      }
    }
    if (error instanceof RentalMustContainSelectionError) {
      return createConfirmedRentalError('rental_commitment.rental_requires_selection', error.message, error, context);
    }
    if (error instanceof RentalOfferNotFoundError) {
      return createConfirmedRentalError('rental_commitment.rental_offer_not_found', error.message, error, context);
    }
    if (error instanceof RentalOfferNotRentableError || error instanceof RentableItemNotActiveError) {
      return createConfirmedRentalError('rental_commitment.catalog_selection_unavailable', error.message, error, {
        ...context,
        rentalOfferId: error instanceof RentalOfferNotRentableError ? error.rentalOfferId : undefined,
      });
    }
    if (error instanceof InvalidFulfillmentDefinitionError) {
      return createConfirmedRentalError(
        'rental_commitment.invalid_fulfillment_definition',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof DuplicateRentalOfferSelectionError) {
      return createConfirmedRentalError('rental_commitment.duplicate_rental_offer_selection', error.message, error, {
        ...context,
        rentalOfferId: error.rentalOfferId,
      });
    }
    if (error instanceof InsufficientAssetAvailabilityError) {
      return createConfirmedRentalError('rental_commitment.insufficient_asset_availability', error.message, error, {
        ...context,
        equipmentTypeId: error.equipmentTypeId,
        rentalSelectionId: error.rentalSelectionId,
        requiredQuantity: error.requiredQuantity,
        availableQuantity: error.availableQuantity,
      });
    }
    if (error instanceof ProfessionalConfirmedRentalCreationDisabledError) {
      return createConfirmedRentalError(
        'rental_commitment.confirmed_rental_creation_disabled',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof TenantUnavailableForRentalError) {
      return createConfirmedRentalError('rental_commitment.tenant_unavailable', error.message, error, context);
    }
    if (error instanceof BranchUnavailableForRentalError) {
      return createConfirmedRentalError('rental_commitment.branch_unavailable', error.message, error, context);
    }
    if (error instanceof RentalCustomerUnavailableForRentalError) {
      return createConfirmedRentalError('rental_commitment.customer_unavailable', error.message, error, context);
    }
    if (error instanceof EquipmentTypeNotFoundError) {
      return createConfirmedRentalError('rental_commitment.equipment_type_not_found', error.message, error, {
        ...context,
        equipmentTypeId: error.equipmentTypeId,
      });
    }
    if (error instanceof EquipmentTypeNotRentableError) {
      return createConfirmedRentalError('rental_commitment.equipment_type_not_rentable', error.message, error, {
        ...context,
        equipmentTypeId: error.equipmentTypeId,
      });
    }
    if (error instanceof UnsupportedBranchFulfillmentMethodError) {
      return createConfirmedRentalError(
        'rental_commitment.unsupported_branch_fulfillment_method',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof PickupTimeOutsideBranchScheduleError) {
      return createConfirmedRentalError(
        'rental_commitment.pickup_time_outside_branch_schedule',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof ReturnTimeOutsideBranchScheduleError) {
      return createConfirmedRentalError(
        'rental_commitment.return_time_outside_branch_schedule',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalInvalidFieldError) {
      return createConfirmedRentalError('rental_commitment.invalid_rental_field', error.message, error, {
        ...context,
        field: error.field,
      });
    }
    if (error instanceof InvalidCatalogSelectionQuantityError) {
      return createConfirmedRentalError('rental_commitment.invalid_catalog_selection_quantity', error.message, error, {
        ...context,
        field: error.field,
        quantity: error.quantity,
      });
    }
    if (error instanceof PricingCalculationError || isErrorWithCode(error, 'INVALID_PRICING_INPUT')) {
      return createConfirmedRentalError('rental_commitment.invalid_pricing_input', error.message, error, context);
    }
    if (error instanceof DuplicateAssignedAssetError) {
      return createConfirmedRentalError('rental_commitment.duplicate_assigned_asset', error.message, error, context);
    }

    throw error;
  }
}

function isCatalogSelectionError(error: unknown): error is CatalogSelectionResolutionError {
  return error instanceof CatalogSelectionResolutionError;
}

function isErrorWithCode(error: unknown, code: string): error is Error & { code: string } {
  return error instanceof Error && 'code' in error && error.code === code;
}
