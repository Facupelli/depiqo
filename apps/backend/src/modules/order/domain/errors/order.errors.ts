import { DomainError } from 'src/core/exceptions/domain.error';
import { OrderStatus } from '@repo/types';

export class OrderError extends DomainError {}

export class OrderMustContainItemsError extends OrderError {
  constructor() {
    super('An order must contain at least one item.');
  }
}

export class NoActiveContractForAssetError extends OrderError {
  constructor(assetId: string, ownerId: string) {
    super(`Asset "${assetId}" belongs to owner "${ownerId}" but has no active contract.`);
  }
}

export class InvalidPickupSlotError extends OrderError {
  constructor(time: number) {
    super(`Pickup time ${time} is not a valid slot for the selected location and date.`);
  }
}

export class InvalidReturnSlotError extends OrderError {
  constructor(time: number) {
    super(`Return time ${time} is not a valid slot for the selected location and date.`);
  }
}

export class ProductTypeNotFoundError extends OrderError {
  constructor(productTypeId: string) {
    super(`ProductType "${productTypeId}" was not found for order creation.`);
  }
}

export class BundleNotFoundError extends OrderError {
  constructor(bundleId: string) {
    super(`Bundle "${bundleId}" was not found for order creation.`);
  }
}

export class InvalidBookingLocationError extends OrderError {
  constructor(locationId: string) {
    super(`Location "${locationId}" is not valid for customer booking.`);
  }
}

export class DeliveryNotSupportedForLocationError extends OrderError {
  constructor(locationId: string) {
    super(`Location "${locationId}" does not support delivery orders.`);
  }
}

export class OrderNotFoundError extends OrderError {
  constructor(orderId: string) {
    super(`Order "${orderId}" was not found.`);
  }
}

export class OrderSigningAllowedOnlyForConfirmedOrdersError extends OrderError {
  constructor(orderId: string, status: OrderStatus) {
    super(`Order "${orderId}" must be in '${OrderStatus.CONFIRMED}' status to start signing, but is '${status}'.`);
  }
}

export class OrderStatusTransitionNotAllowedError extends OrderError {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot transition order from '${from}' to '${to}'.`);
  }
}

export class OrderPricingAdjustmentNotAllowedError extends OrderError {
  constructor(status: OrderStatus) {
    super(`Cannot adjust pricing for an order in '${status}' status.`);
  }
}

export class OrderDraftEditNotAllowedError extends OrderError {
  constructor(status: OrderStatus) {
    super(`Cannot edit a draft order while it is in '${status}' status.`);
  }
}

export class OrderEditNotAllowedError extends OrderError {
  constructor(status: OrderStatus) {
    super(`Cannot edit an order while it is in '${status}' status.`);
  }
}

export class OrderEditAfterPickupNotAllowedError extends OrderError {
  constructor(orderId: string) {
    super(`Cannot edit order "${orderId}" after pickup has started.`);
  }
}

export class OrderSignedEditNotAllowedError extends OrderError {
  constructor(orderId: string) {
    super(`Cannot edit order "${orderId}" because its rental agreement is already signed.`);
  }
}

export class OrderPricingItemNotFoundError extends OrderError {
  constructor(orderItemId: string) {
    super(`Order item '${orderItemId}' was not found for pricing adjustment.`);
  }
}

export class OrderPricingTargetTotalInvalidError extends OrderError {
  constructor(targetTotal: string) {
    super(`Target total '${targetTotal}' is invalid. It must be greater than zero.`);
  }
}

export class OrderPricingItemFinalPriceInvalidError extends OrderError {
  constructor(orderItemId: string, finalPrice: string) {
    super(
      `Final price '${finalPrice}' for order item '${orderItemId}' is invalid. It must be greater than or equal to zero.`,
    );
  }
}

export class OrderPricingItemsPayloadMismatchError extends OrderError {
  constructor() {
    super('Draft pricing updates must include exactly one final price for each order item.');
  }
}

export class OrderCustomerRequiredForConfirmationError extends OrderError {
  constructor(orderId: string) {
    super(`Order "${orderId}" must be linked to a customer before it can be confirmed.`);
  }
}

export class OrderCancellationBlockedBySettledOwnerSplitsError extends OrderError {
  constructor() {
    super('Cannot cancel an order with settled owner payouts.');
  }
}

export class OrderAccessorySelectionNotAllowedError extends OrderError {
  constructor(status: OrderStatus) {
    super(`Cannot change accessory selections for an order in '${status}' status.`);
  }
}

export class OrderAccessorySelectionItemNotFoundError extends OrderError {
  constructor(orderItemId: string) {
    super(`Order item '${orderItemId}' was not found for accessory selection.`);
  }
}

export class OrderAccessorySelectionRequiresProductItemError extends OrderError {
  constructor(orderItemId: string) {
    super(`Order item '${orderItemId}' must be a product item to have accessory selections.`);
  }
}

export class InvalidOrderItemAccessoryQuantityError extends OrderError {
  constructor() {
    super('Accessory selection quantity must be greater than zero.');
  }
}

export class DuplicateOrderItemAccessoryError extends OrderError {
  constructor(accessoryRentalItemId: string) {
    super(
      `Accessory rental item '${accessoryRentalItemId}' appears more than once in the accessory selection list.`,
    );
  }
}

export class OrderItemAccessoryRentalItemNotFoundError extends OrderError {
  constructor(accessoryRentalItemId: string) {
    super(`Accessory rental item '${accessoryRentalItemId}' was not found.`);
  }
}

export class OrderItemAccessoryMustBeAccessoryError extends OrderError {
  constructor(accessoryRentalItemId: string) {
    super(`Rental item '${accessoryRentalItemId}' must be an accessory to be selected for an order item.`);
  }
}

export class OrderItemAccessoryIncompatibleError extends OrderError {
  constructor(accessoryRentalItemId: string, primaryRentalItemId: string) {
    super(
      `Accessory rental item '${accessoryRentalItemId}' is not compatible with primary rental item '${primaryRentalItemId}'.`,
    );
  }
}

export type UnavailableItem = { type: 'PRODUCT'; productTypeId: string } | { type: 'BUNDLE'; bundleId: string };

export type ConflictGroup = {
  productTypeId: string;
  availableCount: number;
  requestedCount: number;
  affectedItems: UnavailableItem[];
};

export class OrderItemUnavailableError extends OrderError {
  constructor(
    public readonly unavailableItems: UnavailableItem[],
    public readonly conflictGroups: ConflictGroup[] = [],
  ) {
    super('One or more order items are unavailable for the requested period.');
  }
}
