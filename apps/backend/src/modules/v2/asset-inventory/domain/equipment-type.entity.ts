import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

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

export class EquipmentType {
  readonly id: string;
  private readonly props: EquipmentTypeProps;

  private constructor(id: string, props: EquipmentTypeProps) {
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
