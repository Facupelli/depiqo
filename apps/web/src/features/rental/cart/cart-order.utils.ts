import type {
  CalculateCartPricesRequest,
  CartPriceLineItem,
  DeliveryRequestDto,
} from "@repo/schemas";
import { FulfillmentMethod } from "@repo/types";
import type { CartItem } from "./cart.types";
import type {
  DeliveryRequestFormState,
  JoinedLineItem,
} from "./cart-order.types";

export function buildCartOrderItemPayload(cartItems: CartItem[]) {
  return cartItems.map((item) =>
    item.type === "PRODUCT"
      ? {
          type: "PRODUCT" as const,
          productTypeId: item.productTypeId,
          quantity: item.quantity,
        }
      : {
          type: "BUNDLE" as const,
          bundleId: item.bundleId,
          quantity: item.quantity,
        },
  );
}

export function buildCartPricePreviewRequest({
  locationId,
  pickupDate,
  returnDate,
  pickupTime,
  returnTime,
  itemPayload,
  insuranceSelected,
  customerId,
  couponCode,
}: {
  locationId: string;
  pickupDate: string;
  returnDate: string;
  pickupTime?: number;
  returnTime?: number;
  itemPayload: ReturnType<typeof buildCartOrderItemPayload>;
  insuranceSelected: boolean;
  customerId?: string;
  couponCode?: string;
}): CalculateCartPricesRequest {
  return {
    currency: "USD",
    locationId,
    pickupDate,
    returnDate,
    pickupTime,
    returnTime,
    items: itemPayload,
    insuranceSelected,
    customerId,
    couponCode: couponCode?.trim() || undefined,
  };
}

export function joinCartLineItems({
  lineItems,
  cartItems,
}: {
  lineItems: CartPriceLineItem[] | undefined;
  cartItems: CartItem[];
}): JoinedLineItem[] | undefined {
  return lineItems?.map((line) => {
    const cartItem = cartItems.find(
      (item) =>
        (item.type === "PRODUCT" && item.productTypeId === line.id) ||
        (item.type === "BUNDLE" && item.bundleId === line.id),
    );

    return { ...line, name: cartItem?.name ?? line.id };
  });
}

export function normalizeDeliveryRequest({
  deliveryRequest,
  fulfillmentMethod,
}: {
  deliveryRequest: DeliveryRequestFormState;
  fulfillmentMethod: FulfillmentMethod;
}): DeliveryRequestDto | null {
  if (fulfillmentMethod !== FulfillmentMethod.DELIVERY) {
    return null;
  }

  return {
    recipientName: deliveryRequest.recipientName.trim(),
    phone: deliveryRequest.phone.trim(),
    addressLine1: deliveryRequest.addressLine1.trim(),
    addressLine2: deliveryRequest.addressLine2.trim() || null,
    city: deliveryRequest.city.trim(),
    stateRegion: deliveryRequest.stateRegion.trim(),
    postalCode: deliveryRequest.postalCode.trim(),
    country: deliveryRequest.country.trim(),
    instructions: deliveryRequest.instructions.trim() || null,
  };
}

export function isDeliveryRequestComplete(
  deliveryRequest: DeliveryRequestDto | null,
) {
  if (!deliveryRequest) {
    return false;
  }

  return Boolean(
    deliveryRequest.recipientName &&
    deliveryRequest.phone &&
    deliveryRequest.addressLine1 &&
    deliveryRequest.city &&
    deliveryRequest.stateRegion &&
    deliveryRequest.postalCode &&
    deliveryRequest.country,
  );
}

