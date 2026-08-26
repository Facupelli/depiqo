import { AssignedAsset, AssignedAssetId } from '../domain/assigned-asset.entity';
import { RentalDemandLineId } from '../domain/ids/rental-demand-line-id';
import { AssetId } from '../domain/types/rental-commitment-ids';
import { AssignedAssetOwnershipSnapshot } from '../domain/value-objects/assigned-asset-ownership-snapshot.value-object';
import { RentalMapper } from './rental.mapper';

describe('RentalMapper assigned asset persistence', () => {
  it('preserves temporal fields, identity, and createdAt for delete-and-recreate persistence', () => {
    const assignment = AssignedAsset.reconstitute({
      id: 'assignment-1' as AssignedAssetId,
      tenantId: 'tenant-1',
      rentalId: 'rental-1',
      rentalDemandLineId: 'demand-1' as RentalDemandLineId,
      assetId: 'asset-1' as AssetId,
      ownershipSnapshot: AssignedAssetOwnershipSnapshot.create({ kind: 'TENANT_OWNED' })._unsafeUnwrap(),
      effectiveFrom: new Date('2030-01-01T10:00:00.000Z'),
      effectiveUntil: new Date('2030-01-01T11:00:00.000Z'),
      createdAt: new Date('2029-12-01T10:00:00.000Z'),
    });

    expect(RentalMapper.toAssignedAssetCreateData(assignment)).toEqual({
      id: assignment.id,
      tenantId: assignment.tenantId,
      rentalId: assignment.rentalId,
      rentalDemandLineId: assignment.rentalDemandLineId,
      assetId: assignment.assetId,
      ownershipSnapshot: { kind: 'TENANT_OWNED' },
      effectiveFrom: assignment.effectiveFrom,
      effectiveUntil: assignment.effectiveUntil,
      createdAt: assignment.createdAt,
    });
  });
});
