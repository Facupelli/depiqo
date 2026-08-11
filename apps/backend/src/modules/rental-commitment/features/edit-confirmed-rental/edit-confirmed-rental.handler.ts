import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import { V2AssetBlockType } from 'src/generated/prisma/enums';
import { CatalogPublicApi, ResolveSelectedRentalOffersError } from 'src/modules/catalog/public-api/catalog.public-api';
import { PricingPublicApi } from 'src/modules/pricing/public-api/pricing.public-api';
import { RentalPriceSnapshotV1 } from 'src/modules/pricing/public-api/rental-price-snapshot.type';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import {
  BranchUnavailableForRentalError,
  ConfirmedRentalCannotBeEditedAfterPickupError,
  DuplicateRentalOfferSelectionError,
  InsufficientAssetAvailabilityError,
  InvalidCatalogSelectionQuantityError,
  PickupTimeOutsideBranchScheduleError,
  RentalCannotBeEditedFromStatusError,
  RentalCustomerUnavailableForRentalError,
  RentalInvalidFieldError,
  RentalMustContainSelectionError,
  RentalPeriodCannotStartInPastError,
  ReturnTimeOutsideBranchScheduleError,
  TenantUnavailableForRentalError,
  UnsupportedBranchFulfillmentMethodError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalDemandLineId } from '../../domain/ids/rental-demand-line-id';
import { RentalStatus } from '../../domain/rental-status';
import { Rental } from '../../domain/rental.aggregate';
import { RentalSelectionId } from '../../domain/ids/rental-selection-id';
import { AssetId, EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
import { getConfirmedPriceSnapshotForOwnerSplits } from '../../owner-split/confirmed-price-snapshot-for-owner-splits';
import { RentalOwnerSplitDraft } from '../../owner-split/owner-split-calculator.types';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalRepository } from '../../persistence/rental.repository';
import { EditConfirmedRentalCommand } from './edit-confirmed-rental.command';
import { classifyConfirmedRentalEdit } from './confirmed-rental-edit-impact';
import { editConfirmedRentalError, EditConfirmedRentalError } from './edit-confirmed-rental.errors';

export interface EditConfirmedRentalResultValue {
  rentalId: string;
  version: number;
  updatedAt: Date;
}

export type EditConfirmedRentalResult = Result<EditConfirmedRentalResultValue, EditConfirmedRentalError>;

@CommandHandler(EditConfirmedRentalCommand)
export class EditConfirmedRentalHandler implements ICommandHandler<
  EditConfirmedRentalCommand,
  EditConfirmedRentalResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly tenantManagementApi: TenantManagementPublicApi,
    private readonly catalogApi: CatalogPublicApi,
    private readonly pricingApi: PricingPublicApi,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly rentalOwnerSplitCalculator: RentalOwnerSplitCalculator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: EditConfirmedRentalCommand): Promise<EditConfirmedRentalResult> {
    const { tenantId, tenantUserId, rentalId, branchId, period, selectedOffers, fulfillmentMethod } = command.props;
    const context = { useCase: 'EditConfirmedRental', tenantId, tenantUserId, rentalId };
    const rental = await this.rentalRepository.findById(tenantId, rentalId);

    if (!rental) {
      return err(
        editConfirmedRentalError(
          'rental_commitment.rental_not_found',
          `Rental "${rentalId}" was not found.`,
          undefined,
          context,
        ),
      );
    }
    if (rental.status !== RentalStatus.Confirmed) {
      return err(this.toApplicationError(new RentalCannotBeEditedFromStatusError(rental.id, rental.status), context));
    }
    const now = new Date();
    if (now >= rental.period.start) {
      return err(this.toApplicationError(new ConfirmedRentalCannotBeEditedAfterPickupError(rental.id), context));
    }
    if (now >= period.start) {
      return err(
        editConfirmedRentalError(
          'rental_commitment.invalid_rental_period',
          'Rental period cannot start in the past.',
          undefined,
          context,
        ),
      );
    }

    const impact = classifyConfirmedRentalEdit(rental, command.props);
    if (impact === 'NONE') {
      if (rental.version !== command.props.expectedVersion) {
        return err(
          editConfirmedRentalError(
            'rental_commitment.rental_version_conflict',
            `Rental "${rentalId}" was modified by another request.`,
            undefined,
            context,
          ),
        );
      }
      return ok({ rentalId, version: rental.version, updatedAt: rental.updatedAt! });
    }

    if (impact === 'DETAILS') {
      return this.editDetails({ rental, command, context, now });
    }

    const tenantValidation = await this.tenantManagementApi.validateDraftRental({
      tenantId,
      branchId,
      rentalCustomerId: rental.rentalCustomerId,
      period,
      fulfillmentMethod,
    });
    if (tenantValidation.isErr()) return err(this.toApplicationError(tenantValidation.error, context));

    const resolvedCatalogSelections = await this.catalogApi.resolveSelectedRentalOffers({
      tenantId,
      branchId,
      selectedOffers,
    });
    if (resolvedCatalogSelections.isErr())
      return err(this.toApplicationError(resolvedCatalogSelections.error, context));

    const existingSelectionIdByOfferId = new Map(
      rental.selections.map((selection) => [selection.rentalOfferId, selection.id]),
    );
    const selections = resolvedCatalogSelections.value.resolvedOffers.map((offer) => ({
      id: existingSelectionIdByOfferId.get(offer.rentalOfferId) ?? RentalSelectionId.create(),
      rentalOfferId: offer.rentalOfferId,
      rentableItemId: offer.rentableItem.id,
      rentableItemNameSnapshot: offer.rentableItem.name,
      rentableItemKindSnapshot: offer.rentableItem.kind,
      categoryId: offer.rentableItem.categoryId,
      quantity: offer.quantity,
      fulfillmentRequirements: offer.fulfillmentRequirements,
    }));

    const pricingResult = await this.pricingApi.priceConfirmedRental({
      tenantId,
      branchId,
      customerId: rental.rentalCustomerId!,
      rentalPeriod: { start: period.start, end: period.end },
      pricingConfig: tenantValidation.value.pricingConfig,
      selections: selections.map((selection) => ({
        rentalSelectionId: selection.id,
        rentalOfferId: selection.rentalOfferId,
        rentableItemId: selection.rentableItemId,
        rentableItemName: selection.rentableItemNameSnapshot,
        rentableItemKind: selection.rentableItemKindSnapshot,
        categoryId: selection.categoryId,
        quantity: selection.quantity,
      })),
      manualPricingAdjustment: command.props.manualPricingAdjustment
        ? { ...command.props.manualPricingAdjustment, setByTenantUserId: tenantUserId }
        : undefined,
    });
    if (pricingResult.isErr()) return err(this.toApplicationError(pricingResult.error, context));

    const existingDemandLineIdBySelectionAndEquipmentType = new Map(
      rental.demandLines.map((line) => [`${line.rentalSelectionId}:${line.equipmentTypeId}`, line.id]),
    );
    const demandLines = selections.flatMap((selection) =>
      selection.fulfillmentRequirements.map((requirement) => ({
        id:
          existingDemandLineIdBySelectionAndEquipmentType.get(`${selection.id}:${requirement.equipmentTypeId}`) ??
          RentalDemandLineId.create(),
        rentalSelectionId: selection.id,
        equipmentTypeId: requirement.equipmentTypeId as EquipmentTypeId,
        equipmentTypeNameSnapshot: requirement.equipmentTypeName ?? requirement.equipmentTypeId,
        quantity: selection.quantity * requirement.quantityPerItem,
      })),
    );

    try {
      return await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        const accessorySelections = await tx.v2RentalAccessorySelection.findMany({
          where: { tenantId, rentalOrderId: rentalId },
          select: {
            id: true,
            sourceRentalDemandLineId: true,
            equipmentTypeId: true,
            assignments: { select: { assetId: true } },
          },
        });
        const candidateDemandLineIds = new Set(demandLines.map((line) => line.id));
        const affectedAccessorySelectionIds = accessorySelections
          .filter(
            (selection) =>
              selection.sourceRentalDemandLineId !== null &&
              !candidateDemandLineIds.has(selection.sourceRentalDemandLineId as RentalDemandLineId),
          )
          .map((selection) => selection.id);
        if (affectedAccessorySelectionIds.length > 0) {
          return err(
            editConfirmedRentalError(
              'rental_commitment.rental_accessories_require_removal',
              'One or more accessories reference demand lines removed by this edit.',
              undefined,
              { ...context, accessorySelectionIds: affectedAccessorySelectionIds },
            ),
          );
        }

        const retainedAccessoryAssignments = accessorySelections.filter(
          (selection) => selection.assignments.length > 0,
        );
        if (retainedAccessoryAssignments.length > 0) {
          const preferredAccessoryAssetIdsByDemandLineId = new Map(
            retainedAccessoryAssignments.map((selection) => [
              RentalDemandLineId.from(selection.id),
              selection.assignments.map((assignment) => assignment.assetId as AssetId),
            ]),
          );
          const accessoryAllocationPlan = await this.rentalAssetAllocation.planAllocations({
            tenantId,
            branchId,
            periodStart: period.start,
            periodEnd: period.end,
            demandLines: retainedAccessoryAssignments.map((selection) => ({
              rentalDemandLineId: RentalDemandLineId.from(selection.id),
              rentalSelectionId: selection.id as RentalSelectionId,
              equipmentTypeId: selection.equipmentTypeId as EquipmentTypeId,
              quantity: selection.assignments.length,
            })),
            ignoredBlockScope: { rentalId, blockType: V2AssetBlockType.ACCESSORY },
            preferredAssetIdsByDemandLineId: preferredAccessoryAssetIdsByDemandLineId,
            tx,
          });
          const retainedAccessoryAssetIds = new Set(
            retainedAccessoryAssignments.flatMap((selection) =>
              selection.assignments.map((assignment) => assignment.assetId),
            ),
          );
          const allocatedAccessoryAssetIds = new Set(
            accessoryAllocationPlan.isOk()
              ? accessoryAllocationPlan.value.allocations.map((allocation) => allocation.assetId)
              : [],
          );
          if (
            accessoryAllocationPlan.isErr() ||
            retainedAccessoryAssetIds.size !== allocatedAccessoryAssetIds.size ||
            [...retainedAccessoryAssetIds].some((assetId) => !allocatedAccessoryAssetIds.has(assetId as AssetId))
          ) {
            return err(
              editConfirmedRentalError(
                'rental_commitment.rental_accessories_require_removal',
                'One or more assigned accessories cannot be retained for the edited rental.',
                accessoryAllocationPlan.isErr() ? accessoryAllocationPlan.error : undefined,
                { ...context, accessorySelectionIds: retainedAccessoryAssignments.map((selection) => selection.id) },
              ),
            );
          }
        }

        const preferredAssetIdsByDemandLineId = new Map(
          demandLines.map((line) => [
            line.id,
            rental.assignedAssets
              .filter((assignment) => {
                const previousDemandLine = rental.demandLines.find(
                  (existing) => existing.id === assignment.rentalDemandLineId,
                );
                return previousDemandLine?.equipmentTypeId === line.equipmentTypeId;
              })
              .map((assignment) => assignment.assetId),
          ]),
        );
        const allocationPlan = await this.rentalAssetAllocation.planAllocations({
          tenantId,
          branchId,
          periodStart: period.start,
          periodEnd: period.end,
          demandLines: demandLines.map((line) => ({
            rentalDemandLineId: line.id,
            rentalSelectionId: line.rentalSelectionId,
            equipmentTypeId: line.equipmentTypeId,
            quantity: line.quantity,
          })),
          ignoredBlockScope: { rentalId, blockType: V2AssetBlockType.EQUIPMENT },
          preferredAssetIdsByDemandLineId,
          tx,
        });
        if (allocationPlan.isErr()) return err(this.toApplicationError(allocationPlan.error, context));

        const edit = rental.editConfirmed({
          branchId,
          period,
          fulfillmentMethod,
          deliveryDetails: command.props.deliveryDetails,
          notes: command.props.notes,
          insuranceSelected: command.props.insuranceSelected,
          confirmedPriceSnapshot: pricingResult.value,
          selections: selections.map(
            ({ id, rentalOfferId, rentableItemId, rentableItemNameSnapshot, rentableItemKindSnapshot, quantity }) => ({
              id,
              rentalOfferId,
              rentableItemId,
              rentableItemNameSnapshot,
              rentableItemKindSnapshot,
              quantity,
            }),
          ),
          demandLines,
          assignedAssets: allocationPlan.value.allocations.map((allocation) => ({
            rentalDemandLineId: allocation.rentalDemandLineId,
            assetId: allocation.assetId,
          })),
        });
        if (edit.isErr()) return err(this.toApplicationError(edit.error, context));

        const priceSnapshot = getConfirmedPriceSnapshotForOwnerSplits(rental.confirmedPriceSnapshot);
        const assignments = new Map(
          rental.assignedAssets.map((assignment) => [
            this.assignmentKey(assignment.assetId, assignment.rentalDemandLineId),
            assignment,
          ]),
        );
        const { splits }: { splits: RentalOwnerSplitDraft[] } = this.rentalOwnerSplitCalculator.calculate({
          tenantId,
          rentalId,
          currency: priceSnapshot.currency,
          selections: rental.selections.map((selection) => ({ id: selection.id })),
          demandLines: rental.demandLines.map((line) => ({ id: line.id, sourceSelectionId: line.rentalSelectionId })),
          fulfilledAssets: allocationPlan.value.allocations.map((allocation) => {
            const assignment = assignments.get(this.assignmentKey(allocation.assetId, allocation.rentalDemandLineId));
            if (!assignment) {
              throw new Error(
                `Missing assignment for asset "${allocation.assetId}" and demand line "${allocation.rentalDemandLineId}".`,
              );
            }

            return {
              id: assignment.id,
              rentalDemandLineId: allocation.rentalDemandLineId,
              assetId: allocation.assetId,
              ownershipKind: allocation.ownershipKind,
              ownerId: allocation.ownerId ?? null,
              ownerContractSnapshot: allocation.ownerContractSnapshot
                ? {
                    contractId: allocation.ownerContractSnapshot.contractId,
                    basis: allocation.ownerContractSnapshot.basis,
                    ownerShare: String(allocation.ownerContractSnapshot.ownerShare),
                  }
                : null,
            };
          }),
          priceLines: priceSnapshot.lines.map((line) => ({
            rentalSelectionId: line.rentalSelectionId,
            netAmount: line.total,
          })),
        });

        const saved = await this.rentalRepository.save(rental, {
          expectedVersion: command.props.expectedVersion,
          ownerSplits: splits,
          accessoryAssetIds: accessorySelections.flatMap((selection) =>
            selection.assignments.map((assignment) => assignment.assetId as AssetId),
          ),
          tx,
        });
        if (!saved)
          return err(
            editConfirmedRentalError(
              'rental_commitment.rental_version_conflict',
              `Rental "${rentalId}" was modified by another request.`,
              undefined,
              context,
            ),
          );

        integrationEvents.collect(toRentalIntegrationEvents(rental.pullDomainEvents()));
        return ok({ rentalId, version: saved.version, updatedAt: saved.updatedAt });
      });
    } catch (error) {
      if (error instanceof PostgresExclusionViolationError) {
        return err(
          editConfirmedRentalError(
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

  private async editDetails(params: {
    rental: Rental;
    command: EditConfirmedRentalCommand;
    context: Record<string, unknown>;
    now: Date;
  }): Promise<EditConfirmedRentalResult> {
    const { rental, command, context, now } = params;
    const { tenantId, tenantUserId, rentalId, branchId, period, selectedOffers, fulfillmentMethod } = command.props;

    const tenantValidation = await this.tenantManagementApi.validateDraftRental({
      tenantId,
      branchId,
      rentalCustomerId: rental.rentalCustomerId,
      period,
      fulfillmentMethod,
    });
    if (tenantValidation.isErr()) return err(this.toApplicationError(tenantValidation.error, context));

    let confirmedPriceSnapshot: RentalPriceSnapshotV1 | undefined;

    if (command.props.manualPricingAdjustment !== null) {
      const resolvedCatalogSelections = await this.catalogApi.resolveSelectedRentalOffers({
        tenantId,
        branchId,
        selectedOffers,
      });
      if (resolvedCatalogSelections.isErr()) {
        return err(this.toApplicationError(resolvedCatalogSelections.error, context));
      }

      const selectionIdByOfferId = new Map(
        rental.selections.map((selection) => [selection.rentalOfferId, selection.id]),
      );
      const pricingResult = await this.pricingApi.priceConfirmedRental({
        tenantId,
        branchId,
        customerId: rental.rentalCustomerId!,
        rentalPeriod: { start: period.start, end: period.end },
        pricingConfig: tenantValidation.value.pricingConfig,
        selections: resolvedCatalogSelections.value.resolvedOffers.map((offer) => ({
          rentalSelectionId: selectionIdByOfferId.get(offer.rentalOfferId)!,
          rentalOfferId: offer.rentalOfferId,
          rentableItemId: offer.rentableItem.id,
          rentableItemName: offer.rentableItem.name,
          rentableItemKind: offer.rentableItem.kind,
          categoryId: offer.rentableItem.categoryId,
          quantity: offer.quantity,
        })),
        manualPricingAdjustment: {
          ...command.props.manualPricingAdjustment,
          setByTenantUserId: tenantUserId,
        },
      });
      if (pricingResult.isErr()) return err(this.toApplicationError(pricingResult.error, context));
      confirmedPriceSnapshot = pricingResult.value;
    }

    const edit = rental.editConfirmedDetails(
      {
        fulfillmentMethod,
        deliveryDetails: command.props.deliveryDetails,
        notes: command.props.notes,
        insuranceSelected: command.props.insuranceSelected,
        confirmedPriceSnapshot,
      },
      now,
    );
    if (edit.isErr()) return err(this.toApplicationError(edit.error, context));

    return this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      let ownerSplits: RentalOwnerSplitDraft[] | undefined;
      if (confirmedPriceSnapshot) {
        const existingOwnerSplits = await tx.v2RentalOwnerSplit.findMany({
          where: { tenantId, rentalId },
        });
        const ownerSplitByAssignedAssetId = new Map(existingOwnerSplits.map((split) => [split.assignedAssetId, split]));
        const priceSnapshot = getConfirmedPriceSnapshotForOwnerSplits(rental.confirmedPriceSnapshot);
        ownerSplits = this.rentalOwnerSplitCalculator.calculate({
          tenantId,
          rentalId,
          currency: priceSnapshot.currency,
          selections: rental.selections.map((selection) => ({ id: selection.id })),
          demandLines: rental.demandLines.map((line) => ({ id: line.id, sourceSelectionId: line.rentalSelectionId })),
          fulfilledAssets: rental.assignedAssets.map((assignment) => {
            const existingSplit = ownerSplitByAssignedAssetId.get(assignment.id);
            return {
              id: assignment.id,
              rentalDemandLineId: assignment.rentalDemandLineId,
              assetId: assignment.assetId,
              ownershipKind: existingSplit ? ('THIRD_PARTY' as const) : ('TENANT_OWNED' as const),
              ownerId: existingSplit?.ownerId ?? null,
              ownerContractSnapshot: existingSplit
                ? {
                    contractId: existingSplit.contractId,
                    basis: existingSplit.basis as 'NET',
                    ownerShare: String(existingSplit.ownerShare),
                  }
                : null,
            };
          }),
          priceLines: priceSnapshot.lines.map((line) => ({
            rentalSelectionId: line.rentalSelectionId,
            netAmount: line.total,
          })),
        }).splits;
      }

      const saved = await this.rentalRepository.save(rental, {
        persistence: 'DETAILS',
        expectedVersion: command.props.expectedVersion,
        ownerSplits,
        tx,
      });
      if (!saved) {
        return err(
          editConfirmedRentalError(
            'rental_commitment.rental_version_conflict',
            `Rental "${rentalId}" was modified by another request.`,
            undefined,
            context,
          ),
        );
      }

      integrationEvents.collect(toRentalIntegrationEvents(rental.pullDomainEvents()));
      return ok({ rentalId, version: saved.version, updatedAt: saved.updatedAt });
    });
  }

  private assignmentKey(assetId: AssetId, demandLineId: string): string {
    return `${demandLineId}:${assetId}`;
  }

  private toApplicationError(error: unknown, context: Record<string, unknown>): EditConfirmedRentalError {
    if (isDuplicateRentalOfferSelection(error))
      return editConfirmedRentalError('rental_commitment.duplicate_rental_offer_selection', error.message, error, {
        ...context,
        rentalOfferId: error.context?.rentalOfferId,
      });
    if (error instanceof RentalCannotBeEditedFromStatusError)
      return editConfirmedRentalError(
        'rental_commitment.rental_cannot_be_edited_from_status',
        error.message,
        error,
        context,
      );
    if (error instanceof ConfirmedRentalCannotBeEditedAfterPickupError)
      return editConfirmedRentalError(
        'rental_commitment.rental_cannot_be_edited_after_pickup',
        error.message,
        error,
        context,
      );
    if (error instanceof RentalPeriodCannotStartInPastError)
      return editConfirmedRentalError('rental_commitment.invalid_rental_period', error.message, error, context);
    if (error instanceof RentalMustContainSelectionError)
      return editConfirmedRentalError('rental_commitment.rental_requires_selection', error.message, error, context);
    if (error instanceof DuplicateRentalOfferSelectionError)
      return editConfirmedRentalError(
        'rental_commitment.duplicate_rental_offer_selection',
        error.message,
        error,
        context,
      );
    if (error instanceof InsufficientAssetAvailabilityError)
      return editConfirmedRentalError(
        'rental_commitment.insufficient_asset_availability',
        error.message,
        error,
        context,
      );
    if (error instanceof TenantUnavailableForRentalError)
      return editConfirmedRentalError('rental_commitment.tenant_unavailable', error.message, error, context);
    if (error instanceof BranchUnavailableForRentalError)
      return editConfirmedRentalError('rental_commitment.branch_unavailable', error.message, error, context);
    if (error instanceof RentalCustomerUnavailableForRentalError)
      return editConfirmedRentalError('rental_commitment.customer_unavailable', error.message, error, context);
    if (error instanceof UnsupportedBranchFulfillmentMethodError)
      return editConfirmedRentalError(
        'rental_commitment.unsupported_branch_fulfillment_method',
        error.message,
        error,
        context,
      );
    if (error instanceof PickupTimeOutsideBranchScheduleError)
      return editConfirmedRentalError(
        'rental_commitment.pickup_time_outside_branch_schedule',
        error.message,
        error,
        context,
      );
    if (error instanceof ReturnTimeOutsideBranchScheduleError)
      return editConfirmedRentalError(
        'rental_commitment.return_time_outside_branch_schedule',
        error.message,
        error,
        context,
      );
    if (error instanceof RentalInvalidFieldError)
      return editConfirmedRentalError('rental_commitment.invalid_rental_field', error.message, error, {
        ...context,
        field: error.field,
      });
    if (error instanceof InvalidCatalogSelectionQuantityError)
      return editConfirmedRentalError(
        'rental_commitment.invalid_catalog_selection_quantity',
        error.message,
        error,
        context,
      );
    if (isErrorWithCode(error, 'INVALID_PRICING_INPUT'))
      return editConfirmedRentalError('rental_commitment.invalid_pricing_input', error.message, error, context);
    throw error;
  }
}

function isDuplicateRentalOfferSelection(error: unknown): error is ResolveSelectedRentalOffersError {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error.code === 'DuplicateRentalOfferSelection'
  );
}

function isErrorWithCode(error: unknown, code: string): error is Error & { code: string } {
  return error instanceof Error && 'code' in error && error.code === code;
}
