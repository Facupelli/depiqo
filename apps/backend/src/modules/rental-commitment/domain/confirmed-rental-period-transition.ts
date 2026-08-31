import { err, ok, Result } from 'neverthrow';

import type { AcceptedRentalAssetBuffer } from './rental.aggregate';
import { AssetBlock } from './asset-block.entity';
import { deriveAssetBlockPeriod } from './asset-block-period';
import { AssignedAsset } from './assigned-asset.entity';
import {
  ConfirmedRentalRequiresActiveBlocksError,
  RentalCommitmentError,
  RentalInvalidFieldError,
  RentalPeriodCannotStartInPastError,
  RentalPeriodHasEndedError,
  UnexpectedActiveAssetBlockError,
} from './errors/rental-commitment.errors';
import { AssetBlockType } from './rental-status';
import { RentalId } from './types/rental-commitment-ids';
import { RentalPeriod } from './value-objects/rental-period.value-object';

export type ConfirmedRentalPeriodTransition =
  | { changed: false }
  | {
      changed: true;
      period: RentalPeriod;
      assignedAssets: AssignedAsset[];
      assetBlocks: AssetBlock[];
    };

export function deriveConfirmedRentalPeriodTransition(params: {
  rentalId: RentalId;
  currentPeriod: RentalPeriod;
  requestedPeriod: { start: Date; end: Date };
  operationTime: Date;
  assignedAssets: readonly AssignedAsset[];
  assetBlocks: readonly AssetBlock[];
  acceptedAssetBuffer: AcceptedRentalAssetBuffer;
}): Result<ConfirmedRentalPeriodTransition, RentalCommitmentError> {
  const samePeriod =
    params.requestedPeriod.start.getTime() === params.currentPeriod.start.getTime() &&
    params.requestedPeriod.end.getTime() === params.currentPeriod.end.getTime();
  if (samePeriod) return ok({ changed: false });

  if (params.operationTime >= params.currentPeriod.end) {
    return err(new RentalPeriodHasEndedError(params.rentalId));
  }

  const started = params.operationTime >= params.currentPeriod.start;
  if (started && params.requestedPeriod.start.getTime() !== params.currentPeriod.start.getTime()) {
    return err(new RentalInvalidFieldError('start', 'must equal the existing start after the rental has started'));
  }
  if (!started && params.requestedPeriod.start <= params.operationTime) {
    return err(new RentalPeriodCannotStartInPastError());
  }

  let period: RentalPeriod;
  try {
    period = new RentalPeriod(params.requestedPeriod.start, params.requestedPeriod.end);
  } catch {
    return err(new RentalInvalidFieldError('period', 'end must be after start'));
  }
  if (started && period.end <= params.operationTime) {
    return err(new RentalInvalidFieldError('end', 'must be after the operation time'));
  }

  const assignedAssets: AssignedAsset[] = [];
  for (const assignment of params.assignedAssets) {
    if (!assignment.isActive || started) {
      assignedAssets.push(assignment);
      continue;
    }
    if (assignment.effectiveFrom.getTime() !== params.currentPeriod.start.getTime()) {
      return err(
        new RentalInvalidFieldError(
          'assignedAssets',
          'all current assignments must start at the current rental start before moving the period',
        ),
      );
    }
    assignedAssets.push(assignment.moveEffectiveFrom(period.start));
  }

  const assignmentAssetIds = new Set(params.assignedAssets.map((assignment) => assignment.assetId));
  const orphanedActiveBlock = params.assetBlocks.find(
    (block) => block.isActive && block.blockType === AssetBlockType.Equipment && !assignmentAssetIds.has(block.assetId),
  );
  if (orphanedActiveBlock) {
    return err(new UnexpectedActiveAssetBlockError(params.rentalId, orphanedActiveBlock.id));
  }

  const resizedBlockIds = new Set<string>();
  const resizedBlocksById = new Map<string, AssetBlock>();
  for (const assignment of assignedAssets.filter((candidate) => candidate.isActive)) {
    const originalAssignment = params.assignedAssets.find((candidate) => candidate.id === assignment.id)!;
    const currentExpectedPeriod = deriveAssignmentBlockPeriod(
      originalAssignment,
      params.currentPeriod,
      params.acceptedAssetBuffer,
    );
    const block = params.assetBlocks.find(
      (candidate) =>
        !resizedBlockIds.has(candidate.id) &&
        candidate.isActive &&
        candidate.blockType === AssetBlockType.Equipment &&
        candidate.assetId === assignment.assetId &&
        candidate.period.equals(currentExpectedPeriod),
    );
    if (!block) return err(new ConfirmedRentalRequiresActiveBlocksError(params.rentalId, assignment.assetId));

    resizedBlockIds.add(block.id);
    resizedBlocksById.set(
      block.id,
      block.resizePeriod(deriveAssignmentBlockPeriod(assignment, period, params.acceptedAssetBuffer)),
    );
  }

  return ok({
    changed: true,
    period,
    assignedAssets,
    assetBlocks: params.assetBlocks.map((block) => resizedBlocksById.get(block.id) ?? block),
  });
}

function deriveAssignmentBlockPeriod(
  assignment: AssignedAsset,
  rentalPeriod: RentalPeriod,
  acceptedAssetBuffer: AcceptedRentalAssetBuffer,
): RentalPeriod {
  return deriveAssetBlockPeriod({
    participationPeriod: new RentalPeriod(assignment.effectiveFrom, rentalPeriod.end),
    beforeBufferMinutes: acceptedAssetBuffer.beforeBufferMinutes,
    afterBufferMinutes: acceptedAssetBuffer.afterBufferMinutes,
    ...(assignment.effectiveFrom > rentalPeriod.start ? { operationTime: assignment.effectiveFrom } : {}),
  });
}
