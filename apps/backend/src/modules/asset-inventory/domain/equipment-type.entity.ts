import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { AggregateRootBase } from 'src/core/domain/aggregate-root.base';

import {
  EquipmentTypeDeactivatedIntegrationEvent,
  EquipmentTypeReactivatedIntegrationEvent,
} from '../public-api/events/equipment-type-lifecycle.events';
import { AssetInventoryError, InvalidEquipmentTypeFieldError } from './errors/asset-inventory.errors';

interface EquipmentTypeProps {
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateEquipmentTypeProps {
  id?: string;
  tenantId: string;
  name: string;
  description?: string | null;
}

export interface ReconstituteEquipmentTypeProps extends EquipmentTypeProps {
  id: string;
}

export class EquipmentType extends AggregateRootBase {
  readonly id: string;
  private readonly props: EquipmentTypeProps;

  private constructor(id: string, props: EquipmentTypeProps) {
    super();
    this.id = id;
    this.props = props;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string | null {
    return this.props.description;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }
  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }
  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  static create(props: CreateEquipmentTypeProps): Result<EquipmentType, AssetInventoryError> {
    const normalized = this.normalizeCreateProps(props);
    if (normalized.isErr()) {
      return err(normalized.error);
    }

    return ok(
      new EquipmentType(props.id ?? randomUUID(), {
        ...normalized.value,
        isActive: true,
        deletedAt: null,
      }),
    );
  }

  static reconstitute(props: ReconstituteEquipmentTypeProps): EquipmentType {
    return new EquipmentType(props.id, {
      tenantId: props.tenantId,
      name: props.name,
      description: props.description,
      isActive: props.isActive,
      deletedAt: props.deletedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  updateMetadata(input: { name?: string; description?: string | null }): Result<boolean, AssetInventoryError> {
    const normalized = EquipmentType.normalizeCreateProps({
      tenantId: this.tenantId,
      name: input.name ?? this.name,
      description: input.description === undefined ? this.description : input.description,
    });
    if (normalized.isErr()) return err(normalized.error);

    const changed = normalized.value.name !== this.name || normalized.value.description !== this.description;
    if (changed) {
      this.props.name = normalized.value.name;
      this.props.description = normalized.value.description;
    }
    return ok(changed);
  }

  deactivate(): boolean {
    if (!this.isActive) return false;
    this.props.isActive = false;
    this.recordDomainEvent(new EquipmentTypeDeactivatedIntegrationEvent(this.tenantId, this.id));
    return true;
  }

  reactivate(): boolean {
    if (this.isActive) return false;
    this.props.isActive = true;
    this.recordDomainEvent(new EquipmentTypeReactivatedIntegrationEvent(this.tenantId, this.id));
    return true;
  }

  static normalizeNameForComparison(name: string): string {
    return name.trim().toLocaleLowerCase();
  }

  private static normalizeCreateProps(
    props: CreateEquipmentTypeProps,
  ): Result<Pick<EquipmentTypeProps, 'tenantId' | 'name' | 'description'>, AssetInventoryError> {
    const tenantId = props.tenantId.trim();
    if (tenantId.length === 0) {
      return err(new InvalidEquipmentTypeFieldError('tenantId', 'must not be blank'));
    }

    const name = props.name.trim();
    if (name.length === 0) {
      return err(new InvalidEquipmentTypeFieldError('name', 'must not be blank'));
    }

    const description = props.description?.trim();

    return ok({
      tenantId,
      name,
      description: description && description.length > 0 ? description : null,
    });
  }
}
