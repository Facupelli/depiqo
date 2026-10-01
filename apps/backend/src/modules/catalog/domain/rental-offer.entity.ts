import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { AggregateRootBase } from 'src/core/domain/aggregate-root.base';

import { RentalOfferSettingsChangedDomainEvent } from './events/rental-offer-settings-changed.domain-event';
import { CatalogError, CatalogInvalidFieldError } from './errors/catalog.errors';

interface RentalOfferProps {
  tenantId: string;
  branchId: string;
  rentableItemId: string;
  showInStore: boolean;
  isRentable: boolean;
  firstPublishedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateRentalOfferProps {
  id?: string;
  tenantId: string;
  branchId: string;
  rentableItemId: string;
  showInStore?: boolean;
  isRentable?: boolean;
  firstPublishedAt?: Date | null;
}

export interface ReconstituteRentalOfferProps extends RentalOfferProps {
  id: string;
}

export interface UpdateRentalOfferSettingsProps {
  showInStore?: boolean;
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
        showInStore: props.showInStore ?? false,
        isRentable: props.isRentable ?? false,
        firstPublishedAt: props.firstPublishedAt ?? null,
      }),
    );
  }

  static reconstitute(props: ReconstituteRentalOfferProps): RentalOffer {
    return new RentalOffer(props.id, props);
  }

  updateSettings(input: UpdateRentalOfferSettingsProps): Result<void, CatalogError> {
    const showInStore = input.showInStore ?? this.props.showInStore;
    const isRentable = input.isRentable ?? this.props.isRentable;
    const changed = showInStore !== this.props.showInStore || isRentable !== this.props.isRentable;

    this.props.showInStore = showInStore;
    this.props.isRentable = isRentable;

    if (changed) {
      this.recordDomainEvent(new RentalOfferSettingsChangedDomainEvent(this.id, this.tenantId, showInStore, isRentable));
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

  get showInStore(): boolean {
    return this.props.showInStore;
  }

  get isRentable(): boolean {
    return this.props.isRentable;
  }

  get firstPublishedAt(): Date | null {
    return this.props.firstPublishedAt;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }
}
