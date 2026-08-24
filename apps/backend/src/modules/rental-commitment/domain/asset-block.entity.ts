import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { RentalCommitmentError, RentalInvalidFieldError } from './errors/rental-commitment.errors';
import { AssetBlockType } from './rental-status';
import { AssetId } from './types/rental-commitment-ids';
import { RentalPeriod } from './value-objects/rental-period.value-object';

export type AssetBlockId = string & { readonly __brand: 'AssetBlockId' };

interface AssetBlockProps {
  tenantId: string;
  rentalId: string;
  assetId: AssetId;
  period: RentalPeriod;
  blockType: AssetBlockType;
  createdAt?: Date;
  releasedAt?: Date;
}

export interface CreateAssetBlockProps {
  id?: AssetBlockId;
  tenantId: string;
  rentalId: string;
  assetId: AssetId;
  period: RentalPeriod;
  blockType: AssetBlockType;
  createdAt?: Date;
  releasedAt?: Date;
}

export interface ReconstituteAssetBlockProps extends Omit<CreateAssetBlockProps, 'id'> {
  id: AssetBlockId;
}

export class AssetBlock {
  readonly id: AssetBlockId;
  private props: AssetBlockProps;

  private constructor(id: AssetBlockId, props: AssetBlockProps) {
    this.id = id;
    this.props = props;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get rentalId(): string {
    return this.props.rentalId;
  }

  get assetId(): AssetId {
    return this.props.assetId;
  }

  get period(): RentalPeriod {
    return this.props.period;
  }

  get blockType(): AssetBlockType {
    return this.props.blockType;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt ? new Date(this.props.createdAt) : undefined;
  }

  get releasedAt(): Date | undefined {
    return this.props.releasedAt ? new Date(this.props.releasedAt) : undefined;
  }

  get isActive(): boolean {
    return this.props.releasedAt === undefined;
  }

  static create(props: CreateAssetBlockProps): Result<AssetBlock, RentalCommitmentError> {
    const validation = this.validatePrimitiveFields(props);

    if (validation.isErr()) {
      return err(validation.error);
    }

    return ok(
      new AssetBlock(props.id ?? (randomUUID() as AssetBlockId), {
        tenantId: props.tenantId,
        rentalId: props.rentalId,
        assetId: props.assetId,
        period: props.period,
        blockType: props.blockType,
        createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
        releasedAt: props.releasedAt ? new Date(props.releasedAt) : undefined,
      }),
    );
  }

  static reconstitute(props: ReconstituteAssetBlockProps): AssetBlock {
    return new AssetBlock(props.id, {
      tenantId: props.tenantId,
      rentalId: props.rentalId,
      assetId: props.assetId,
      period: props.period,
      blockType: props.blockType,
      createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
      releasedAt: props.releasedAt ? new Date(props.releasedAt) : undefined,
    });
  }

  resizePeriod(period: RentalPeriod): AssetBlock {
    return AssetBlock.reconstitute({
      id: this.id,
      tenantId: this.tenantId,
      rentalId: this.rentalId,
      assetId: this.assetId,
      period,
      blockType: this.blockType,
      createdAt: this.createdAt,
      releasedAt: this.releasedAt,
    });
  }

  covers(period: RentalPeriod): boolean {
    return this.props.period.equals(period);
  }

  release(releasedAt: Date): Result<void, RentalCommitmentError> {
    if (!this.isActive) {
      return ok(undefined);
    }

    this.props.releasedAt = new Date(releasedAt);

    return ok(undefined);
  }

  truncateAndRelease(releasedAt: Date): Result<void, RentalCommitmentError> {
    if (!this.isActive) {
      return err(new RentalInvalidFieldError('releasedAt', 'cannot truncate an already released asset block'));
    }

    if (!(releasedAt instanceof Date) || Number.isNaN(releasedAt.getTime())) {
      return err(new RentalInvalidFieldError('releasedAt', 'must be a valid timestamp'));
    }

    if (releasedAt <= this.props.period.start || releasedAt >= this.props.period.end) {
      return err(new RentalInvalidFieldError('releasedAt', 'must be within the asset block period'));
    }

    this.props.period = new RentalPeriod(this.props.period.start, releasedAt);
    this.props.releasedAt = new Date(releasedAt);
    return ok(undefined);
  }

  private static validatePrimitiveFields(
    props: Pick<CreateAssetBlockProps, 'tenantId' | 'rentalId' | 'assetId' | 'blockType'>,
  ): Result<void, RentalCommitmentError> {
    for (const [field, value] of [
      ['tenantId', props.tenantId],
      ['rentalId', props.rentalId],
      ['assetId', props.assetId],
    ] as const) {
      if (value.trim().length === 0) {
        return err(new RentalInvalidFieldError(field, 'must not be blank'));
      }
    }

    if (!Object.values(AssetBlockType).includes(props.blockType)) {
      return err(new RentalInvalidFieldError('blockType', 'must be a valid asset block type'));
    }

    return ok(undefined);
  }
}
