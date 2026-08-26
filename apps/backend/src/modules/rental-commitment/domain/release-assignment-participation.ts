import { err, ok, Result } from 'neverthrow';

import { AssetBlock } from './asset-block.entity';
import { AssignedAsset } from './assigned-asset.entity';
import { RentalCommitmentError } from './errors/rental-commitment.errors';

interface ReleaseAssignmentParticipationParams {
  assignment: AssignedAsset;
  block: AssetBlock;
  effectiveAt: Date;
}

interface ReleasedAssignmentParticipation {
  assignment: AssignedAsset | null;
  block: AssetBlock | null;
}

export function releaseAssignmentParticipation(
  params: ReleaseAssignmentParticipationParams,
): Result<ReleasedAssignmentParticipation, RentalCommitmentError> {
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
  const block = AssetBlock.reconstitute({
    id: params.block.id,
    tenantId: params.block.tenantId,
    rentalId: params.block.rentalId,
    assetId: params.block.assetId,
    period: params.block.period,
    blockType: params.block.blockType,
    createdAt: params.block.createdAt,
    releasedAt: params.block.releasedAt,
  });

  const closed = assignment.close(params.effectiveAt);
  if (closed.isErr()) return err(closed.error);

  const released = block.truncateAndRelease(params.effectiveAt);
  if (released.isErr()) return err(released.error);

  return ok({ assignment, block });
}
