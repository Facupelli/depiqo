import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { V2AssetBlockType } from 'src/generated/prisma/enums';
import { TenantManagementPublicApi } from 'src/modules/v2/tenant-management/public-api/tenant-management.public-api';

import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import {
  ConfirmedRentalRequiresPriceSnapshotError,
  RentalConfirmationRequiresCustomerError,
} from '../../domain/errors/rental-commitment.errors';
import { FulfillmentMethod } from '../../domain/rental-status';
import { AssetId, EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
import { RentalOwnerSplitDraft } from '../../owner-split/owner-split-calculator.types';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalRepository } from '../../persistence/rental.repository';
import { ConfirmRentalApplicationError, confirmRentalApplicationError } from './confirm-rental-application.error';
import { ConfirmRentalCommand } from './confirm-rental.command';
import { toConfirmRentalApplicationError } from './map-confirm-rental-error';

export type ConfirmRentalResult = Result<void, ConfirmRentalApplicationError>;

interface ConfirmedPriceSnapshotForOwnerSplits {
  calculated: {
    currency: string;
    lines: Array<{
      rentalSelectionId: string;
      total: string;
    }>;
  };
}

@CommandHandler(ConfirmRentalCommand)
export class ConfirmRentalHandler implements ICommandHandler<ConfirmRentalCommand, ConfirmRentalResult> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly tenantManagementApi: TenantManagementPublicApi,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly rentalOwnerSplitCalculator: RentalOwnerSplitCalculator,
  ) {}

  async execute(command: ConfirmRentalCommand): Promise<ConfirmRentalResult> {
    const rental = await this.rentalRepository.findById(command.tenantId, command.rentalId);

    if (!rental) {
      return err(confirmRentalApplicationError('RentalNotFound', `Rental "${command.rentalId}" was not found.`));
    }

    if (!rental.rentalCustomerId) {
      return err(toConfirmRentalApplicationError(new RentalConfirmationRequiresCustomerError(rental.id)));
    }

    const fulfillmentMethod = rental.fulfillmentMethod ?? FulfillmentMethod.Pickup;

    const tenantValidation = await this.tenantManagementApi.validateDraftRental({
      tenantId: rental.tenantId,
      branchId: rental.branchId,
      rentalCustomerId: rental.rentalCustomerId,
      period: rental.period,
      fulfillmentMethod,
    });

    if (tenantValidation.isErr()) {
      return err(toConfirmRentalApplicationError(tenantValidation.error));
    }

    const assetAssignmentPlan = await this.rentalAssetAllocation.planAllocations({
      tenantId: rental.tenantId,
      branchId: rental.branchId,
      periodStart: rental.period.start,
      periodEnd: rental.period.end,
      demandLines: rental.demandLines.map((line) => ({
        rentalDemandLineId: line.id,
        rentalSelectionId: line.rentalSelectionId,
        equipmentTypeId: line.equipmentTypeId as EquipmentTypeId,
        quantity: line.quantity,
      })),
      ignoredBlockScope: {
        rentalId: rental.id,
        blockType: V2AssetBlockType.EQUIPMENT,
      },
    });

    if (assetAssignmentPlan.isErr()) {
      return err(toConfirmRentalApplicationError(assetAssignmentPlan.error));
    }

    const confirmResult = rental.confirm({
      assignedAssets: assetAssignmentPlan.value.allocations.map((allocation) => ({
        rentalDemandLineId: allocation.rentalDemandLineId,
        assetId: allocation.assetId,
      })),
    });

    if (confirmResult.isErr()) {
      return err(toConfirmRentalApplicationError(confirmResult.error));
    }

    const confirmedPriceSnapshot = rental.confirmedPriceSnapshot?.toJSON() as
      | ConfirmedPriceSnapshotForOwnerSplits
      | undefined;

    if (!confirmedPriceSnapshot) {
      return err(toConfirmRentalApplicationError(new ConfirmedRentalRequiresPriceSnapshotError(rental.id)));
    }

    const assignmentsByAssetAndDemandLine = new Map(
      rental.assignedAssets.map((assignment) => [
        this.assignmentKey(assignment.assetId, assignment.rentalDemandLineId),
        assignment,
      ]),
    );

    let splits: RentalOwnerSplitDraft[];
    try {
      ({ splits } = this.rentalOwnerSplitCalculator.calculate({
        tenantId: rental.tenantId,
        rentalId: rental.id,
        currency: confirmedPriceSnapshot.calculated.currency,
        selections: rental.selections.map((selection) => ({ id: selection.id })),
        demandLines: rental.demandLines.map((demandLine) => ({
          id: demandLine.id,
          sourceSelectionId: demandLine.rentalSelectionId,
        })),
        fulfilledAssets: assetAssignmentPlan.value.allocations.map((allocation) => {
          const assignment = assignmentsByAssetAndDemandLine.get(
            this.assignmentKey(allocation.assetId, allocation.rentalDemandLineId),
          );

          return {
            id: assignment?.id ?? allocation.assetId,
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
        priceLines: confirmedPriceSnapshot.calculated.lines.map((line) => ({
          rentalSelectionId: line.rentalSelectionId,
          netAmount: line.total,
        })),
      }));
    } catch (error) {
      return err(toConfirmRentalApplicationError(error));
    }

    // TODO(rental-commitment): close the race between allocation planning and asset block insertion
    // with transaction-level locking or an allocation+save repository method.
    await this.rentalRepository.save(rental, { ownerSplits: splits });

    return ok(undefined);
  }

  private assignmentKey(assetId: AssetId, rentalDemandLineId: string): string {
    return `${rentalDemandLineId}:${assetId}`;
  }
}
