import { AssetBlock } from './asset-block.entity';
import { AssignedAsset, AssignedAssetId } from './assigned-asset.entity';
import { deriveConfirmedRentalPeriodTransition } from './confirmed-rental-period-transition';
import { RentalInvalidFieldError, UnexpectedActiveAssetBlockError } from './errors/rental-commitment.errors';
import { RentalDemandLineId } from './ids/rental-demand-line-id';
import { AssetBlockType } from './rental-status';
import { AssetId, RentalId } from './types/rental-commitment-ids';
import { AssignedAssetOwnershipSnapshot } from './value-objects/assigned-asset-ownership-snapshot.value-object';
import { RentalPeriod } from './value-objects/rental-period.value-object';

const rentalId = 'rental-1' as RentalId;
const currentPeriod = new RentalPeriod(new Date('2030-01-02T10:00:00.000Z'), new Date('2030-01-02T14:00:00.000Z'));
const ownershipSnapshot = AssignedAssetOwnershipSnapshot.create({ kind: 'TENANT_OWNED' })._unsafeUnwrap();

function assignment(effectiveFrom = currentPeriod.start) {
  return AssignedAsset.reconstitute({
    id: 'assignment-1' as AssignedAssetId,
    tenantId: 'tenant-1',
    rentalId,
    rentalDemandLineId: 'demand-1' as RentalDemandLineId,
    assetId: 'asset-1' as AssetId,
    ownershipSnapshot,
    effectiveFrom,
  });
}

function block(assetId: AssetId) {
  return AssetBlock.create({
    tenantId: 'tenant-1',
    rentalId,
    assetId,
    period: currentPeriod,
    blockType: AssetBlockType.Equipment,
  })._unsafeUnwrap();
}

function derive(assignedAssets: AssignedAsset[], assetBlocks: AssetBlock[]) {
  return deriveConfirmedRentalPeriodTransition({
    rentalId,
    currentPeriod,
    requestedPeriod: {
      start: new Date('2030-01-02T11:00:00.000Z'),
      end: new Date('2030-01-02T16:00:00.000Z'),
    },
    operationTime: new Date('2030-01-02T09:00:00.000Z'),
    assignedAssets,
    assetBlocks,
    acceptedAssetBuffer: { beforeBufferMinutes: 0, afterBufferMinutes: 0 },
  });
}

describe('confirmed rental period transition', () => {
  it('fails closed when an active equipment block has no current assignment', () => {
    const result = derive([assignment()], [block('unexpected-asset' as AssetId)]);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedActiveAssetBlockError);
  });

  it('rejects moving a pre-start period when a current assignment does not start at the old rental start', () => {
    const currentAssignment = assignment(new Date('2030-01-02T10:30:00.000Z'));
    const result = derive([currentAssignment], [block(currentAssignment.assetId)]);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(RentalInvalidFieldError);
    expect((result._unsafeUnwrapErr() as RentalInvalidFieldError).field).toBe('assignedAssets');
  });
});
