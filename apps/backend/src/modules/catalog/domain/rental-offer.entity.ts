import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { AggregateRootBase } from 'src/core/domain/aggregate-root.base';

import { RentalOfferVisibilityAndRentabilityChangedDomainEvent } from './events/rental-offer-visibility-and-rentability-changed.domain-event';
import { CatalogError, CatalogInvalidFieldError } from './errors/catalog.errors';

interface RentalOfferProps {
  tenantId: string;
  branchId: string;
  rentableItemId: string;
  isVisible: boolean;
  isRentable: boolean;
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

export interface UpdateRentalOfferVisibilityAndRentabilityProps {
  isVisible?: boolean;
  isRentable?: boolean;
}

export class RentalOffer extends AggregateRootBase {
  private constructor(
    public readonly id: string,
    private readonly props: RentalOfferProps,
  ) {
    super();
  }

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
      }),
    );
  }

  static reconstitute(props: ReconstituteRentalOfferProps): RentalOffer {
    return new RentalOffer(props.id, props);
  }

  updateVisibilityAndRentability(input: UpdateRentalOfferVisibilityAndRentabilityProps): Result<void, CatalogError> {
    const isVisible = input.isVisible ?? this.props.isVisible;
    const isRentable = input.isRentable ?? this.props.isRentable;
    const changed = isVisible !== this.props.isVisible || isRentable !== this.props.isRentable;

    this.props.isVisible = isVisible;
    this.props.isRentable = isRentable;

    if (changed) {
      this.recordDomainEvent(
        new RentalOfferVisibilityAndRentabilityChangedDomainEvent(this.id, this.tenantId, isVisible, isRentable),
      );
    }

    return ok(undefined);
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

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }
}
