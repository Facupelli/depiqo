import { err, ok, Result } from 'neverthrow';

import { AssetBlock } from './asset-block.entity';
import { deriveConfirmedAssetBlockPeriod } from './confirmed-asset-block-period';
import { AssignedAsset } from './assigned-asset.entity';
import { RentalCommitmentError } from './errors/rental-commitment.errors';
import type { AcceptedRentalAssetBuffer } from './rental.aggregate';
import { AcceptedDeliverySnapshot } from './value-objects/accepted-delivery-snapshot.value-object';
import { RentalPeriod } from './value-objects/rental-period.value-object';

interface EndAssignmentParticipationParams {
  assignment: AssignedAsset;
  block: AssetBlock;
  effectiveAt: Date;
  rentalStart: Date;
  acceptedAssetBuffer: AcceptedRentalAssetBuffer;
  acceptedDelivery?: AcceptedDeliverySnapshot;
}

interface EndedAssignmentParticipation {
  assignment: AssignedAsset | null;
  block: AssetBlock | null;
}

export function endAssignmentParticipation(
  params: EndAssignmentParticipationParams,
): Result<EndedAssignmentParticipation, RentalCommitmentError> {
  if (params.effectiveAt <= params.assignment.effectiveFrom) {
    return ok({ assignment: null, block: null });
  }

  const assignment = AssignedAsset.reconstitute({
    id: params.assignment.id,
    tenantId: params.assignment.tenantId,
    rentalId: params.assignment.rentalId,
    rentalDemandLineId: params.assignment.rentalDemandLineId,
    assetId: params.assignment.assetId,
    ownershipSnapshot: params.assignment.ownershipSnapshot,
    effectiveFrom: params.assignment.effectiveFrom,
    effectiveUntil: params.assignment.effectiveUntil,
    createdAt: params.assignment.createdAt,
  });

  const closed = assignment.close(params.effectiveAt);
  if (closed.isErr()) return err(closed.error);

  const participationPeriod = new RentalPeriod(assignment.effectiveFrom, params.effectiveAt);
  const period = deriveConfirmedAssetBlockPeriod({
    participationPeriod,
    acceptedBeforeBufferMinutes: params.acceptedAssetBuffer.beforeBufferMinutes,
    acceptedAfterBufferMinutes: params.acceptedAssetBuffer.afterBufferMinutes,
    acceptedDelivery: params.acceptedDelivery,
    ...(assignment.effectiveFrom > params.rentalStart ? { clampStartAt: assignment.effectiveFrom } : {}),
  });

  return ok({ assignment, block: params.block.resizePeriod(period) });
}
