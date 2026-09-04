import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';

import { getEffectiveRentalOperationTime } from '../../application/get-effective-rental-operation-time';
import { deriveConfirmedAssetBlockPeriod } from '../../domain/confirmed-asset-block-period';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import {
  RentalAssignedAssetNotFoundError,
  RentalCannotBeEditedFromStatusError,
  RentalInvalidFieldError,
  RentalPeriodHasEndedError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalStatus } from '../../domain/rental-status';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { RentalRepository } from '../../persistence/rental.repository';
import {
  GetReplacementAssetCandidatesError,
  getReplacementAssetCandidatesError,
} from './get-replacement-asset-candidates.errors';
import { GetReplacementAssetCandidatesQuery } from './get-replacement-asset-candidates.query';

export interface GetReplacementAssetCandidatesReadModel {
  items: Array<{
    assetId: string;
    serialNumber: string | null;
  }>;
}

export type GetReplacementAssetCandidatesResult = Result<
  GetReplacementAssetCandidatesReadModel,
  GetReplacementAssetCandidatesError
>;

@QueryHandler(GetReplacementAssetCandidatesQuery)
export class GetReplacementAssetCandidatesHandler implements IQueryHandler<
  GetReplacementAssetCandidatesQuery,
  GetReplacementAssetCandidatesResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly assetInventoryDisplayFacts: AssetInventoryDisplayFacts,
  ) {}

  async execute(query: GetReplacementAssetCandidatesQuery): Promise<GetReplacementAssetCandidatesResult> {
    const { tenantId, rentalId, currentAssignedAssetId } = query;
    const context = { useCase: 'GetReplacementAssetCandidates', tenantId, rentalId };
    const rental = await this.rentalRepository.findById(tenantId, rentalId);

    if (!rental) {
      return err(
        getReplacementAssetCandidatesError(
          'rental_commitment.rental_not_found',
          `Rental "${rentalId}" was not found.`,
          undefined,
          context,
        ),
      );
    }
    if (rental.status !== RentalStatus.Confirmed) {
      return err(this.map(new RentalCannotBeEditedFromStatusError(rentalId, rental.status), context));
    }

    const operationTime = new Date();
    const effectiveAt = getEffectiveRentalOperationTime(operationTime, rental.period.start);
    if (effectiveAt >= rental.period.end) {
      return err(this.map(new RentalPeriodHasEndedError(rentalId), context));
    }

    const currentAssignment = rental.currentAssignedAssets.find(
      (assignment) => assignment.assetId === currentAssignedAssetId,
    );
    if (!currentAssignment) {
      return err(this.map(new RentalAssignedAssetNotFoundError(rentalId, currentAssignedAssetId), context));
    }

    const demandLine = rental.currentDemandLines.find((line) => line.id === currentAssignment.rentalDemandLineId);
    if (!demandLine) {
      throw new Error(`Assigned asset "${currentAssignment.id}" references an unknown demand line.`);
    }

    const acceptedAssetBuffer = rental.requireAcceptedAssetBuffer();
    const operationalPeriod = deriveConfirmedAssetBlockPeriod({
      participationPeriod: new RentalPeriod(effectiveAt, rental.period.end),
      acceptedBeforeBufferMinutes: acceptedAssetBuffer.beforeBufferMinutes,
      acceptedAfterBufferMinutes: acceptedAssetBuffer.afterBufferMinutes,
      acceptedDelivery: rental.acceptedDelivery,
      clampStartAt: operationTime,
    });
    const candidates = await this.rentalAssetAllocation.findEligibleAvailableCandidates({
      tenantId,
      branchId: rental.branchId,
      equipmentTypeIds: [demandLine.equipmentTypeId],
      periodStart: operationalPeriod.start,
      periodEnd: operationalPeriod.end,
      excludeAssetIds: rental.currentAssignedAssets.map((assignment) => assignment.assetId),
    });
    if (candidates.isErr()) return err(this.map(candidates.error, context));

    const displayFacts = await this.assetInventoryDisplayFacts.getAssetDisplayFacts({
      tenantId,
      assetIds: candidates.value.map((candidate) => candidate.assetId),
    });
    const serialNumbersByAssetId = new Map(displayFacts.map((fact) => [fact.assetId, fact.serialNumber]));

    return ok({
      items: candidates.value.map((candidate) => ({
        assetId: candidate.assetId,
        serialNumber: serialNumbersByAssetId.get(candidate.assetId) ?? null,
      })),
    });
  }

  private map(error: unknown, context: Record<string, unknown>): GetReplacementAssetCandidatesError {
    if (error instanceof RentalCannotBeEditedFromStatusError) {
      return getReplacementAssetCandidatesError(
        'rental_commitment.rental_cannot_be_edited_from_status',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalPeriodHasEndedError) {
      return getReplacementAssetCandidatesError('rental_commitment.rental_period_ended', error.message, error, context);
    }
    if (error instanceof RentalAssignedAssetNotFoundError) {
      return getReplacementAssetCandidatesError(
        'rental_commitment.rental_asset_assignment_not_found',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalInvalidFieldError) {
      return getReplacementAssetCandidatesError(
        'rental_commitment.invalid_rental_field',
        error.message,
        error,
        context,
      );
    }
    throw error;
  }
}
