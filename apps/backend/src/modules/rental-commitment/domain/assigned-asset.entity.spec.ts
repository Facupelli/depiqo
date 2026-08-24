import { AssignedAsset, AssignedAssetId } from './assigned-asset.entity';
import { RentalDemandLineId } from './ids/rental-demand-line-id';
import { AssetId } from './types/rental-commitment-ids';
import { AssignedAssetOwnershipSnapshot } from './value-objects/assigned-asset-ownership-snapshot.value-object';
import { OwnerContractBasis } from './value-objects/owner-contract-snapshot.value-object';

describe('AssignedAsset', () => {
  const baseProps = {
    tenantId: 'tenant-1',
    rentalId: 'rental-1',
    rentalDemandLineId: 'demand-1' as RentalDemandLineId,
    assetId: 'asset-1' as AssetId,
    ownershipSnapshot: AssignedAssetOwnershipSnapshot.create({ kind: 'TENANT_OWNED' })._unsafeUnwrap(),
    effectiveFrom: new Date('2026-08-25T10:00:00.000Z'),
  };

  it('creates an open assignment', () => {
    const result = AssignedAsset.create(baseProps);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().isActive).toBe(true);
    expect(result._unsafeUnwrap().effectiveUntil).toBeUndefined();
  });

  it('creates a closed assignment only when effectiveUntil is after effectiveFrom', () => {
    const result = AssignedAsset.create({
      ...baseProps,
      effectiveUntil: new Date('2026-08-25T11:00:00.000Z'),
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().isActive).toBe(false);

    const invalid = AssignedAsset.create({
      ...baseProps,
      effectiveUntil: new Date('2026-08-25T10:00:00.000Z'),
    });
    expect(invalid.isErr()).toBe(true);
  });

  it('rejects invalid temporal timestamps', () => {
    expect(AssignedAsset.create({ ...baseProps, effectiveFrom: new Date(Number.NaN) }).isErr()).toBe(true);
    expect(AssignedAsset.create({ ...baseProps, effectiveUntil: new Date(Number.NaN) }).isErr()).toBe(true);
  });

  it('rejects an invalid third-party ownership share', () => {
    const snapshot = AssignedAssetOwnershipSnapshot.create({
      kind: 'THIRD_PARTY',
      ownerId: 'owner-1',
      contractId: 'contract-1',
      basis: OwnerContractBasis.Net,
      ownerShare: '1.01',
    });

    expect(snapshot.isErr()).toBe(true);
  });

  it('preserves identity, temporal fields, and createdAt during reconstitution', () => {
    const createdAt = new Date('2026-08-20T09:00:00.000Z');
    const effectiveUntil = new Date('2026-08-25T11:00:00.000Z');
    const assignment = AssignedAsset.reconstitute({
      ...baseProps,
      id: 'assignment-1' as AssignedAssetId,
      effectiveUntil,
      createdAt,
    });

    expect(assignment.id).toBe('assignment-1');
    expect(assignment.effectiveFrom).toEqual(baseProps.effectiveFrom);
    expect(assignment.effectiveUntil).toEqual(effectiveUntil);
    expect(assignment.createdAt).toEqual(createdAt);
    expect(assignment.isActive).toBe(false);
  });
});
