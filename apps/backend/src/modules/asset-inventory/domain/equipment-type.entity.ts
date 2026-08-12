import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { AggregateRootBase } from 'src/core/domain/aggregate-root.base';

import {
  EquipmentTypeDeactivatedDomainEvent,
  EquipmentTypeReactivatedDomainEvent,
} from './events/equipment-type-lifecycle.domain-events';
import { AssetInventoryError, InvalidEquipmentTypeFieldError } from './errors/asset-inventory.errors';

interface EquipmentTypeProps {
  tenantId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
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
  categoryId?: string | null;
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
  get categoryId(): string | null {
    return this.props.categoryId;
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
        categoryId: props.categoryId?.trim() || null,
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
      categoryId: props.categoryId,
      isActive: props.isActive,
      deletedAt: props.deletedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  updateMetadata(input: { name?: string; description?: string | null; categoryId?: string | null }): Result<boolean, AssetInventoryError> {
    const normalized = EquipmentType.normalizeCreateProps({
      tenantId: this.tenantId,
      name: input.name ?? this.name,
      description: input.description === undefined ? this.description : input.description,
      categoryId: input.categoryId === undefined ? this.categoryId : input.categoryId,
    });
    if (normalized.isErr()) return err(normalized.error);

    const changed = normalized.value.name !== this.name || normalized.value.description !== this.description || normalized.value.categoryId !== this.categoryId;
    if (changed) {
      this.props.name = normalized.value.name;
      this.props.description = normalized.value.description;
      this.props.categoryId = normalized.value.categoryId;
    }
    return ok(changed);
  }

  deactivate(): boolean {
    if (!this.isActive) return false;
    this.props.isActive = false;
    this.recordDomainEvent(new EquipmentTypeDeactivatedDomainEvent(this.tenantId, this.id));
    return true;
  }

  reactivate(): boolean {
    if (this.isActive) return false;
    this.props.isActive = true;
    this.recordDomainEvent(new EquipmentTypeReactivatedDomainEvent(this.tenantId, this.id));
    return true;
  }

  static normalizeNameForComparison(name: string): string {
    return name.trim().toLocaleLowerCase();
  }

  private static normalizeCreateProps(
    props: CreateEquipmentTypeProps,
  ): Result<Pick<EquipmentTypeProps, 'tenantId' | 'name' | 'description' | 'categoryId'>, AssetInventoryError> {
    const tenantId = props.tenantId.trim();
    if (tenantId.length === 0) {
      return err(new InvalidEquipmentTypeFieldError('tenantId', 'must not be blank'));
    }

    const name = props.name.trim();
    if (name.length === 0) {
      return err(new InvalidEquipmentTypeFieldError('name', 'must not be blank'));
    }

    const description = props.description?.trim();
    const categoryId = props.categoryId?.trim() || null;

    return ok({
      tenantId,
      name,
      description: description && description.length > 0 ? description : null,
      categoryId,
    });
  }
}
