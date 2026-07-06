import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { CatalogError, CatalogInvalidFieldError } from './errors/catalog.errors';

interface RentalOfferProps {
  tenantId: string;
  branchId: string;
  rentableItemId: string;
  isVisible: boolean;
  isRentable: boolean;
  deletedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateRentalOfferProps {
  id?: string;
  tenantId: string;
  branchId: string;
  rentableItemId: string;
}

export interface ReconstituteRentalOfferProps extends RentalOfferProps {
  id: string;
}

export class RentalOffer {
  private constructor(
    public readonly id: string,
    private readonly props: RentalOfferProps,
  ) {}

  static create(props: CreateRentalOfferProps): Result<RentalOffer, CatalogError> {
    const tenantId = props.tenantId?.trim();
    if (!tenantId) {
      return err(new CatalogInvalidFieldError('tenantId', 'tenantId is required'));
    }

    const branchId = props.branchId?.trim();
    if (!branchId) {
      return err(new CatalogInvalidFieldError('branchId', 'branchId is required'));
    }

    const rentableItemId = props.rentableItemId?.trim();
    if (!rentableItemId) {
      return err(new CatalogInvalidFieldError('rentableItemId', 'rentableItemId is required'));
    }

    return ok(
      new RentalOffer(props.id ?? randomUUID(), {
        tenantId,
        branchId,
        rentableItemId,
        isVisible: true,
        isRentable: true,
        deletedAt: null,
      }),
    );
  }

  static reconstitute(props: ReconstituteRentalOfferProps): RentalOffer {
    return new RentalOffer(props.id, props);
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get branchId(): string {
    return this.props.branchId;
  }

  get rentableItemId(): string {
    return this.props.rentableItemId;
  }

  get isVisible(): boolean {
    return this.props.isVisible;
  }

  get isRentable(): boolean {
    return this.props.isRentable;
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
}
