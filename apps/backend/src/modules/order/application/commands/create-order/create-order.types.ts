import Decimal from 'decimal.js';

import {
  BundleInactiveForBookingError,
  BundleNotBookableAtLocationError,
  ProductTypeInactiveForBookingError,
  ProductTypeNotBookableAtLocationError,
} from 'src/modules/catalog/catalog.public-api';
import { CouponNotFoundError, CouponValidationError } from 'src/modules/pricing/pricing.public-api';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import {
  DeliveryNotSupportedForLocationError,
  InvalidBookingLocationError,
  BundleNotFoundError,
  ConflictGroup,
  InvalidPickupSlotError,
  InvalidReturnSlotError,
  NoActiveContractForAssetError,
  OrderMustContainItemsError,
  OrderItemUnavailableError,
  OrderPricingTargetTotalInvalidError,
  ProductTypeNotFoundError,
  UnavailableItem,
} from '../../../domain/errors/order.errors';
import { NewPricingResult } from 'src/modules/pricing/domain/services/new-pricing-calculator.service';

export type ResolvedProductItem = {
  type: 'PRODUCT';
  productTypeId: string;
  quantity: number;
  assetId?: string;
  locationId: string;
  period: DateRange;
  currency: string;
  price: NewPricingResult;
};

export type ResolvedBundleItem = {
  type: 'BUNDLE';
  bundleId: string;
  bundle: {
    id: string;
    name: string;
    components: Array<{
      productTypeId: string;
      productTypeName: string;
      quantity: number;
    }>;
  };
  locationId: string;
  period: DateRange;
  currency: string;
  price: NewPricingResult;
  componentStandalonePrices: Map<string, Decimal>;
};

export type ResolvedItem = ResolvedProductItem | ResolvedBundleItem;

export type DemandUnit = {
  productTypeId: string;
  locationId: string;
  period: DateRange;
  pinnedAssetId?: string;
  provenance: { type: 'PRODUCT'; productTypeId: string } | { type: 'BUNDLE'; bundleId: string };
  resolvedAssetId?: string;
};

export class MissingIdempotencyKeyError extends Error {
  constructor() {
    super('Idempotency-Key header is required for order creation.');
    this.name = 'MissingIdempotencyKeyError';
  }
}

export class InvalidIdempotencyKeyError extends Error {
  constructor() {
    super('Idempotency-Key header must be a valid UUID.');
    this.name = 'InvalidIdempotencyKeyError';
  }
}

export class IdempotencyKeyInProgressError extends Error {
  constructor() {
    super('An order creation request with this idempotency key is already in progress.');
    this.name = 'IdempotencyKeyInProgressError';
  }
}

export class IdempotencyKeyConflictError extends Error {
  constructor() {
    super('Idempotency-Key was already used with a different order creation payload.');
    this.name = 'IdempotencyKeyConflictError';
  }
}

export type CreateOrderError =
  | MissingIdempotencyKeyError
  | InvalidIdempotencyKeyError
  | IdempotencyKeyInProgressError
  | IdempotencyKeyConflictError
  | OrderMustContainItemsError
  | OrderItemUnavailableError
  | InvalidPickupSlotError
  | InvalidReturnSlotError
  | NoActiveContractForAssetError
  | InvalidBookingLocationError
  | DeliveryNotSupportedForLocationError
  | ProductTypeNotFoundError
  | BundleNotFoundError
  | ProductTypeInactiveForBookingError
  | BundleInactiveForBookingError
  | ProductTypeNotBookableAtLocationError
  | BundleNotBookableAtLocationError
  | CouponNotFoundError
  | CouponValidationError
  | OrderPricingTargetTotalInvalidError;

export type ResolveDemandResult = {
  unavailableItems: UnavailableItem[];
  conflictGroups: ConflictGroup[];
};
