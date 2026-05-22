import { randomUUID } from 'crypto';
import { RentalItemKind, TrackingMode } from '@repo/types';
import { Result, err, ok } from 'neverthrow';
import {
  AccessoryProductTypeCannotBePublishedError,
  InvalidProductTypeNameError,
  ProductTypeAlreadyPublishedError,
  ProductTypeCannotBePublishedWithoutPricingTiersError,
  ProductTypeAlreadyRetiredError,
} from '../errors/catalog.errors';

export interface IncludedItem {
  name: string;
  quantity: number;
  notes: string | null;
}

export interface CreateProductTypeProps {
  tenantId: string;
  categoryId: string | null;
  billingUnitId: string;
  name: string;
  imageUrl: string;
  description: string | null;
  kind?: RentalItemKind;
  trackingMode: TrackingMode;
  excludeFromNewArrivals: boolean;
  attributes: Record<string, unknown> | null;
  includedItems: IncludedItem[] | null;
}

export interface ReconstituteProductTypeProps {
  id: string;
  tenantId: string;
  categoryId: string | null;
  billingUnitId: string;
  name: string;
  imageUrl: string;
  description: string | null;
  kind: RentalItemKind;
  trackingMode: TrackingMode;
  excludeFromNewArrivals: boolean;
  attributes: Record<string, unknown>;
  includedItems: unknown[];
  hasPricingTiersConfigured: boolean;
  publishedAt: Date | null;
  retiredAt: Date | null;
}

export class ProductType {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private categoryId: string | null,
    private billingUnitId: string,
    private name: string,
    private imageUrl: string,
    private description: string | null,
    private kind: RentalItemKind,
    private trackingMode: TrackingMode,
    private excludeFromNewArrivals: boolean,
    private attributes: Record<string, unknown>,
    private includedItems: unknown[],
    private hasPricingTiersConfigured: boolean,
    private publishedAt: Date | null,
    private retiredAt: Date | null,
  ) {}

  // --- Factories ---

  static create(props: CreateProductTypeProps): Result<ProductType, InvalidProductTypeNameError> {
    if (!props.name || props.name.trim().length === 0) {
      return err(new InvalidProductTypeNameError());
    }
    return ok(
      new ProductType(
        randomUUID(),
        props.tenantId,
        props.categoryId ?? null,
        props.billingUnitId,
        props.name.trim(),
        props.imageUrl,
        props.description?.trim() ?? null,
        props.kind ?? RentalItemKind.PRIMARY,
        props.trackingMode,
        props.excludeFromNewArrivals,
        props.attributes ?? {},
        props.includedItems ?? [],
        false,
        null, // starts as draft
        null,
      ),
    );
  }

  static reconstitute(props: ReconstituteProductTypeProps): ProductType {
    return new ProductType(
      props.id,
      props.tenantId,
      props.categoryId,
      props.billingUnitId,
      props.name,
      props.imageUrl,
      props.description,
      props.kind,
      props.trackingMode,
      props.excludeFromNewArrivals,
      props.attributes,
      props.includedItems,
      props.hasPricingTiersConfigured,
      props.publishedAt,
      props.retiredAt,
    );
  }

  // --- Queries ---

  get currentDescription(): string | null {
    return this.description;
  }

  get currentCategoryId(): string | null {
    return this.categoryId;
  }

  get currentBillingUnitId(): string {
    return this.billingUnitId;
  }

  get currentName(): string {
    return this.name;
  }

  get currentImageUrl(): string {
    return this.imageUrl;
  }

  get currentTrackingMode(): TrackingMode {
    return this.trackingMode;
  }

  get currentKind(): RentalItemKind {
    return this.kind;
  }

  get isExcludedFromNewArrivals(): boolean {
    return this.excludeFromNewArrivals;
  }

  get currentAttributes(): Record<string, unknown> {
    return this.attributes;
  }

  get currentIncludedItems(): unknown[] {
    return this.includedItems;
  }

  getPublishedAt(): Date | null {
    return this.publishedAt;
  }

  getRetiredAt(): Date | null {
    return this.retiredAt;
  }

  isPublished(): boolean {
    return this.publishedAt !== null;
  }

  isRetired(): boolean {
    return this.retiredAt !== null;
  }

  isAvailableForBooking(): boolean {
    return this.kind === RentalItemKind.PRIMARY && this.isPublished() && !this.isRetired();
  }

  // --- Commands ---

  updateDescription(description: string | null): void {
    this.description = description?.trim() ?? null;
  }

  update(
    props: Partial<Omit<CreateProductTypeProps, 'tenantId'>>,
  ): Result<
    void,
    InvalidProductTypeNameError | ProductTypeAlreadyRetiredError | AccessoryProductTypeCannotBePublishedError
  > {
    if (this.isRetired()) {
      return err(new ProductTypeAlreadyRetiredError());
    }

    if (props.name !== undefined) {
      if (props.name.trim().length === 0) {
        return err(new InvalidProductTypeNameError());
      }

      this.name = props.name.trim();
    }

    if (props.categoryId !== undefined) {
      this.categoryId = props.categoryId ?? null;
    }

    if (props.billingUnitId !== undefined) {
      this.billingUnitId = props.billingUnitId;
    }

    if (props.imageUrl !== undefined) {
      this.imageUrl = props.imageUrl;
    }

    if (props.description !== undefined) {
      this.description = props.description?.trim() ?? null;
    }

    if (props.kind !== undefined) {
      if (props.kind === RentalItemKind.ACCESSORY && this.isPublished()) {
        return err(new AccessoryProductTypeCannotBePublishedError(this.id));
      }

      this.kind = props.kind;
    }

    if (props.trackingMode !== undefined) {
      this.trackingMode = props.trackingMode;
    }

    if (props.excludeFromNewArrivals !== undefined) {
      this.excludeFromNewArrivals = props.excludeFromNewArrivals;
    }

    if (props.attributes !== undefined) {
      this.attributes = props.attributes ?? {};
    }

    if (props.includedItems !== undefined) {
      this.includedItems = props.includedItems ?? [];
    }

    return ok(undefined);
  }

  publish(): Result<
    void,
    | ProductTypeAlreadyRetiredError
    | ProductTypeAlreadyPublishedError
    | AccessoryProductTypeCannotBePublishedError
    | ProductTypeCannotBePublishedWithoutPricingTiersError
  > {
    if (this.isRetired()) {
      return err(new ProductTypeAlreadyRetiredError());
    }
    if (this.isPublished()) {
      return err(new ProductTypeAlreadyPublishedError());
    }
    if (this.kind === RentalItemKind.ACCESSORY) {
      return err(new AccessoryProductTypeCannotBePublishedError(this.id));
    }
    if (!this.hasPricingTiersConfigured) {
      return err(new ProductTypeCannotBePublishedWithoutPricingTiersError(this.id));
    }
    this.publishedAt = new Date();
    return ok(undefined);
  }

  retire(): Result<void, ProductTypeAlreadyRetiredError> {
    if (this.isRetired()) {
      return err(new ProductTypeAlreadyRetiredError());
    }
    this.retiredAt = new Date();
    return ok(undefined);
  }
}
