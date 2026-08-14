import { err, ok, Result } from 'neverthrow';

import { RentalCommitmentError, RentalInvalidFieldError } from '../errors/rental-commitment.errors';

export enum OwnerContractBasis {
  Gross = 'GROSS',
  Net = 'NET',
}

interface OwnerContractSnapshotProps {
  ownerId: string;
  contractId: string;
  ownerShare: number;
  rentalShare: number;
  basis: OwnerContractBasis;
}

export type CreateOwnerContractSnapshotProps = OwnerContractSnapshotProps;
export type ReconstituteOwnerContractSnapshotProps = OwnerContractSnapshotProps;

export class OwnerContractSnapshot {
  private readonly props: OwnerContractSnapshotProps;

  private constructor(props: OwnerContractSnapshotProps) {
    this.props = props;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }
  get contractId(): string {
    return this.props.contractId;
  }
  get ownerShare(): number {
    return this.props.ownerShare;
  }
  get rentalShare(): number {
    return this.props.rentalShare;
  }
  get basis(): OwnerContractBasis {
    return this.props.basis;
  }

  toJSON(): OwnerContractSnapshotProps {
    return { ...this.props };
  }

  static create(props: CreateOwnerContractSnapshotProps): Result<OwnerContractSnapshot, RentalCommitmentError> {
    for (const [field, value] of [
      ['ownerId', props.ownerId],
      ['contractId', props.contractId],
    ] as const) {
      if (value.trim().length === 0) {
        return err(new RentalInvalidFieldError(field, 'must not be blank'));
      }
    }

    if (!Object.values(OwnerContractBasis).includes(props.basis)) {
      return err(new RentalInvalidFieldError('basis', 'must be a valid owner contract basis'));
    }
    if (!Number.isFinite(props.ownerShare) || props.ownerShare < 0) {
      return err(new RentalInvalidFieldError('ownerShare', 'must be a non-negative number'));
    }
    if (!Number.isFinite(props.rentalShare) || props.rentalShare < 0) {
      return err(new RentalInvalidFieldError('rentalShare', 'must be a non-negative number'));
    }

    return ok(new OwnerContractSnapshot({ ...props }));
  }

  static reconstitute(props: ReconstituteOwnerContractSnapshotProps): OwnerContractSnapshot {
    return new OwnerContractSnapshot({ ...props });
  }
}
