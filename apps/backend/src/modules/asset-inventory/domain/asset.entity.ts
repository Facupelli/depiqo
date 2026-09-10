import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { AggregateRootBase } from 'src/core/domain/aggregate-root.base';

import { AssetCreatedDomainEvent, AssetOwnerContractSnapshotPayload } from './events/asset-created.domain-event';
import { AssetOwnershipChangedDomainEvent } from './events/asset-ownership-changed.domain-event';
import { AssetStatusChangedDomainEvent } from './events/asset-status-changed.domain-event';
import {
  AssetInventoryError,
  InvalidAssetFieldError,
  InvalidAssetLifecycleTransitionError,
} from './errors/asset-inventory.errors';

export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'RETIRED';

interface AssetProps {
  tenantId: string;
  branchId: string;
  equipmentTypeId: string;
  ownerId: string | null;
  serialNumber: string | null;
  notes: string | null;
  status: AssetStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateAssetProps {
  id?: string;
  tenantId: string;
  branchId: string;
  equipmentTypeId: string;
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

export interface ChangeAssetOwnershipProps {
  ownerId: string | null;
  ownerContractSnapshot: AssetOwnerContractSnapshotPayload | null;
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

  static create(props: CreateAssetProps): Result<Asset, AssetInventoryError> {
    const normalized = this.normalizeCreateProps(props);
    if (normalized.isErr()) {
      return err(normalized.error);
    }

    const ownerContractSnapshot = normalized.value.ownerId ? (props.ownerContractSnapshot ?? null) : null;
    const ownership = validateOwnershipState(normalized.value.ownerId, ownerContractSnapshot);
    if (ownership.isErr()) {
      return err(ownership.error);
    }

    const asset = new Asset(props.id ?? randomUUID(), {
      ...normalized.value,
      status: 'ACTIVE',
    });

    asset.recordDomainEvent(
      new AssetCreatedDomainEvent({
        tenantId: asset.tenantId,
        assetId: asset.id,
        branchId: asset.branchId,
        equipmentTypeId: asset.equipmentTypeId,
        status: asset.status,
        ownerId: asset.ownerId,
        ownerContractSnapshot: ownership.value.ownerContractSnapshot,
      }),
    );

    return ok(asset);
  }

  static reconstitute(props: ReconstituteAssetProps): Asset {
    return new Asset(props.id, { ...props });
  }

  changeOwner(props: ChangeAssetOwnershipProps): Result<boolean, AssetInventoryError> {
    const ownerId = normalizeNullableString(props.ownerId);
    const ownership = validateOwnershipState(ownerId, props.ownerContractSnapshot);
    if (ownership.isErr()) {
      return err(ownership.error);
    }

    if (ownership.value.ownerId === this.props.ownerId) {
      return ok(false);
    }

    this.props.ownerId = ownership.value.ownerId;
    this.recordDomainEvent(
      new AssetOwnershipChangedDomainEvent({
        tenantId: this.tenantId,
        assetId: this.id,
        ownerId: ownership.value.ownerId,
        ownerContractSnapshot: ownership.value.ownerContractSnapshot,
      }),
    );

    return ok(true);
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

  deactivate(): Result<boolean, InvalidAssetLifecycleTransitionError> {
    const currentStatus = this.props.status;

    switch (currentStatus) {
      case 'ACTIVE':
        this.changeStatus('INACTIVE');
        return ok(true);
      case 'INACTIVE':
        return ok(false);
      case 'RETIRED':
        return err(new InvalidAssetLifecycleTransitionError(this.id, currentStatus, 'INACTIVE'));
      default:
        return assertNever(currentStatus);
    }
  }

  reactivate(): Result<boolean, InvalidAssetLifecycleTransitionError> {
    const currentStatus = this.props.status;

    switch (currentStatus) {
      case 'ACTIVE':
        return ok(false);
      case 'INACTIVE':
        this.changeStatus('ACTIVE');
        return ok(true);
      case 'RETIRED':
        return err(new InvalidAssetLifecycleTransitionError(this.id, currentStatus, 'ACTIVE'));
      default:
        return assertNever(currentStatus);
    }
  }

  /**
   * RETIRED is terminal. Retiring an already-retired asset is an idempotent
   * no-op and returns false without recording a domain event.
   */
  retire(): boolean {
    if (this.props.status === 'RETIRED') {
      return false;
    }

    this.changeStatus('RETIRED');
    return true;
  }

  private changeStatus(status: AssetStatus): void {
    const previousStatus = this.props.status;
    this.props.status = status;
    this.recordDomainEvent(
      new AssetStatusChangedDomainEvent({
        tenantId: this.tenantId,
        assetId: this.id,
        previousStatus,
        status,
      }),
    );
  }

  private static normalizeCreateProps(
    props: CreateAssetProps,
  ): Result<Omit<AssetProps, 'status' | 'createdAt' | 'updatedAt'>, AssetInventoryError> {
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

function validateOwnershipState(
  ownerId: string | null,
  ownerContractSnapshot: AssetOwnerContractSnapshotPayload | null,
): Result<ChangeAssetOwnershipProps, AssetInventoryError> {
  if (!ownerId && ownerContractSnapshot) {
    return err(new InvalidAssetFieldError('ownerContractSnapshot', 'must be absent for tenant-owned assets'));
  }
  if (ownerId && !ownerContractSnapshot) {
    return err(new InvalidAssetFieldError('ownerContractSnapshot', 'must be provided for third-party assets'));
  }
  if (ownerId && ownerContractSnapshot?.ownerId !== ownerId) {
    return err(new InvalidAssetFieldError('ownerContractSnapshot.ownerId', 'must match asset ownerId'));
  }

  return ok({ ownerId, ownerContractSnapshot });
}

function normalizeNullableString(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected AssetStatus: ${String(value)}`);
}
