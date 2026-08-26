import { err, ok, Result } from 'neverthrow';

import { AssetBlock } from './asset-block.entity';
import { AssignedAsset } from './assigned-asset.entity';
import {
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

  const currentAssignmentByAssetId = new Map(
    assignedAssets.filter((assignment) => assignment.isActive).map((assignment) => [assignment.assetId, assignment]),
  );
  const assetBlocks: AssetBlock[] = [];
  for (const block of params.assetBlocks) {
    if (!block.isActive || block.blockType !== AssetBlockType.Equipment) {
      assetBlocks.push(block);
      continue;
    }
    const assignment = currentAssignmentByAssetId.get(block.assetId);
    if (!assignment) return err(new UnexpectedActiveAssetBlockError(params.rentalId, block.id));
    assetBlocks.push(block.resizePeriod(new RentalPeriod(assignment.effectiveFrom, period.end)));
  }

  return ok({ changed: true, period, assignedAssets, assetBlocks });
}
