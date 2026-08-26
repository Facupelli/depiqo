import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import { V2AssetBlockType } from 'src/generated/prisma/enums';

import { getEffectiveRentalOperationTime } from '../../application/get-effective-rental-operation-time';
import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import {
  InsufficientAssetAvailabilityError,
  RentalAssignedAssetNotFoundError,
  RentalCannotBeEditedFromStatusError,
  RentalInvalidFieldError,
  RentalPeriodHasEndedError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalStatus } from '../../domain/rental-status';
import { Rental } from '../../domain/rental.aggregate';
import { getConfirmedPriceSnapshotForOwnerSplits } from '../../owner-split/confirmed-price-snapshot-for-owner-splits';
import { RentalOwnerSplitDraft } from '../../owner-split/owner-split-calculator.types';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalRepository } from '../../persistence/rental.repository';
import { ReplaceConfirmedRentalAssetCommand } from './replace-confirmed-rental-asset.command';
import {
  ReplaceConfirmedRentalAssetError,
  replaceConfirmedRentalAssetError,
} from './replace-confirmed-rental-asset.errors';

export interface ReplaceConfirmedRentalAssetResultValue {
  rentalId: string;
  version: number;
  updatedAt: Date;
}

export type ReplaceConfirmedRentalAssetResult = Result<
  ReplaceConfirmedRentalAssetResultValue,
  ReplaceConfirmedRentalAssetError
>;

@CommandHandler(ReplaceConfirmedRentalAssetCommand)
export class ReplaceConfirmedRentalAssetHandler implements ICommandHandler<
  ReplaceConfirmedRentalAssetCommand,
  ReplaceConfirmedRentalAssetResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly rentalOwnerSplitCalculator: RentalOwnerSplitCalculator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: ReplaceConfirmedRentalAssetCommand): Promise<ReplaceConfirmedRentalAssetResult> {
    const { tenantId, tenantUserId, rentalId } = command.props;
    const context = { useCase: 'ReplaceConfirmedRentalAsset', tenantId, tenantUserId, rentalId };
    const rental = await this.rentalRepository.findById(tenantId, rentalId);

    if (!rental) {
      return err(
        replaceConfirmedRentalAssetError(
          'rental_commitment.rental_not_found',
          `Rental "${rentalId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    try {
      return await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        const currentRental = await this.rentalRepository.findById(tenantId, rentalId, tx);
        if (!currentRental) {
          return err(
            replaceConfirmedRentalAssetError(
              'rental_commitment.rental_not_found',
              `Rental "${rentalId}" was not found.`,
              undefined,
              context,
            ),
          );
        }
        if (currentRental.version !== command.props.expectedVersion) {
          return err(
            replaceConfirmedRentalAssetError(
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

        const operationTime = new Date();
        const effectiveAt = getEffectiveRentalOperationTime(operationTime, currentRental.period.start);
        if (effectiveAt >= currentRental.period.end) {
          return err(this.toApplicationError(new RentalPeriodHasEndedError(rentalId), context));
        }

        const currentAssignment = currentRental.currentAssignedAssets.find(
          (assignment) => assignment.assetId === command.props.currentAssignedAssetId,
        );
        if (!currentAssignment) {
          return err(
            this.toApplicationError(
              new RentalAssignedAssetNotFoundError(rentalId, command.props.currentAssignedAssetId),
              context,
            ),
          );
        }
        if (
          currentRental.currentAssignedAssets.some(
            (assignment) => assignment.assetId === command.props.replacementAssetId,
          )
        ) {
          return err(
            replaceConfirmedRentalAssetError(
              'rental_commitment.replacement_asset_unavailable',
              `Replacement asset "${command.props.replacementAssetId}" is already assigned to this rental.`,
              undefined,
              context,
            ),
          );
        }

        const demandLine = currentRental.currentDemandLines.find(
          (line) => line.id === currentAssignment.rentalDemandLineId,
        );
        if (!demandLine) {
          throw new Error(`Assigned asset "${currentAssignment.id}" references an unknown demand line.`);
        }

        const allocationPlan = await this.rentalAssetAllocation.planAllocations({
          tenantId,
          branchId: currentRental.branchId,
          periodStart: effectiveAt,
          periodEnd: currentRental.period.end,
          demandLines: [
            {
              rentalDemandLineId: demandLine.id,
              rentalSelectionId: demandLine.rentalSelectionId,
              equipmentTypeId: demandLine.equipmentTypeId,
              quantity: 1,
            },
          ],
          ignoredBlockScope: { rentalId, blockType: V2AssetBlockType.EQUIPMENT },
          excludeAssetIds: currentRental.currentAssignedAssets.map((assignment) => assignment.assetId),
          preferredAssetIdsByDemandLineId: new Map([[demandLine.id, [command.props.replacementAssetId]]]),
          tx,
        });
        if (allocationPlan.isErr()) return err(this.toApplicationError(allocationPlan.error, context));

        const replacementAllocation = allocationPlan.value.allocations[0];
        if (replacementAllocation.assetId !== command.props.replacementAssetId) {
          return err(
            replaceConfirmedRentalAssetError(
              'rental_commitment.replacement_asset_unavailable',
              `Replacement asset "${command.props.replacementAssetId}" is unavailable for this rental.`,
              undefined,
              context,
            ),
          );
        }

        const replacement = currentRental.replaceConfirmedAssignedAsset({
          currentAssignedAssetId: command.props.currentAssignedAssetId,
          replacementAssetId: command.props.replacementAssetId,
          ownershipSnapshot: replacementAllocation.ownershipSnapshot,
          operationTime,
        });
        if (replacement.isErr()) return err(this.toApplicationError(replacement.error, context));

        const ownerSplits = this.calculateOwnerSplits(currentRental);

        const saved = await this.rentalRepository.save(currentRental, {
          expectedVersion: command.props.expectedVersion,
          ownerSplits,
          tx,
        });
        if (!saved) {
          return err(
            replaceConfirmedRentalAssetError(
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
          replaceConfirmedRentalAssetError(
            'rental_commitment.replacement_asset_unavailable',
            `Replacement asset "${command.props.replacementAssetId}" is no longer available for this rental.`,
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
      selections: rental.currentSelections.map((selection) => ({ id: selection.id })),
      demandLines: rental.currentDemandLines.map((line) => ({
        id: line.id,
        sourceSelectionId: line.rentalSelectionId,
      })),
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

  private toApplicationError(error: unknown, context: Record<string, unknown>): ReplaceConfirmedRentalAssetError {
    if (error instanceof RentalCannotBeEditedFromStatusError) {
      return replaceConfirmedRentalAssetError(
        'rental_commitment.rental_cannot_be_edited_from_status',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalPeriodHasEndedError) {
      return replaceConfirmedRentalAssetError('rental_commitment.rental_period_ended', error.message, error, context);
    }
    if (error instanceof RentalAssignedAssetNotFoundError) {
      return replaceConfirmedRentalAssetError(
        'rental_commitment.rental_asset_assignment_not_found',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof InsufficientAssetAvailabilityError) {
      return replaceConfirmedRentalAssetError(
        'rental_commitment.replacement_asset_unavailable',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalInvalidFieldError) {
      return replaceConfirmedRentalAssetError('rental_commitment.invalid_rental_field', error.message, error, context);
    }
    throw error;
  }
}
