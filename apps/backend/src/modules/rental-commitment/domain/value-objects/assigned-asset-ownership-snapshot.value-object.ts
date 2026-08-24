import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { RentalCommitmentError, RentalInvalidFieldError } from '../errors/rental-commitment.errors';
import { OwnerContractBasis } from './owner-contract-snapshot.value-object';

export type AssignedAssetOwnershipSnapshotData =
  | { kind: 'TENANT_OWNED' }
  | {
      kind: 'THIRD_PARTY';
      ownerId: string;
      contractId: string;
      basis: OwnerContractBasis;
      ownerShare: string;
    };

export class AssignedAssetOwnershipSnapshot {
  private constructor(private readonly data: AssignedAssetOwnershipSnapshotData) {}

  get kind(): AssignedAssetOwnershipSnapshotData['kind'] {
    return this.data.kind;
  }

  toJSON(): AssignedAssetOwnershipSnapshotData {
    return { ...this.data };
  }

  static create(
    data: AssignedAssetOwnershipSnapshotData,
  ): Result<AssignedAssetOwnershipSnapshot, RentalCommitmentError> {
    if (data.kind === 'TENANT_OWNED') {
      if (Object.keys(data).some((key) => key !== 'kind')) {
        return err(
          new RentalInvalidFieldError(
            'ownershipSnapshot',
            'tenant-owned snapshot cannot contain owner-contract fields',
          ),
        );
      }
      return ok(new AssignedAssetOwnershipSnapshot({ kind: 'TENANT_OWNED' }));
    }

    if (data.ownerId.trim().length === 0) {
      return err(new RentalInvalidFieldError('ownershipSnapshot.ownerId', 'must not be blank'));
    }
    if (data.contractId.trim().length === 0) {
      return err(new RentalInvalidFieldError('ownershipSnapshot.contractId', 'must not be blank'));
    }
    if (data.basis !== OwnerContractBasis.Net && data.basis !== OwnerContractBasis.Gross) {
      return err(new RentalInvalidFieldError('ownershipSnapshot.basis', 'must be a valid owner contract basis'));
    }

    let ownerShare: Decimal;
    try {
      ownerShare = new Decimal(data.ownerShare);
    } catch {
      return err(new RentalInvalidFieldError('ownershipSnapshot.ownerShare', 'must be a valid decimal'));
    }
    if (!ownerShare.isFinite() || ownerShare.isNegative() || ownerShare.gt(1)) {
      return err(new RentalInvalidFieldError('ownershipSnapshot.ownerShare', 'must be between 0 and 1'));
    }

    return ok(new AssignedAssetOwnershipSnapshot({ ...data, ownerShare: ownerShare.toString() }));
  }

  static reconstitute(data: AssignedAssetOwnershipSnapshotData): AssignedAssetOwnershipSnapshot {
    const result = this.create(data);
    if (result.isErr()) throw result.error;
    return result.value;
  }
}
