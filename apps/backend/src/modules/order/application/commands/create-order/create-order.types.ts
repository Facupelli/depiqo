import Decimal from 'decimal.js';

import {
  BundleInactiveForBookingError,
  BundleNotBookableAtLocationError,
  ProductTypeInactiveForBookingError,
  ProductTypeNotBookableAtLocationError,
} from 'src/modules/catalog/catalog.public-api';
import { CouponNotFoundError, CouponValidationError, PricedLinePriceDto } from 'src/modules/pricing/pricing.public-api';
import {
  IdempotencyKeyConflictError,
  IdempotencyKeyInProgressError,
  InvalidIdempotencyKeyError,
  MissingIdempotencyKeyError,
} from './idempotency/create-order-idempotency.errors';
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

export type ResolvedProductItem = {
  type: 'PRODUCT';
  productTypeId: string;
  quantity: number;
  assetId?: string;
  locationId: string;
  period: DateRange;
  currency: string;
  price: PricedLinePriceDto;
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
  price: PricedLinePriceDto;
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

export type CustomerCreateOrderError = Exclude<
  CreateOrderError,
  NoActiveContractForAssetError | OrderPricingTargetTotalInvalidError
>;

export type ResolveDemandResult = {
  unavailableItems: UnavailableItem[];
  conflictGroups: ConflictGroup[];
};
