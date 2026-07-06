import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { CatalogError, CatalogInvalidFieldError } from './errors/catalog.errors';

interface RentableItemRequirementProps {
  tenantId: string;
  rentableItemId: string;
  equipmentTypeId: string;
  quantityPerItem: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateRentableItemRequirementProps {
  id?: string;
  tenantId: string;
  rentableItemId: string;
  equipmentTypeId: string;
  quantityPerItem: number;
}

export interface ReconstituteRentableItemRequirementProps extends RentableItemRequirementProps {
  id: string;
}

export class RentableItemRequirement {
  private constructor(
    public readonly id: string,
    private readonly props: RentableItemRequirementProps,
  ) {}

  static create(props: CreateRentableItemRequirementProps): Result<RentableItemRequirement, CatalogError> {
    const tenantId = props.tenantId?.trim();
    if (!tenantId) {
      return err(new CatalogInvalidFieldError('tenantId', 'tenantId is required'));
    }

    const rentableItemId = props.rentableItemId?.trim();
    if (!rentableItemId) {
      return err(new CatalogInvalidFieldError('rentableItemId', 'rentableItemId is required'));
    }

    const equipmentTypeId = props.equipmentTypeId?.trim();
    if (!equipmentTypeId) {
      return err(new CatalogInvalidFieldError('equipmentTypeId', 'equipmentTypeId is required'));
    }

    if (!Number.isInteger(props.quantityPerItem) || props.quantityPerItem <= 0) {
      return err(new CatalogInvalidFieldError('quantityPerItem', 'quantityPerItem must be a positive integer'));
    }

    return ok(
      new RentableItemRequirement(props.id ?? randomUUID(), {
        tenantId,
        rentableItemId,
        equipmentTypeId,
        quantityPerItem: props.quantityPerItem,
      }),
    );
  }

  static reconstitute(props: ReconstituteRentableItemRequirementProps): RentableItemRequirement {
    return new RentableItemRequirement(props.id, props);
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get rentableItemId(): string {
    return this.props.rentableItemId;
  }
  get equipmentTypeId(): string {
    return this.props.equipmentTypeId;
  }
  get quantityPerItem(): number {
    return this.props.quantityPerItem;
  }
  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }
  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }
}
