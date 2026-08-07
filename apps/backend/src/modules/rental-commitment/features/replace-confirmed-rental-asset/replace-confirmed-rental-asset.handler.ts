import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import { V2AssetBlockType } from 'src/generated/prisma/enums';
import { V2ContractsPublicApi } from 'src/modules/contracts/public-api/contracts.public-api';

import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { RentalAssetAllocationPlanLine } from '../../asset-allocation/rental-asset-allocation-policy';
import {
  ConfirmedRentalCannotBeEditedAfterPickupError,
  InsufficientAssetAvailabilityError,
  RentalAssignedAssetNotFoundError,
  RentalCannotBeEditedFromStatusError,
  RentalInvalidFieldError,
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
    private readonly contractsApi: V2ContractsPublicApi,
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

    const contractStatus = await this.contractsApi.getRentalContractStatus({ tenantId, rentalId });
    if (contractStatus === 'GENERATED' || contractStatus === 'SIGNING_REQUESTED' || contractStatus === 'SIGNED') {
      return err(
        replaceConfirmedRentalAssetError(
          'rental_commitment.rental_contract_prevents_editing',
          `Rental "${rentalId}" has a ${contractStatus.toLowerCase()} contract.`,
          undefined,
          { ...context, contractStatus },
        ),
      );
    }

    try {
      return await this.unitOfWork.runInTransaction(async ({ tx }) => {
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
        if (
          !currentRental.updatedAt ||
          currentRental.updatedAt.getTime() !== command.props.expectedUpdatedAt.getTime()
        ) {
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
        if (new Date() >= currentRental.period.start) {
          return err(this.toApplicationError(new ConfirmedRentalCannotBeEditedAfterPickupError(rentalId), context));
        }

        const currentAssignment = currentRental.assignedAssets.find(
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
          currentRental.assignedAssets.some((assignment) => assignment.assetId === command.props.replacementAssetId)
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

        const demandLine = currentRental.demandLines.find((line) => line.id === currentAssignment.rentalDemandLineId);
        if (!demandLine) {
          throw new Error(`Assigned asset "${currentAssignment.id}" references an unknown demand line.`);
        }

        const allocationPlan = await this.rentalAssetAllocation.planAllocations({
          tenantId,
          branchId: currentRental.branchId,
          periodStart: currentRental.period.start,
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

        const replacement = currentRental.replaceConfirmedAssignedAsset(
          command.props.currentAssignedAssetId,
          command.props.replacementAssetId,
        );
        if (replacement.isErr()) return err(this.toApplicationError(replacement.error, context));

        const existingOwnerSplits = await tx.v2RentalOwnerSplit.findMany({ where: { tenantId, rentalId } });
        const ownerSplitByAssignedAssetId = new Map(existingOwnerSplits.map((split) => [split.assignedAssetId, split]));
        const ownerSplits = this.calculateOwnerSplits({
          rental: currentRental,
          replacementAllocation,
          ownerSplitByAssignedAssetId,
        });

        const saved = await this.rentalRepository.save(currentRental, {
          expectedUpdatedAt: command.props.expectedUpdatedAt,
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

        return ok({ rentalId, updatedAt: saved.updatedAt });
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

  private calculateOwnerSplits(params: {
    rental: Rental;
    replacementAllocation: RentalAssetAllocationPlanLine;
    ownerSplitByAssignedAssetId: Map<
      string,
      { ownerId: string; contractId: string; basis: string; ownerShare: unknown }
    >;
  }): RentalOwnerSplitDraft[] {
    const { rental, replacementAllocation, ownerSplitByAssignedAssetId } = params;
    if (!rental) {
      throw new Error('Rental is required to calculate owner splits.');
    }
    const priceSnapshot = getConfirmedPriceSnapshotForOwnerSplits(rental.confirmedPriceSnapshot);

    return this.rentalOwnerSplitCalculator.calculate({
      tenantId: rental.tenantId,
      rentalId: rental.id,
      currency: priceSnapshot.calculated.currency,
      selections: rental.selections.map((selection) => ({ id: selection.id })),
      demandLines: rental.demandLines.map((line) => ({ id: line.id, sourceSelectionId: line.rentalSelectionId })),
      fulfilledAssets: rental.assignedAssets.map((assignment) => {
        if (assignment.assetId === replacementAllocation.assetId) {
          return {
            id: assignment.id,
            rentalDemandLineId: assignment.rentalDemandLineId,
            assetId: assignment.assetId,
            ownershipKind: replacementAllocation.ownershipKind,
            ownerId: replacementAllocation.ownerId ?? null,
            ownerContractSnapshot: replacementAllocation.ownerContractSnapshot
              ? {
                  contractId: replacementAllocation.ownerContractSnapshot.contractId,
                  basis: replacementAllocation.ownerContractSnapshot.basis,
                  ownerShare: String(replacementAllocation.ownerContractSnapshot.ownerShare),
                }
              : null,
          };
        }

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
      priceLines: priceSnapshot.calculated.lines.map((line) => ({
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
    if (error instanceof ConfirmedRentalCannotBeEditedAfterPickupError) {
      return replaceConfirmedRentalAssetError(
        'rental_commitment.rental_cannot_be_edited_after_pickup',
        error.message,
        error,
        context,
      );
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
