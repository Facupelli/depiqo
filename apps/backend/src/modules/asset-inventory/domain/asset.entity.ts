import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { AggregateRootBase } from 'src/core/domain/aggregate-root.base';

import { AssetCreatedDomainEvent, AssetOwnerContractSnapshotPayload } from './events/asset-created.domain-event';
import { AssetInventoryError, InvalidAssetFieldError } from './errors/asset-inventory.errors';

export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'RETIRED';

interface AssetProps {
  tenantId: string;
  branchId: string;
  equipmentTypeId: string;
  ownerId: string | null;
  serialNumber: string | null;
  notes: string | null;
  status: AssetStatus;
  deletedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateAssetProps {
  id?: string;
  tenantId: string;
  branchId: string;
  equipmentTypeId: string;
  equipmentTypeIsActive: boolean;
  ownerId?: string | null;
  serialNumber?: string | null;
  notes?: string | null;
  ownerContractSnapshot?: AssetOwnerContractSnapshotPayload | null;
}

export interface ReconstituteAssetProps extends AssetProps {
  id: string;
}

export interface UpdateAssetMetadataProps {
  serialNumber?: string | null;
  notes?: string | null;
}

export class Asset extends AggregateRootBase {
  readonly id: string;
  private readonly props: AssetProps;

  private constructor(id: string, props: AssetProps) {
    super();
    this.id = id;
    this.props = props;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get branchId(): string {
    return this.props.branchId;
  }

  get equipmentTypeId(): string {
    return this.props.equipmentTypeId;
  }

  get ownerId(): string | null {
    return this.props.ownerId;
  }

  get serialNumber(): string | null {
    return this.props.serialNumber;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get status(): AssetStatus {
    return this.props.status;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  static create(props: CreateAssetProps): Result<Asset, AssetInventoryError> {
    const normalized = this.normalizeCreateProps(props);
    if (normalized.isErr()) {
      return err(normalized.error);
    }

    const ownerContractSnapshot = normalized.value.ownerId ? (props.ownerContractSnapshot ?? null) : null;
    if (normalized.value.ownerId && !ownerContractSnapshot) {
      return err(new InvalidAssetFieldError('ownerContractSnapshot', 'must be provided for third-party assets'));
    }
    if (normalized.value.ownerId && ownerContractSnapshot?.ownerId !== normalized.value.ownerId) {
      return err(new InvalidAssetFieldError('ownerContractSnapshot.ownerId', 'must match asset ownerId'));
    }

    const asset = new Asset(props.id ?? randomUUID(), {
      ...normalized.value,
      status: 'ACTIVE',
      deletedAt: null,
    });

    asset.recordDomainEvent(
      new AssetCreatedDomainEvent({
        tenantId: asset.tenantId,
        assetId: asset.id,
        branchId: asset.branchId,
        equipmentTypeId: asset.equipmentTypeId,
        equipmentTypeIsActive: props.equipmentTypeIsActive,
        status: asset.status,
        ownerId: asset.ownerId,
        ownerContractSnapshot,
      }),
    );

    return ok(asset);
  }

  static reconstitute(props: ReconstituteAssetProps): Asset {
    return new Asset(props.id, { ...props });
  }

  updateMetadata(props: UpdateAssetMetadataProps): boolean {
    const serialNumber =
      props.serialNumber === undefined ? this.props.serialNumber : normalizeNullableString(props.serialNumber);
    const notes = props.notes === undefined ? this.props.notes : normalizeNullableString(props.notes);

    if (serialNumber === this.props.serialNumber && notes === this.props.notes) {
      return false;
    }

    this.props.serialNumber = serialNumber;
    this.props.notes = notes;
    return true;
  }

  private static normalizeCreateProps(
    props: CreateAssetProps,
  ): Result<Omit<AssetProps, 'status' | 'deletedAt' | 'createdAt' | 'updatedAt'>, AssetInventoryError> {
    const tenantId = props.tenantId.trim();
    if (tenantId.length === 0) {
      return err(new InvalidAssetFieldError('tenantId', 'must not be blank'));
    }

    const branchId = props.branchId.trim();
    if (branchId.length === 0) {
      return err(new InvalidAssetFieldError('branchId', 'must not be blank'));
    }

    const equipmentTypeId = props.equipmentTypeId.trim();
    if (equipmentTypeId.length === 0) {
      return err(new InvalidAssetFieldError('equipmentTypeId', 'must not be blank'));
    }

    return ok({
      tenantId,
      branchId,
      equipmentTypeId,
      ownerId: normalizeNullableString(props.ownerId),
      serialNumber: normalizeNullableString(props.serialNumber),
      notes: normalizeNullableString(props.notes),
    });
  }
}

function normalizeNullableString(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}
