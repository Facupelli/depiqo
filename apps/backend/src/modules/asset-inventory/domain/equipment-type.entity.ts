import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { AggregateRootBase } from 'src/core/domain/aggregate-root.base';

import { AssetInventoryError, InvalidEquipmentTypeFieldError } from './errors/asset-inventory.errors';

interface EquipmentTypeProps {
  tenantId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateEquipmentTypeProps {
  id?: string;
  tenantId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
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
  get imageUrl(): string | null {
    return this.props.imageUrl;
  }
  get categoryId(): string | null {
    return this.props.categoryId;
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

    return ok(new EquipmentType(props.id ?? randomUUID(), normalized.value));
  }

  static reconstitute(props: ReconstituteEquipmentTypeProps): EquipmentType {
    return new EquipmentType(props.id, {
      tenantId: props.tenantId,
      name: props.name,
      description: props.description,
      imageUrl: props.imageUrl,
      categoryId: props.categoryId,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  updateMetadata(input: {
    name?: string;
    description?: string | null;
    imageUrl?: string | null;
    categoryId?: string | null;
  }): Result<boolean, AssetInventoryError> {
    const normalized = EquipmentType.normalizeCreateProps({
      tenantId: this.tenantId,
      name: input.name ?? this.name,
      description: input.description === undefined ? this.description : input.description,
      imageUrl: input.imageUrl === undefined ? this.imageUrl : input.imageUrl,
      categoryId: input.categoryId === undefined ? this.categoryId : input.categoryId,
    });
    if (normalized.isErr()) return err(normalized.error);

    const changed =
      normalized.value.name !== this.name ||
      normalized.value.description !== this.description ||
      normalized.value.imageUrl !== this.imageUrl ||
      normalized.value.categoryId !== this.categoryId;
    if (changed) {
      this.props.name = normalized.value.name;
      this.props.description = normalized.value.description;
      this.props.imageUrl = normalized.value.imageUrl;
      this.props.categoryId = normalized.value.categoryId;
    }
    return ok(changed);
  }

  static normalizeNameForComparison(name: string): string {
    return name.trim().toLocaleLowerCase();
  }

  private static normalizeCreateProps(
    props: CreateEquipmentTypeProps,
  ): Result<
    Pick<EquipmentTypeProps, 'tenantId' | 'name' | 'description' | 'imageUrl' | 'categoryId'>,
    AssetInventoryError
  > {
    const tenantId = props.tenantId.trim();
    if (tenantId.length === 0) {
      return err(new InvalidEquipmentTypeFieldError('tenantId', 'must not be blank'));
    }

    const name = props.name.trim();
    if (name.length === 0) {
      return err(new InvalidEquipmentTypeFieldError('name', 'must not be blank'));
    }

    const description = props.description?.trim();
    const imageUrl = props.imageUrl?.trim();
    const categoryId = props.categoryId?.trim() || null;

    return ok({
      tenantId,
      name,
      description: description && description.length > 0 ? description : null,
      imageUrl: imageUrl && imageUrl.length > 0 ? imageUrl : null,
      categoryId,
    });
  }
}
