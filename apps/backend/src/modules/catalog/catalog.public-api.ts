import { TrackingMode } from '@repo/types';

export class ProductTypeDto {
  constructor(
    public readonly id: string,
    public readonly trackingMode: TrackingMode,
    public readonly retiredAt: Date | null,
    public readonly publishedAt: Date | null,
  ) {}
}

export class ProductTypeOrderMetaDto {
  constructor(
    public readonly id: string,
    public readonly categoryId: string | null,
  ) {}
}

export class ProductTypeBookingEligibilityDto {
  constructor(
    public readonly id: string,
    public readonly categoryId: string | null,
  ) {}
}

export class BundleDto {
  constructor(
    public readonly id: string,
    public readonly retiredAt: Date | null,
    public readonly publishedAt: Date | null,
  ) {}
}

export class BundleOrderMetaComponentDto {
  constructor(
    public readonly productTypeId: string,
    public readonly productTypeName: string,
    public readonly quantity: number,
  ) {}
}

export class BundleOrderMetaDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly components: BundleOrderMetaComponentDto[],
  ) {}
}

export class BundleBookingEligibilityDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly components: BundleOrderMetaComponentDto[],
  ) {}
}

export class ProductTypeInactiveForBookingError extends Error {
  readonly code = 'CATALOG_ITEM_INACTIVE_FOR_BOOKING';

  constructor(productTypeId: string) {
    super(`ProductType "${productTypeId}" is inactive and cannot be booked.`);
  }
}

export class BundleInactiveForBookingError extends Error {
  readonly code = 'CATALOG_ITEM_INACTIVE_FOR_BOOKING';

  constructor(bundleId: string) {
    super(`Bundle "${bundleId}" is inactive and cannot be booked.`);
  }
}

export class ProductTypeNotBookableAtLocationError extends Error {
  readonly code = 'INVALID_BOOKING_CONTEXT';

  constructor(productTypeId: string, locationId: string) {
    super(`ProductType "${productTypeId}" is not bookable at location "${locationId}".`);
  }
}

export class BundleNotBookableAtLocationError extends Error {
  readonly code = 'INVALID_BOOKING_CONTEXT';

  constructor(bundleId: string, locationId: string) {
    super(`Bundle "${bundleId}" is not bookable at location "${locationId}".`);
  }
}

export abstract class CatalogPublicApi {
  abstract getProductType(id: string): Promise<ProductTypeDto | null>;
  abstract getBundle(id: string): Promise<BundleDto | null>;
  abstract getProductTypeBookingEligibility(
    tenantId: string,
    locationId: string,
    id: string,
  ): Promise<ProductTypeBookingEligibilityDto | null>;
  abstract getBundleBookingEligibility(
    tenantId: string,
    locationId: string,
    id: string,
  ): Promise<BundleBookingEligibilityDto | null>;
}
