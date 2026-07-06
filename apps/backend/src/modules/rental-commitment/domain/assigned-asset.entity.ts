import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { RentalCommitmentError, RentalInvalidFieldError } from './errors/rental-commitment.errors';
import { RentalDemandLineId } from './ids/rental-demand-line-id';
import { AssetId } from './types/rental-commitment-ids';

export type AssignedAssetId = string & {
  readonly __brand: 'AssignedAssetId';
};

interface AssignedAssetProps {
  tenantId: string;
  rentalId: string;
  rentalDemandLineId: RentalDemandLineId;
  assetId: AssetId;
  createdAt?: Date;
}

export interface CreateAssignedAssetProps extends AssignedAssetProps {
  id?: AssignedAssetId;
}

export interface ReconstituteAssignedAssetProps extends AssignedAssetProps {
  id: AssignedAssetId;
}

export class AssignedAsset {
  readonly id: AssignedAssetId;
  private readonly props: AssignedAssetProps;

  private constructor(id: AssignedAssetId, props: AssignedAssetProps) {
    this.id = id;
    this.props = props;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get rentalId(): string {
    return this.props.rentalId;
  }

  get rentalDemandLineId(): RentalDemandLineId {
    return this.props.rentalDemandLineId;
  }

  get assetId(): AssetId {
    return this.props.assetId;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt ? new Date(this.props.createdAt) : undefined;
  }

  static create(props: CreateAssignedAssetProps): Result<AssignedAsset, RentalCommitmentError> {
    const validation = this.validatePrimitiveFields(props);

    if (validation.isErr()) {
      return err(validation.error);
    }

    return ok(
      new AssignedAsset(props.id ?? (randomUUID() as AssignedAssetId), {
        tenantId: props.tenantId,
        rentalId: props.rentalId,
        rentalDemandLineId: props.rentalDemandLineId,
        assetId: props.assetId,
        createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
      }),
    );
  }

  static reconstitute(props: ReconstituteAssignedAssetProps): AssignedAsset {
    return new AssignedAsset(props.id, {
      tenantId: props.tenantId,
      rentalId: props.rentalId,
      rentalDemandLineId: props.rentalDemandLineId,
      assetId: props.assetId,
      createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
    });
  }

  private static validatePrimitiveFields(
    props: Pick<AssignedAssetProps, 'tenantId' | 'rentalId' | 'rentalDemandLineId' | 'assetId'>,
  ): Result<void, RentalCommitmentError> {
    for (const [field, value] of [
      ['tenantId', props.tenantId],
      ['rentalId', props.rentalId],
      ['rentalDemandLineId', props.rentalDemandLineId],
      ['assetId', props.assetId],
    ] as const) {
      if (value.trim().length === 0) {
        return err(new RentalInvalidFieldError(field, 'must not be blank'));
      }
    }

    return ok(undefined);
  }
}
